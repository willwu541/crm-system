import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { generateCustomerCode } from "@/lib/export/number-generator";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id: leadId } = await params;

  const lead = await prisma.exportLead.findUnique({
    where: { id: leadId, tenantId: ctx!.tenantId },
    include: { owner: true },
  });
  if (!lead) return NextResponse.json({ error: "线索不存在" }, { status: 404 });
  if (ctx!.ownerFilter && lead.ownerId !== ctx!.ownerFilter.ownerId) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  if (lead.convertedToCustomerId) {
    return NextResponse.json({ error: "该线索已转化", customerId: lead.convertedToCustomerId });
  }

  const customerCode = await generateCustomerCode(ctx!.tenantId);
  const customer = await prisma.$transaction(async (tx) => {
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
        ownerId: lead.ownerId,
        status: "to_develop",
        lastFollowUpAt: lead.lastContactAt ?? undefined,
        nextFollowUpAt: lead.nextFollowUpAt ?? undefined,
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
    return { ...c, _movedActivities: moved.count, primaryContactId };
  });

  return NextResponse.json({ data: customer });
}
