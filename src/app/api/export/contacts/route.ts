import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId")?.trim();
  if (!customerId) {
    return NextResponse.json({ error: "缺少 customerId" }, { status: 400 });
  }

  const customer = await prisma.exportCustomer.findUnique({
    where: { id: customerId, tenantId: ctx!.tenantId },
  });
  if (!customer) return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  if (ctx!.ownerFilter && customer.ownerId !== ctx!.ownerFilter.ownerId) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const data = await prisma.exportContact.findMany({
    where: { customerId, tenantId: ctx!.tenantId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ data });
}

const createSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1),
  title: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  linkedin: z.string().optional(),
  language: z.string().optional(),
  isPrimary: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { ctx, error } = await requireExportSession();
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

    const customer = await prisma.exportCustomer.findUnique({
      where: { id: parsed.data.customerId, tenantId: ctx!.tenantId },
    });
    if (!customer) return NextResponse.json({ error: "客户不存在" }, { status: 404 });
    if (ctx!.ownerFilter && customer.ownerId !== ctx!.ownerFilter.ownerId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    if (parsed.data.isPrimary) {
      await prisma.exportContact.updateMany({
        where: { customerId: parsed.data.customerId, tenantId: ctx!.tenantId },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.exportContact.create({
      data: {
        ...parsed.data,
        tenantId: ctx!.tenantId,
        isPrimary: parsed.data.isPrimary ?? false,
      },
    });
    return NextResponse.json({ data: contact });
  } catch (e) {
    console.error("Create contact error:", e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
