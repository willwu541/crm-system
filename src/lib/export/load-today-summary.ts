import { prisma } from "@/lib/prisma";
import { getAccessPolicy } from "@/lib/access-policy";
import {
  activityActionText,
  assignActionText,
  buildTodaySummary,
  claimActionText,
  customerActionText,
  deletionActionText,
  formatTodayLabel,
  isTodayStaff,
  partyActionText,
  projectActionText,
  todayRange,
  type TodayActionInput,
  type TodayPerson,
} from "@/lib/export/today-summary";

type Actor = { id: string; name: string; role: string };

export type TodaySummaryData = {
  dateLabel: string;
  people: TodayPerson[];
};

function actorFields(actor: Actor, directorUserId: string | null) {
  return {
    userId: actor.id,
    userName: actor.name,
    role: actor.role,
    director: actor.id === directorUserId,
  };
}

export async function loadTodaySummary(tenantId: string, now = new Date()): Promise<TodaySummaryData> {
  const { start, end } = todayRange(now);
  const createdAt = { gte: start, lt: end };
  const directorUserId = getAccessPolicy().directorUserId;

  const [users, claims, activities, projects, parties, customers, deletions] = await Promise.all([
    prisma.user.findMany({
      where: { tenant: "export", tenantId },
      select: { id: true, name: true, role: true, isActive: true },
    }),
    prisma.exportLeadClaim.findMany({
      where: { tenantId, createdAt },
      select: {
        id: true,
        createdAt: true,
        assignedById: true,
        lead: { select: { id: true, companyName: true } },
        user: { select: { id: true, name: true, role: true } },
        assignedBy: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.exportActivity.findMany({
      where: { tenantId, createdAt },
      select: {
        id: true,
        type: true,
        content: true,
        customerFeedback: true,
        customerNameSnapshot: true,
        createdAt: true,
        leadId: true,
        customerId: true,
        lead: { select: { companyName: true } },
        customer: { select: { companyName: true } },
        owner: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.exportProject.findMany({
      where: { tenantId, createdAt },
      select: {
        id: true,
        name: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.exportProjectParty.findMany({
      where: { tenantId, createdAt },
      select: {
        id: true,
        companyName: true,
        createdAt: true,
        project: { select: { id: true, name: true } },
        foundBy: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.exportCustomer.findMany({
      where: { tenantId, createdAt },
      select: {
        id: true,
        companyName: true,
        createdAt: true,
        owner: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.exportDeletionLog.findMany({
      where: { tenantId, createdAt },
      select: {
        id: true,
        entityType: true,
        summary: true,
        createdAt: true,
        deletedBy: { select: { id: true, name: true, role: true } },
      },
    }),
  ]);

  const actions: TodayActionInput[] = [];

  for (const claim of claims) {
    const company = claim.lead.companyName;
    const href = `/export/leads/${claim.lead.id}`;
    if (claim.assignedById && claim.assignedBy) {
      actions.push({
        id: `assign:${claim.id}`,
        ...actorFields(claim.assignedBy, directorUserId),
        at: claim.createdAt,
        text: assignActionText(claim.user.name, company),
        href,
      });
    } else if (!claim.assignedById) {
      actions.push({
        id: `claim:${claim.id}`,
        ...actorFields(claim.user, directorUserId),
        at: claim.createdAt,
        text: claimActionText(company),
        href,
      });
    }
  }

  for (const activity of activities) {
    const company =
      activity.customerNameSnapshot || activity.customer?.companyName || activity.lead?.companyName || null;
    actions.push({
      id: `activity:${activity.id}`,
      ...actorFields(activity.owner, directorUserId),
      at: activity.createdAt,
      text: activityActionText({
        type: activity.type,
        company,
        feedback: activity.customerFeedback,
        content: activity.content,
      }),
      href: activity.customerId
        ? `/export/customers/${activity.customerId}`
        : activity.leadId
          ? `/export/leads/${activity.leadId}`
          : null,
    });
  }

  for (const project of projects) {
    actions.push({
      id: `project:${project.id}`,
      ...actorFields(project.createdBy, directorUserId),
      at: project.createdAt,
      text: projectActionText(project.name),
      href: `/export/projects/${project.id}`,
    });
  }

  for (const party of parties) {
    actions.push({
      id: `party:${party.id}`,
      ...actorFields(party.foundBy, directorUserId),
      at: party.createdAt,
      text: partyActionText(party.project.name, party.companyName),
      href: `/export/projects/${party.project.id}`,
    });
  }

  for (const customer of customers) {
    actions.push({
      id: `customer:${customer.id}`,
      ...actorFields(customer.owner, directorUserId),
      at: customer.createdAt,
      text: customerActionText(customer.companyName),
      href: `/export/customers/${customer.id}`,
    });
  }

  for (const deletion of deletions) {
    actions.push({
      id: `delete:${deletion.id}`,
      ...actorFields(deletion.deletedBy, directorUserId),
      at: deletion.createdAt,
      text: deletionActionText(deletion.entityType, deletion.summary),
      href: null,
    });
  }

  const staff = users
    .filter((user) => isTodayStaff(user, directorUserId))
    .map((user) => ({
      ...user,
      director: user.id === directorUserId,
    }));

  return {
    dateLabel: formatTodayLabel(now),
    people: buildTodaySummary(staff, actions),
  };
}
