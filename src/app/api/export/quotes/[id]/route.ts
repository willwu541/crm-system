import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { z } from "zod";

async function getQuoteOrError(id: string, tenantId: string, ownerFilter?: { ownerId: string }) {
  const quote = await prisma.exportQuote.findUnique({
    where: { id, tenantId },
    include: {
      customer: true,
      contact: true,
      orders: true,
      items: true,
    },
  });
  if (!quote) return { quote: null, error: NextResponse.json({ error: "报价不存在" }, { status: 404 }) };
  if (ownerFilter && quote.customer.ownerId !== ownerFilter.ownerId) {
    return { quote: null, error: NextResponse.json({ error: "无权限" }, { status: 403 }) };
  }
  return { quote, error: null };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { quote, error: err } = await getQuoteOrError(id, ctx!.tenantId, ctx!.ownerFilter);
  if (err) return err;
  return NextResponse.json({ data: quote });
}

const updateSchema = z.object({
  contactId: z.string().optional().nullable(),
  quoteDate: z.string().optional(),
  currency: z.string().optional(),
  incoterm: z.string().optional(),
  validityDate: z.string().optional().nullable(),
  productSummary: z.string().optional(),
  totalAmount: z.union([z.number(), z.string()]).optional().nullable(),
  status: z.string().optional(),
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
  const { quote, error: err } = await getQuoteOrError(id, ctx!.tenantId, ctx!.ownerFilter);
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

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.quoteDate) data.quoteDate = new Date(parsed.data.quoteDate);
    if (parsed.data.validityDate !== undefined) data.validityDate = parsed.data.validityDate ? new Date(parsed.data.validityDate) : null;
    if (parsed.data.totalAmount !== undefined) data.totalAmount = parsed.data.totalAmount != null ? Number(parsed.data.totalAmount) : null;

    const updated = await prisma.exportQuote.update({
      where: { id, tenantId: ctx!.tenantId },
      data,
      include: {
        customer: { select: { id: true, companyName: true, customerCode: true } },
        contact: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("Update quote error:", e);
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
  const { error: err } = await getQuoteOrError(id, ctx!.tenantId, ctx!.ownerFilter);
  if (err) return err;

  await prisma.exportQuote.delete({ where: { id, tenantId: ctx!.tenantId } });
  return NextResponse.json({ ok: true });
}
