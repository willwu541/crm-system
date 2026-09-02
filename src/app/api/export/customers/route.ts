import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { exportDuplicateConflictBody, findExportDuplicate } from "@/lib/export/dedupe";
import { generateCustomerCode } from "@/lib/export/number-generator";
import { parseInterestedProducts } from "@/lib/export/interested-products";
import {
  buildExportCustomerListWhere,
  collectUniqueEmails,
  collectUniqueWhatsappsFromContacts,
} from "@/lib/export/customer-list-where";
import { withNormalizedCompanyIds, findExportRecordsByKeyword } from "@/lib/export/company-name-search";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(500, Math.max(10, parseInt(searchParams.get("pageSize") ?? "20")));
  const keyword = searchParams.get("keyword")?.trim();
  const status = searchParams.get("status")?.trim();
  const country = searchParams.get("country")?.trim();
  const ownerId = searchParams.get("ownerId")?.trim();
  const filter = searchParams.get("filter")?.trim();
  const channel = searchParams.get("channel")?.trim();
  const sortByRaw = searchParams.get("sortBy") ?? "updatedAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const allowedSort = new Set([
    "createdAt",
    "updatedAt",
    "companyName",
    "status",
    "lastFollowUpAt",
    "nextFollowUpAt",
  ]);
  const sortBy = allowedSort.has(sortByRaw) ? sortByRaw : "updatedAt";

  const where = buildExportCustomerListWhere(
    ctx!,
    await withNormalizedCompanyIds("export_customers", ctx!.tenantId, {
      keyword,
      status,
      country,
      ownerId,
      filter,
      channel,
    }),
  );

  if (searchParams.get("emails") === "1" || searchParams.get("whatsapps") === "1") {
    const field = searchParams.get("whatsapps") === "1" ? "whatsapp" : "email";
    const customers = await prisma.exportCustomer.findMany({
      where,
      orderBy: { companyName: "asc" },
      take: 5000,
      select: {
        contacts: {
          where: { [field]: { not: null } },
          select: { email: true, whatsapp: true },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
      },
    });
    const values =
      field === "whatsapp"
        ? collectUniqueWhatsappsFromContacts(customers.map((c) => c.contacts))
        : collectUniqueEmails(customers.map((c) => c.contacts));
    return NextResponse.json({
      data: values,
      total: values.length,
      customerCount: customers.length,
    });
  }

  const [data, total] = await Promise.all([
    prisma.exportCustomer.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        owner: { select: { id: true, name: true } },
        contacts: {
          take: 5,
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          select: {
            email: true,
            whatsapp: true,
            phone: true,
            linkedin: true,
            facebook: true,
            tiktok: true,
          },
        },
      },
    }),
    prisma.exportCustomer.count({ where }),
  ]);

  const elsewhere =
    keyword && total === 0
      ? await findExportRecordsByKeyword(ctx!.tenantId, keyword)
      : [];

  return NextResponse.json({
    data,
    elsewhere,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

const createSchema = z.object({
  companyName: z.string().min(1),
  customerCode: z.string().optional(),
  website: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  customerType: z.string().optional(),
  industry: z.string().optional(),
  marketPriority: z.string().optional(),
  valueLevel: z.string().optional(),
  interestedProducts: z.union([z.string(), z.array(z.string())]).optional(),
  sourceChannel: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "参数错误" },
        { status: 400 }
      );
    }

    const customerCode = parsed.data.customerCode ?? (await generateCustomerCode(ctx!.tenantId));
    const existing = await prisma.exportCustomer.findUnique({
      where: { tenantId_customerCode: { tenantId: ctx!.tenantId, customerCode } },
    });
    if (existing) {
      return NextResponse.json({ error: "客户编号已存在" }, { status: 400 });
    }

    const duplicate = await findExportDuplicate({
      tenantId: ctx!.tenantId,
      companyName: parsed.data.companyName,
      website: parsed.data.website,
    });
    if (duplicate) {
      return NextResponse.json(exportDuplicateConflictBody(duplicate), { status: 400 });
    }

    const { interestedProducts, ...rest } = parsed.data;
    const customer = await prisma.exportCustomer.create({
      data: {
        ...rest,
        tenantId: ctx!.tenantId,
        customerCode,
        ownerId: user!.id,
        status: parsed.data.status ?? "to_develop",
        interestedProducts: parseInterestedProducts(interestedProducts),
      },
      include: { owner: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ data: customer });
  } catch (e) {
    console.error("Create customer error:", e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
