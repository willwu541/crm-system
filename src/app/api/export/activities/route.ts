import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { ACTIVITY_DIRECTIONS } from "@/lib/export-constants";
import { renderTemplate, type TemplateVarsInput } from "@/lib/export/template-vars";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId")?.trim();
  const leadId = searchParams.get("leadId")?.trim();

  if (!customerId && !leadId) {
    return NextResponse.json({ error: "缺少 customerId 或 leadId" }, { status: 400 });
  }

  if (customerId) {
    const customer = await prisma.exportCustomer.findUnique({
      where: { id: customerId, tenantId: ctx!.tenantId },
    });
    if (!customer) return NextResponse.json({ error: "客户不存在" }, { status: 404 });
    if (ctx!.ownerFilter && customer.ownerId !== ctx!.ownerFilter.ownerId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }
  }

  if (leadId) {
    const lead = await prisma.exportLead.findUnique({
      where: { id: leadId, tenantId: ctx!.tenantId },
    });
    if (!lead) return NextResponse.json({ error: "线索不存在" }, { status: 404 });
    if (ctx!.ownerFilter && lead.ownerId !== ctx!.ownerFilter.ownerId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }
  }

  const where: Record<string, unknown> = { tenantId: ctx!.tenantId };
  if (customerId) where.customerId = customerId;
  if (leadId) where.leadId = leadId;

  const data = await prisma.exportActivity.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      contact: true,
      owner: { select: { id: true, name: true } },
      template: { select: { id: true, name: true, category: true, language: true } },
    },
  });
  return NextResponse.json({ data });
}

const createSchema = z
  .object({
    customerId: z.string().optional().nullable(),
    leadId: z.string().optional().nullable(),
    contactId: z.string().optional().nullable(),
    type: z.string().min(1),
    direction: z.enum(ACTIVITY_DIRECTIONS).default("outbound"),
    subject: z.string().optional(),
    content: z.string().optional(),
    customerFeedback: z.string().optional(),
    templateId: z.string().optional().nullable(),
    /** 若指定 templateId，可选 renderTemplate=true 让后端用客户/联系人上下文重新渲染 subject/body 后再保存 */
    renderTemplate: z.boolean().optional(),
    nextFollowUpAt: z.string().datetime().optional().nullable(),
  })
  .refine((d) => !!d.customerId || !!d.leadId, {
    message: "必须指定 customerId 或 leadId",
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
    const input = parsed.data;

    // 校验目标存在 + 权限
    let customer: Awaited<ReturnType<typeof prisma.exportCustomer.findUnique>> | null = null;
    let lead: Awaited<ReturnType<typeof prisma.exportLead.findUnique>> | null = null;

    if (input.customerId) {
      customer = await prisma.exportCustomer.findUnique({
        where: { id: input.customerId, tenantId: ctx!.tenantId },
        include: { contacts: true },
      });
      if (!customer) return NextResponse.json({ error: "客户不存在" }, { status: 404 });
      if (ctx!.ownerFilter && customer.ownerId !== ctx!.ownerFilter.ownerId) {
        return NextResponse.json({ error: "无权限" }, { status: 403 });
      }
    }

    if (input.leadId) {
      lead = await prisma.exportLead.findUnique({
        where: { id: input.leadId, tenantId: ctx!.tenantId },
      });
      if (!lead) return NextResponse.json({ error: "线索不存在" }, { status: 404 });
      if (ctx!.ownerFilter && lead.ownerId !== ctx!.ownerFilter.ownerId) {
        return NextResponse.json({ error: "无权限" }, { status: 403 });
      }
    }

    const contact = input.contactId && customer && "contacts" in customer
      ? (customer.contacts as Array<{ id: string; name: string; email: string | null }>).find(
          (c) => c.id === input.contactId
        )
      : null;

    // 可选：根据 templateId 渲染 subject / body
    let subject = input.subject;
    let content = input.content;
    let templateId: string | null = input.templateId ?? null;
    if (templateId) {
      const template = await prisma.exportEmailTemplate.findUnique({
        where: { id: templateId, tenantId: ctx!.tenantId },
      });
      if (template && input.renderTemplate) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user!.id },
          select: { emailSignature: true },
        });
        const tplInput: TemplateVarsInput = {
          customer: customer
            ? {
                companyName: customer.companyName,
                customerCode: customer.customerCode,
                country: customer.country,
                city: customer.city,
                website: customer.website,
              }
            : undefined,
          lead: lead
            ? {
                companyName: lead.companyName,
                country: lead.country,
                city: lead.city,
                website: lead.website,
              }
            : undefined,
          contact: contact
            ? {
                name: contact.name,
                email: contact.email,
              }
            : undefined,
          user: {
            name: user!.name,
            email: user!.email,
            emailSignature: dbUser?.emailSignature ?? null,
          },
        };
        const rendered = renderTemplate(
          { subject: template.subject, body: template.body },
          tplInput
        );
        // 用户没自己填的话，使用渲染后的；填了的话保留
        if (!subject) subject = rendered.subject;
        if (!content) content = rendered.body;
      }
    }

    const activity = await prisma.$transaction(async (tx) => {
      const a = await tx.exportActivity.create({
        data: {
          tenantId: ctx!.tenantId,
          customerId: input.customerId ?? undefined,
          leadId: input.leadId ?? undefined,
          contactId: input.contactId ?? undefined,
          type: input.type,
          direction: input.direction,
          subject,
          content,
          customerFeedback: input.customerFeedback,
          customerNameSnapshot: customer?.companyName ?? lead?.companyName ?? undefined,
          contactNameSnapshot: contact?.name ?? undefined,
          contactEmailSnapshot: contact?.email ?? undefined,
          templateId: templateId ?? undefined,
          nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : undefined,
          ownerId: user!.id,
        },
        include: {
          contact: true,
          owner: { select: { id: true, name: true } },
          template: { select: { id: true, name: true, category: true, language: true } },
        },
      });

      // 自动维护 lead / customer 的最后联系时间 + 联系次数
      if (input.leadId) {
        const leadUpdate: {
          lastContactAt: Date;
          contactCount?: { increment: number };
          nextFollowUpAt?: Date;
        } = { lastContactAt: new Date() };
        if (input.direction === "outbound") {
          leadUpdate.contactCount = { increment: 1 };
        }
        if (input.nextFollowUpAt) {
          leadUpdate.nextFollowUpAt = new Date(input.nextFollowUpAt);
        }
        await tx.exportLead.update({
          where: { id: input.leadId },
          data: leadUpdate,
        });
      }

      if (input.customerId) {
        const customerUpdate: { lastFollowUpAt: Date; nextFollowUpAt?: Date } = {
          lastFollowUpAt: new Date(),
        };
        if (input.nextFollowUpAt) {
          customerUpdate.nextFollowUpAt = new Date(input.nextFollowUpAt);
        }
        await tx.exportCustomer.update({
          where: { id: input.customerId },
          data: customerUpdate,
        });
      }

      return a;
    });

    return NextResponse.json({ data: activity });
  } catch (e) {
    console.error("Create activity error:", e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
