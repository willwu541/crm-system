import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { countryLabel } from "@/lib/export/countries";
import { companyKey } from "@/lib/export/work-outcomes";

function startOfLocalDay(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function GET() {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;

  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const todayEnd = new Date(todayStart.getTime() + 24 * 3600 * 1000);
  const ownerScope = ctx!.ownerFilter?.ownerIds;

  const owners = await prisma.user.findMany({
    where: {
      tenant: "export",
      tenantId: ctx!.tenantId,
      isActive: true,
      ...(ownerScope ? { id: { in: ownerScope } } : {}),
    },
    select: { id: true, name: true },
  });

  const leadDueWhere = {
    tenantId: ctx!.tenantId,
    status: { notIn: ["converted", "invalid"] },
    ...(ownerScope ? { ownerId: { in: ownerScope } } : {}),
    nextFollowUpAt: { gte: todayStart, lt: todayEnd },
  };
  const customerDueWhere = {
    tenantId: ctx!.tenantId,
    status: { notIn: ["won", "lost"] },
    ...(ownerScope ? { ownerId: { in: ownerScope } } : {}),
    nextFollowUpAt: { gte: todayStart, lt: todayEnd },
  };

  const [activities, dueLeads, dueCustomers, quoteWaiting] = await Promise.all([
    prisma.exportActivity.findMany({
      where: {
        tenantId: ctx!.tenantId,
        createdAt: { gte: todayStart, lt: todayEnd },
        ...(ownerScope ? { ownerId: { in: ownerScope } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 400,
      select: {
        id: true,
        ownerId: true,
        type: true,
        direction: true,
        outcome: true,
        customerFeedback: true,
        content: true,
        customerNameSnapshot: true,
        leadId: true,
        customerId: true,
        createdAt: true,
        owner: { select: { name: true } },
      },
    }),
    prisma.exportLead.findMany({
      where: leadDueWhere,
      orderBy: { nextFollowUpAt: "asc" },
      take: 8,
      select: {
        id: true,
        companyName: true,
        country: true,
        lastOutcome: true,
        nextFollowUpAt: true,
        ownerId: true,
        owner: { select: { name: true } },
      },
    }),
    prisma.exportCustomer.findMany({
      where: customerDueWhere,
      orderBy: { nextFollowUpAt: "asc" },
      take: 8,
      select: {
        id: true,
        companyName: true,
        country: true,
        lastOutcome: true,
        nextFollowUpAt: true,
        ownerId: true,
        owner: { select: { name: true } },
      },
    }),
    prisma.exportQuote.findMany({
      where: {
        tenantId: ctx!.tenantId,
        status: "sent",
        createdAt: { lt: new Date(now.getTime() - 3 * 24 * 3600 * 1000) },
        customer: ownerScope
          ? { tenantId: ctx!.tenantId, ownerId: { in: ownerScope } }
          : { tenantId: ctx!.tenantId },
      },
      orderBy: { createdAt: "asc" },
      take: 6,
      select: {
        id: true,
        quoteNo: true,
        customerId: true,
        customer: { select: { companyName: true, ownerId: true, owner: { select: { name: true } } } },
      },
    }),
  ]);

  const metrics = owners.map((owner) => {
    const mine = activities.filter((item) => item.ownerId === owner.id);
    const unique = (outcome: string) =>
      new Set(mine.filter((item) => item.outcome === outcome).map(companyKey)).size;
    return {
      ownerId: owner.id,
      ownerName: owner.name,
      fitConfirmed: unique("fit_confirmed"),
      namedContacts: unique("named_contact"),
      realReplies: unique("real_reply"),
      gotSpecs: unique("got_spec"),
      nextAgreed: unique("next_agreed"),
      logged: mine.length,
    };
  });

  const mustPush = [
    ...dueLeads.map((item) => ({
      kind: "lead" as const,
      id: item.id,
      href: `/export/leads/${item.id}`,
      companyName: item.companyName,
      country: countryLabel(item.country),
      ownerName: item.owner.name,
      reason: "到期",
      lastOutcome: item.lastOutcome,
    })),
    ...dueCustomers.map((item) => ({
      kind: "customer" as const,
      id: item.id,
      href: `/export/customers/${item.id}`,
      companyName: item.companyName,
      country: countryLabel(item.country),
      ownerName: item.owner.name,
      reason: "到期",
      lastOutcome: item.lastOutcome,
    })),
    ...quoteWaiting.map((item) => ({
      kind: "quote" as const,
      id: item.id,
      href: `/export/customers/${item.customerId}`,
      companyName: item.customer.companyName,
      country: "",
      ownerName: item.customer.owner.name,
      reason: `报价超3天`,
      lastOutcome: null as string | null,
    })),
  ].slice(0, 8);

  return NextResponse.json({
    data: {
      isAdmin: !ownerScope || ownerScope.length > 1,
      viewerId: user!.id,
      viewerName: user!.name,
      metrics,
      mustPush,
      feed: activities.slice(0, 10).map((item) => ({
        id: item.id,
        ownerName: item.owner.name,
        ownerId: item.ownerId,
        companyName: item.customerNameSnapshot || "未写公司",
        href: item.customerId
          ? `/export/customers/${item.customerId}`
          : item.leadId
            ? `/export/leads/${item.leadId}`
            : "/export/dashboard",
        type: item.type,
        direction: item.direction,
        outcome: item.outcome,
        note: item.customerFeedback || item.content,
        createdAt: item.createdAt,
      })),
    },
  });
}
