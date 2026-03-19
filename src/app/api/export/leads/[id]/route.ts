import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { parseInterestedProducts } from "@/lib/export/interested-products";
import { z } from "zod";

async function getLeadOrError(id: string, tenantId: string, ownerFilter?: { ownerId: string }) {
  const lead = await prisma.exportLead.findUnique({
    where: { id, tenantId },
    include: { owner: { select: { id: true, name: true } }, customer: true },
  });
  if (!lead) return { lead: null, error: NextResponse.json({ error: "线索不存在" }, { status: 404 }) };
  if (ownerFilter && lead.ownerId !== ownerFilter.ownerId) {
    return { lead: null, error: NextResponse.json({ error: "无权限" }, { status: 403 }) };
  }
  return { lead, error: null };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { lead, error: err } = await getLeadOrError(id, ctx!.tenantId, ctx!.ownerFilter);
  if (err) return err;
  return NextResponse.json({ data: lead });
}

const updateSchema = z.object({
  companyName: z.string().min(1).optional(),
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
  mainBusiness: z.string().optional(),
  interestedProducts: z.union([z.string(), z.array(z.string())]).optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { lead, error: err } = await getLeadOrError(id, ctx!.tenantId, ctx!.ownerFilter);
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
    const updated = await prisma.exportLead.update({
      where: { id, tenantId: ctx!.tenantId },
      data: {
        ...rest,
        ...(interestedProducts !== undefined && { interestedProducts: parseInterestedProducts(interestedProducts) }),
      },
      include: { owner: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("Update lead error:", e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { error: err } = await getLeadOrError(id, ctx!.tenantId, ctx!.ownerFilter);
  if (err) return err;

  await prisma.exportLead.delete({ where: { id, tenantId: ctx!.tenantId } });
  return NextResponse.json({ ok: true });
}
