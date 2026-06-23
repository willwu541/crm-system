import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { getLeadSopSuggestion } from "@/lib/export/sop";

const bodySchema = z.object({
  dryRun: z.boolean().optional(),
  limit: z.number().int().min(1).max(500).optional(),
});

export async function POST(request: NextRequest) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;

  const raw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    );
  }

  const dryRun = parsed.data.dryRun ?? false;
  const limit = parsed.data.limit ?? 200;

  const leads = await prisma.exportLead.findMany({
    where: {
      tenantId: ctx!.tenantId,
      ...(ctx!.ownerFilter ?? {}),
      status: { notIn: ["converted", "invalid"] },
    },
    select: {
      id: true,
      companyName: true,
      ownerId: true,
      contactCount: true,
      lastContactAt: true,
      nextFollowUpAt: true,
      createdAt: true,
    },
    orderBy: [{ lastContactAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  });

  const openTasks = await prisma.exportTask.findMany({
    where: {
      tenantId: ctx!.tenantId,
      ...(ctx!.ownerFilter ?? {}),
      leadId: { in: leads.map((l) => l.id) },
      status: { in: ["todo", "in_progress"] },
    },
    select: { id: true, leadId: true, title: true },
  });
  const leadsWithOpenSopTask = new Set(
    openTasks.filter((t) => t.title.includes("[SOP]")).map((t) => t.leadId).filter(Boolean),
  );

  const suggestions = leads
    .map((lead) => {
      const suggestion = getLeadSopSuggestion({
        id: lead.id,
        companyName: lead.companyName,
        contactCount: lead.contactCount,
        lastContactAt: lead.lastContactAt,
        createdAt: lead.createdAt,
      });
      if (!suggestion) return null;
      return {
        leadId: lead.id,
        companyName: lead.companyName,
        ownerId: lead.ownerId,
        nextFollowUpAt: lead.nextFollowUpAt,
        ...suggestion,
      };
    })
    .filter(Boolean)
    .filter((s) => !leadsWithOpenSopTask.has(s!.leadId)) as Array<{
    leadId: string;
    companyName: string;
    ownerId: string;
    nextFollowUpAt: Date | null;
    title: string;
    note: string;
  }>;

  if (dryRun) {
    return NextResponse.json({
      data: {
        totalCandidates: leads.length,
        suggestCount: suggestions.length,
        suggestions: suggestions.slice(0, 50),
      },
    });
  }

  const now = new Date();
  const created: string[] = [];
  for (const s of suggestions) {
    const t = await prisma.exportTask.create({
      data: {
        tenantId: ctx!.tenantId,
        leadId: s.leadId,
        ownerId: s.ownerId,
        title: s.title,
        notes: s.note,
        status: "todo",
        priority: "high",
        dueDate: now,
      },
      select: { id: true },
    });
    created.push(t.id);
  }

  return NextResponse.json({
    data: {
      totalCandidates: leads.length,
      suggestCount: suggestions.length,
      createdCount: created.length,
    },
  });
}

