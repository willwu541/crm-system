import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "线索不存在" }, { status: 404 });

  if (user.role === "SALES" && lead.ownerId !== user.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  if (lead.status === "CONVERTED") {
    return NextResponse.json({ error: "该线索已转化" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 先找是否已存在同名客户（不管owner）
      let customer = await tx.customer.findFirst({
        where: { name: lead.companyName },
      });

      if (!customer) {
        // 新建客户
        customer = await tx.customer.create({
          data: {
            name: lead.companyName,
            contactName: lead.contactName,
            contactPhone: lead.contactPhone,
            wechat: lead.wechat,
            region: lead.region,
            source: lead.source,
            remark: lead.remark,
            ownerId: lead.ownerId,
            createdById: user.id,
            lastContactAt: new Date(),
          },
        });
      } else {
        // 已存在：更新联系信息（补充可能缺失的）
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            ...(lead.contactName ? { contactName: lead.contactName } : {}),
            ...(lead.contactPhone ? { contactPhone: lead.contactPhone } : {}),
            ...(lead.wechat ? { wechat: lead.wechat } : {}),
            ...(lead.remark ? { remark: lead.remark } : {}),
            lastContactAt: new Date(),
          },
        });
      }

      await tx.lead.update({
        where: { id },
        data: { status: "CONVERTED", customerId: customer.id },
      });

      // 迁移线索阶段的通用附件到客户，避免转化后在客户页看不到
      await tx.fileAttachment.updateMany({
        where: {
          entityType: "lead",
          entityId: lead.id,
        },
        data: {
          entityType: "customer",
          entityId: customer.id,
        },
      });

      // 迁移未完成的线索任务到客户，保持后续跟进连续
      await tx.task.updateMany({
        where: {
          leadId: lead.id,
          status: "todo",
        },
        data: {
          customerId: customer.id,
          leadId: null,
        },
      });

      return customer;
    });

    // 自动创建跟进任务
    await prisma.task.create({
      data: {
        title: `跟进新客户: ${result.name}`,
        type: "follow_up",
        customerId: result.id,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        priority: "HIGH",
        ownerId: lead.ownerId,
      },
    });

    return NextResponse.json({ data: { customer: { id: result.id, name: result.name } } });
  } catch (e) {
    console.error("Convert lead error:", e);
    return NextResponse.json({ error: "转化失败，请重试" }, { status: 500 });
  }
}
