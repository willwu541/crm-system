import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function findHeir(target: { id: string; tenant: string; tenantId: string | null }, actorId: string) {
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true, tenant: true, tenantId: true, role: true, isActive: true },
  });
  if (
    actor &&
    actor.isActive &&
    actor.role === "ADMIN" &&
    actor.tenant === target.tenant &&
    actor.tenantId === target.tenantId
  ) {
    return actor;
  }
  return prisma.user.findFirst({
    where: {
      role: "ADMIN",
      isActive: true,
      tenant: target.tenant as "domestic" | "export",
      tenantId: target.tenantId,
      id: { not: target.id },
    },
    select: { id: true, name: true },
  });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getSession();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ error: "只有管理员可以办理离职交接" }, { status: 403 });
  }
  const { id } = await params;
  if (id === me.id) {
    return NextResponse.json({ error: "不能办理自己的离职" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  if (!target.isActive) return NextResponse.json({ error: "这个账号已经停用" }, { status: 400 });

  if (target.role === "ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", isActive: true, id: { not: target.id } },
    });
    if (otherAdmins < 1) {
      return NextResponse.json({ error: "至少要留下一名管理员" }, { status: 400 });
    }
  }

  const heir = await findHeir(target, me.id);
  if (!heir) {
    return NextResponse.json({ error: "没有可接收资料的在职管理员" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    let releasedLeads = 0;
    let reassignedLeads = 0;
    let reassignedCustomers = 0;

    if (target.tenant === "export") {
      const released = await tx.exportLead.updateMany({
        where: { ownerId: target.id, convertedToCustomerId: null },
        data: { ownerId: null, claimedAt: null },
      });
      const kept = await tx.exportLead.updateMany({
        where: { ownerId: target.id, convertedToCustomerId: { not: null } },
        data: { ownerId: heir.id },
      });
      const customers = await tx.exportCustomer.updateMany({
        where: { ownerId: target.id },
        data: { ownerId: heir.id },
      });
      await tx.exportTask.updateMany({
        where: { ownerId: target.id },
        data: { ownerId: heir.id },
      });
      await tx.exportProject.updateMany({
        where: { ownerId: target.id },
        data: { ownerId: heir.id },
      });
      releasedLeads = released.count;
      reassignedLeads = kept.count;
      reassignedCustomers = customers.count;
    } else {
      const leads = await tx.lead.updateMany({
        where: { ownerId: target.id },
        data: { ownerId: heir.id },
      });
      const customers = await tx.customer.updateMany({
        where: { ownerId: target.id },
        data: { ownerId: heir.id },
      });
      await tx.task.updateMany({
        where: { ownerId: target.id },
        data: { ownerId: heir.id },
      });
      reassignedLeads = leads.count;
      reassignedCustomers = customers.count;
    }

    await tx.user.update({
      where: { id: target.id },
      data: { isActive: false },
    });

    return { releasedLeads, reassignedLeads, reassignedCustomers };
  });

  return NextResponse.json({
    data: {
      ...result,
      heirName: "name" in heir ? heir.name : me.name,
    },
  });
}
