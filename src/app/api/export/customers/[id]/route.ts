import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { deleteWithExportLog } from "@/lib/export/deletion-log";
import { exportDuplicateConflictBody, findExportDuplicate } from "@/lib/export/dedupe";
import { parseInterestedProducts } from "@/lib/export/interested-products";
import { z } from "zod";

async function getCustomerOrError(id: string, tenantId: string, ownerFilter?: { ownerId: string }) {
  const customer = await prisma.exportCustomer.findUnique({
    where: { id, tenantId },
    include: {
      owner: { select: { id: true, name: true } },
      contacts: true,
      activities: { orderBy: { createdAt: "desc" }, take: 50, include: { contact: true, owner: { select: { name: true } } } },
      quotes: { orderBy: { createdAt: "desc" } },
      orders: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!customer) return { customer: null, error: NextResponse.json({ error: "客户不存在" }, { status: 404 }) };
  if (ownerFilter && customer.ownerId !== ownerFilter.ownerId) {
    return { customer: null, error: NextResponse.json({ error: "无权限" }, { status: 403 }) };
  }
  const activityIds = customer.activities.map((item) => item.id);
  const attachments = activityIds.length
    ? await prisma.fileAttachment.findMany({
        where: {
          entityType: "export_activity",
          entityId: { in: activityIds },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const attachmentMap = new Map<string, typeof attachments>();
  for (const item of attachments) {
    const list = attachmentMap.get(item.entityId) ?? [];
    list.push(item);
    attachmentMap.set(item.entityId, list);
  }

  return {
    customer: {
      ...customer,
      activities: customer.activities.map((item) => ({
        ...item,
        attachments: attachmentMap.get(item.id) ?? [],
      })),
    },
    error: null,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { customer, error: err } = await getCustomerOrError(id, ctx!.tenantId, ctx!.ownerFilter);
  if (err) return err;
  return NextResponse.json({ data: customer });
}

const updateSchema = z.object({
  companyName: z.string().min(1).optional(),
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
  lastFollowUpAt: z.string().datetime().optional().nullable(),
  nextFollowUpAt: z.string().datetime().optional().nullable(),
  isWon: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { customer, error: err } = await getCustomerOrError(id, ctx!.tenantId, ctx!.ownerFilter);
  if (err) return err;

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "参数错误" },
        { status: 400 }
      );
    }

    const { interestedProducts, ...rest } = parsed.data;
    const data: Record<string, unknown> = { ...rest };
    if (interestedProducts !== undefined) data.interestedProducts = parseInterestedProducts(interestedProducts);
    if (parsed.data.lastFollowUpAt !== undefined) data.lastFollowUpAt = parsed.data.lastFollowUpAt ? new Date(parsed.data.lastFollowUpAt) : null;
    if (parsed.data.nextFollowUpAt !== undefined) data.nextFollowUpAt = parsed.data.nextFollowUpAt ? new Date(parsed.data.nextFollowUpAt) : null;

    const duplicate = await findExportDuplicate({
      tenantId: ctx!.tenantId,
      companyName: parsed.data.companyName ?? customer.companyName,
      website: parsed.data.website ?? customer.website,
      exclude: { customerId: id },
    });
    if (duplicate) {
      return NextResponse.json(exportDuplicateConflictBody(duplicate), { status: 400 });
    }

    const updated = await prisma.exportCustomer.update({
      where: { id, tenantId: ctx!.tenantId },
      data,
      include: { owner: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("Update customer error:", e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { error: err } = await getCustomerOrError(id, ctx!.tenantId, ctx!.ownerFilter);
  if (err) return err;

  const full = await prisma.exportCustomer.findUnique({
    where: { id, tenantId: ctx!.tenantId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      contacts: true,
      activities: { take: 200 },
      quotes: { include: { items: true } },
      orders: { include: { items: true } },
      tasks: true,
      leads: true,
    },
  });
  if (!full) return NextResponse.json({ error: "客户不存在" }, { status: 404 });

  try {
    await deleteWithExportLog({
      tenantId: ctx!.tenantId,
      entityType: "customer",
      recordId: id,
      summary: `${full.companyName} (${full.customerCode})`,
      snapshot: full,
      deletedById: user!.id,
      deleteFn: (tx) => tx.exportCustomer.delete({ where: { id, tenantId: ctx!.tenantId } }),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Delete customer error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Foreign key") || msg.includes("violates foreign key")) {
      return NextResponse.json(
        { error: "存在关联数据无法删除，请先删除或解除关联的报价/订单等" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
