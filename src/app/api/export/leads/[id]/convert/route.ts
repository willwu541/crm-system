import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { canStartUsingExportLead, EXPORT_OWNED_BY_OTHER } from "@/lib/export/lead-pool";
import { ExportLeadTakeError, assertLeadTaken, takeExportLeadFromPool } from "@/lib/export/take-lead";
import { generateCustomerCode } from "@/lib/export/number-generator";
import { z } from "zod";

const convertSchema = z.object({
  customerStatus: z.string().optional(),
  nextFollowUpAt: z.string().datetime().optional().nullable(),
  createTaskTitle: z.string().optional(),
  createTaskDueAt: z.string().datetime().optional().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id: leadId } = await params;
  let payload: z.infer<typeof convertSchema> = {};
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = convertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "参数错误" },
        { status: 400 },
      );
    }
    payload = parsed.data;
  } catch {
    payload = {};
  }

  const lead = await prisma.exportLead.findUnique({
    where: { id: leadId, tenantId: ctx!.tenantId },
    include: { owner: true },
  });
  if (!lead) return NextResponse.json({ error: "线索不存在" }, { status: 404 });
  if (!canStartUsingExportLead(user!, lead.ownerId)) {
    return NextResponse.json(
      { error: lead.ownerId ? EXPORT_OWNED_BY_OTHER : "请先认领这条线索，再转成客户" },
      { status: 403 },
    );
  }
  if (lead.convertedToCustomerId) {
    return NextResponse.json({ error: "该线索已转化", customerId: lead.convertedToCustomerId });
  }

  const customerCode = await generateCustomerCode(ctx!.tenantId);
  try {
  const customer = await prisma.$transaction(async (tx) => {
    const taken = await takeExportLeadFromPool(tx, {
      tenantId: ctx!.tenantId,
      leadId,
      user: user!,
    });
    assertLeadTaken(taken);
    const owned = await tx.exportLead.findUnique({
      where: { id: leadId },
      select: { ownerId: true },
    });
    const ownerId = owned?.ownerId ?? user!.id;
    const c = await tx.exportCustomer.create({
      data: {
        tenantId: ctx!.tenantId,
        customerCode,
        companyName: lead.companyName,
        website: lead.website,
        country: lead.country,
        city: lead.city,
        address: lead.address,
        customerType: lead.customerType,
        interestedProducts: lead.productInterest
          ? lead.productInterest
              .split(/[,，]/)
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        sourceChannel: lead.sourceChannel,
        ownerId,
        status: payload.customerStatus ?? "to_develop",
        fitEvidence: lead.fitEvidence,
        lastOutcome: lead.lastOutcome,
        lastFollowUpAt: lead.lastContactAt ?? undefined,
        nextFollowUpAt: payload.nextFollowUpAt
          ? new Date(payload.nextFollowUpAt)
          : (lead.nextFollowUpAt ?? undefined),
      },
      include: { owner: { select: { id: true, name: true } } },
    });
    await tx.exportLead.update({
      where: { id: leadId },
      data: { status: "converted", convertedToCustomerId: c.id },
    });
    let primaryContactId: string | null = null;
    if (lead.email || lead.phone || lead.whatsapp || lead.linkedin || lead.facebook || lead.tiktok) {
      const contactName =
        lead.email?.split("@")[0] || lead.companyName || "默认联系人";
      const contact = await tx.exportContact.create({
        data: {
          tenantId: ctx!.tenantId,
          customerId: c.id,
          name: contactName,
          email: lead.email ?? undefined,
          phone: lead.phone ?? undefined,
          whatsapp: lead.whatsapp ?? undefined,
          linkedin: lead.linkedin ?? undefined,
          facebook: lead.facebook ?? undefined,
          tiktok: lead.tiktok ?? undefined,
          isPrimary: true,
        },
      });
      primaryContactId = contact.id;
    }
    const moved = await tx.exportActivity.updateMany({
      where: { leadId, tenantId: ctx!.tenantId },
      data: { customerId: c.id, leadId: null },
    });
    if (primaryContactId) {
      await tx.exportActivity.updateMany({
        where: { customerId: c.id, contactId: null, tenantId: ctx!.tenantId },
        data: { contactId: primaryContactId },
      });
    }
    if (payload.createTaskTitle?.trim()) {
      await tx.exportTask.create({
        data: {
          tenantId: ctx!.tenantId,
          customerId: c.id,
          title: payload.createTaskTitle.trim(),
          dueDate: payload.createTaskDueAt ? new Date(payload.createTaskDueAt) : undefined,
          ownerId,
          status: "todo",
          priority: "high",
          notes: `由线索「${lead.companyName}」转化时自动创建`,
        },
      });
    }
    return { ...c, _movedActivities: moved.count, primaryContactId };
  });

  return NextResponse.json({ data: customer });
  } catch (e) {
    if (e instanceof ExportLeadTakeError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("Convert lead error:", e);
    return NextResponse.json({ error: "转化失败，请稍后重试" }, { status: 500 });
  }
}
