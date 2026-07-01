import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { getExportDuplicateMessage } from "@/lib/export/dedupe";
import {
  buildExportLeadListWhere,
  collectLeadEmails,
} from "@/lib/export/lead-list-where";
import { prismaErrorToUserMessage } from "@/lib/prisma-user-message";
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
  const since = searchParams.get("since")?.trim();
  const sourceChannel = searchParams.get("sourceChannel")?.trim();
  const sortByRaw = searchParams.get("sortBy") ?? "lastContactAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const allowedSort = new Set([
    "createdAt",
    "updatedAt",
    "companyName",
    "status",
    "priority",
    "lastContactAt",
  ]);
  const sortBy = allowedSort.has(sortByRaw) ? sortByRaw : "lastContactAt";

  const pace = searchParams.get("pace")?.trim();

  const where = buildExportLeadListWhere(ctx!, {
    keyword,
    status,
    country,
    ownerId,
    since,
    pace,
    sourceChannel,
  });

  if (searchParams.get("emails") === "1") {
    const leads = await prisma.exportLead.findMany({
      where,
      orderBy: { companyName: "asc" },
      take: 5000,
      select: { email: true },
    });
    const emails = collectLeadEmails(leads);
    return NextResponse.json({
      data: emails,
      total: emails.length,
      leadCount: leads.length,
    });
  }

  try {
    const [data, total] = await Promise.all([
      prisma.exportLead.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { owner: { select: { id: true, name: true } } },
      }),
      prisma.exportLead.count({ where }),
    ]);

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (e) {
    console.error("List leads error:", e);
    return NextResponse.json(
      {
        error:
          "加载线索失败。若刚更新过代码，请在服务器执行：npx prisma migrate deploy（或 npx prisma db push）使数据库与代码一致。",
      },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  companyName: z.string().min(1),
  website: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  customerType: z.string().optional(),
  sourceChannel: z.string().optional(),
  sourceKeyword: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  linkedin: z.string().optional(),
  facebook: z.string().optional(),
  tiktok: z.string().optional(),
  mainBusiness: z.string().optional(),
  productInterest: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  /** 仅管理员：分配给业务员 */
  ownerId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效或为空，请刷新页面后重试" }, { status: 400 });
  }

  try {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "参数错误" },
        { status: 400 }
      );
    }

    const { ownerId: bodyOwnerId, ...rest } = parsed.data;
    let ownerId = user!.id;
    if (user!.role === "ADMIN" && bodyOwnerId) {
      const assignee = await prisma.user.findFirst({
        where: { id: bodyOwnerId, tenant: "export", tenantId: ctx!.tenantId },
        select: { id: true },
      });
      if (assignee) ownerId = assignee.id;
    }

    const duplicateMessage = await getExportDuplicateMessage({
      tenantId: ctx!.tenantId,
      companyName: parsed.data.companyName,
      website: parsed.data.website,
      email: parsed.data.email,
      phone: parsed.data.phone ?? parsed.data.whatsapp,
    });
    if (duplicateMessage) {
      return NextResponse.json({ error: duplicateMessage }, { status: 400 });
    }

    const lead = await prisma.exportLead.create({
      data: {
        ...rest,
        tenantId: ctx!.tenantId,
        ownerId,
        status: parsed.data.status ?? "new",
      },
      include: { owner: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ data: lead });
  } catch (e) {
    console.error("Create lead error:", e);
    const msg = prismaErrorToUserMessage(e, "创建线索失败，请稍后重试或联系管理员。");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
