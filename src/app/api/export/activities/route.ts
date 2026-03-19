import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const { user, ctx, error } = await requireExportSession();
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

  const data = await prisma.exportActivity.findMany({
    where: { customerId, tenantId: ctx!.tenantId },
    orderBy: { createdAt: "desc" },
    include: { contact: true, owner: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ data });
}

const createSchema = z.object({
  customerId: z.string().min(1),
  contactId: z.string().optional().nullable(),
  type: z.string().min(1),
  subject: z.string().optional(),
  content: z.string().optional(),
  customerFeedback: z.string().optional(),
  nextFollowUpAt: z.string().datetime().optional().nullable(),
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

    const customer = await prisma.exportCustomer.findUnique({
      where: { id: parsed.data.customerId, tenantId: ctx!.tenantId },
      include: { contacts: true },
    });
    if (!customer) return NextResponse.json({ error: "客户不存在" }, { status: 404 });
    if (ctx!.ownerFilter && customer.ownerId !== ctx!.ownerFilter.ownerId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const contact = parsed.data.contactId
      ? customer.contacts.find((c) => c.id === parsed.data.contactId)
      : null;

    const activity = await prisma.$transaction(async (tx) => {
      const a = await tx.exportActivity.create({
        data: {
          tenantId: ctx!.tenantId,
          customerId: parsed.data.customerId,
          contactId: parsed.data.contactId ?? undefined,
          type: parsed.data.type,
          subject: parsed.data.subject,
          content: parsed.data.content,
          customerFeedback: parsed.data.customerFeedback,
          customerNameSnapshot: customer.companyName,
          contactNameSnapshot: contact?.name ?? undefined,
          contactEmailSnapshot: contact?.email ?? undefined,
          nextFollowUpAt: parsed.data.nextFollowUpAt ? new Date(parsed.data.nextFollowUpAt) : undefined,
          ownerId: user!.id,
        },
        include: { contact: true, owner: { select: { id: true, name: true } } },
      });
      const customerUpdate: { lastFollowUpAt: Date; nextFollowUpAt?: Date } = {
        lastFollowUpAt: new Date(),
      };
      if (parsed.data.nextFollowUpAt) {
        customerUpdate.nextFollowUpAt = new Date(parsed.data.nextFollowUpAt);
      }
      await tx.exportCustomer.update({
        where: { id: parsed.data.customerId },
        data: customerUpdate,
      });
      return a;
    });
    return NextResponse.json({ data: activity });
  } catch (e) {
    console.error("Create activity error:", e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
