import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { generateCustomerCode } from "@/lib/export/number-generator";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, ctx, error } = await requireExportSession();
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
      },
      include: { owner: { select: { id: true, name: true } } },
    });
    await tx.exportLead.update({
      where: { id: leadId },
      data: { status: "converted", convertedToCustomerId: c.id },
    });
    if (lead.email || lead.phone || lead.whatsapp) {
      const contactName =
        lead.email?.split("@")[0] || lead.companyName || "默认联系人";
      await tx.exportContact.create({
        data: {
          tenantId: ctx!.tenantId,
          customerId: c.id,
          name: contactName,
          email: lead.email ?? undefined,
          phone: lead.phone ?? undefined,
          whatsapp: lead.whatsapp ?? undefined,
          isPrimary: true,
        },
      });
    }
    return c;
  });

  return NextResponse.json({ data: customer });
}
