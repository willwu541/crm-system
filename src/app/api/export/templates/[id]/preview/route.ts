import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { renderTemplate, type TemplateVarsInput } from "@/lib/export/template-vars";
import { z } from "zod";

const querySchema = z.object({
  leadId: z.string().optional(),
  customerId: z.string().optional(),
  contactId: z.string().optional(),
  quoteId: z.string().optional(),
});

/**
 * 用指定的 lead/customer/contact/quote 上下文预览模板，返回渲染后的 subject/body。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    leadId: searchParams.get("leadId") ?? undefined,
    customerId: searchParams.get("customerId") ?? undefined,
    contactId: searchParams.get("contactId") ?? undefined,
    quoteId: searchParams.get("quoteId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const template = await prisma.exportEmailTemplate.findUnique({
    where: { id, tenantId: ctx!.tenantId },
  });
  if (!template) return NextResponse.json({ error: "模板不存在" }, { status: 404 });
  if (!template.isShared && template.createdById !== user!.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const input: TemplateVarsInput = {
    user: {
      name: user!.name,
      email: user!.email,
    },
  };

  if (parsed.data.leadId) {
    const lead = await prisma.exportLead.findUnique({
      where: { id: parsed.data.leadId, tenantId: ctx!.tenantId },
      select: { companyName: true, country: true, city: true, website: true },
    });
    if (lead) input.lead = lead;
  }

  if (parsed.data.customerId) {
    const customer = await prisma.exportCustomer.findUnique({
      where: { id: parsed.data.customerId, tenantId: ctx!.tenantId },
      select: {
        companyName: true,
        customerCode: true,
        country: true,
        city: true,
        website: true,
      },
    });
    if (customer) input.customer = customer;
  }

  if (parsed.data.contactId) {
    const contact = await prisma.exportContact.findUnique({
      where: { id: parsed.data.contactId, tenantId: ctx!.tenantId },
      select: {
        name: true,
        title: true,
        email: true,
        phone: true,
        whatsapp: true,
      },
    });
    if (contact) input.contact = contact;
  }

  if (parsed.data.quoteId) {
    const quote = await prisma.exportQuote.findUnique({
      where: { id: parsed.data.quoteId, tenantId: ctx!.tenantId },
      select: { quoteNo: true, totalAmount: true, currency: true },
    });
    if (quote)
      input.quote = {
        quoteNo: quote.quoteNo,
        totalAmount: quote.totalAmount ? String(quote.totalAmount) : null,
        currency: quote.currency,
      };
  }

  // 取用户签名
  const dbUser = await prisma.user.findUnique({
    where: { id: user!.id },
    select: { emailSignature: true },
  });
  if (dbUser?.emailSignature) {
    input.user!.emailSignature = dbUser.emailSignature;
  }

  const rendered = renderTemplate(
    { subject: template.subject, body: template.body },
    input
  );

  return NextResponse.json({
    data: {
      id: template.id,
      name: template.name,
      category: template.category,
      language: template.language,
      ...rendered,
    },
  });
}
