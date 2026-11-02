import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { prismaErrorToUserMessage } from "@/lib/prisma-user-message";
import { canonicalizeCountry, extraCountryValues } from "@/lib/export/countries";
import {
  PROJECT_CONFIDENCE,
  PROJECT_ENTRY_STATUSES,
  PROJECT_INDUSTRIES,
  PROJECT_STAGES,
  PROJECT_STATUSES,
} from "@/lib/export-constants";
import {
  PROJECT_LIST_INCLUDE,
  findProjectIdsByPartyPhoneDigits,
  isProjectConfidence,
  isProjectEntryStatus,
  isProjectIndustry,
  isProjectPartyRole,
  isProjectStage,
  isProjectStatus,
  parseOptionalDate,
  projectKeywordOrClauses,
  canManageExportProjects,
  denyUnlessCanManageProjects,
  projectListOwnerWhere,
  resolveExportOwnerId,
} from "@/lib/export/projects";
import { z } from "zod";
import { findSalesUsersByName } from "@/lib/sales-user-search";

export async function GET(request: NextRequest) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(80, Math.max(10, parseInt(searchParams.get("pageSize") ?? "50")));
  const keyword = searchParams.get("keyword")?.trim();
  const status = searchParams.get("status")?.trim();
  const stage = searchParams.get("stage")?.trim();
  const industry = searchParams.get("industry")?.trim();
  const confidence = searchParams.get("confidence")?.trim();
  const country = searchParams.get("country")?.trim();
  const entryStatus = searchParams.get("entryStatus")?.trim();
  const ownerId = searchParams.get("ownerId")?.trim();
  const role = searchParams.get("role")?.trim();
  const sortByRaw = searchParams.get("sortBy") ?? "updatedAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const allowedSort = new Set(["createdAt", "updatedAt", "name", "status", "bidDeadline", "country"]);
  const sortBy = allowedSort.has(sortByRaw) ? sortByRaw : "updatedAt";

  const where: Record<string, unknown> = {
    tenantId: ctx!.tenantId,
    ...projectListOwnerWhere(user!),
  };
  const and: Record<string, unknown>[] = [];
  const manageAll = canManageExportProjects(user!);

  if (status && isProjectStatus(status)) where.status = status;
  if (stage && isProjectStage(stage)) where.stage = stage;
  if (industry && isProjectIndustry(industry)) where.industry = industry;
  if (confidence && isProjectConfidence(confidence)) where.confidence = confidence;
  if (country) where.country = country;
  const salesMatch =
    manageAll && keyword
      ? await findSalesUsersByName({ tenant: "export", tenantId: ctx!.tenantId, keyword })
      : { exactIds: [] as string[] };
  const matchedOwnerIds = salesMatch.exactIds.length ? salesMatch.exactIds : undefined;
  if (manageAll) {
    if (matchedOwnerIds) {
      where.ownerId = matchedOwnerIds.length === 1 ? matchedOwnerIds[0] : { in: matchedOwnerIds };
    } else if (ownerId) {
      where.ownerId = ownerId;
    }
  }
  if (role && isProjectPartyRole(role)) {
    and.push({ parties: { some: { role } } });
  }
  if (keyword && !matchedOwnerIds) {
    const phoneMatchIds = await findProjectIdsByPartyPhoneDigits(ctx!.tenantId, keyword);
    and.push({ OR: projectKeywordOrClauses(keyword, phoneMatchIds) });
  }
  if (and.length) where.AND = and;

  const countWhere: Record<string, unknown> = { ...where };
  if (entryStatus && isProjectEntryStatus(entryStatus)) where.entryStatus = entryStatus;

  try {
    const [data, total, countryRows, entryGroups] = await Promise.all([
      prisma.exportProject.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: PROJECT_LIST_INCLUDE,
      }),
      prisma.exportProject.count({ where }),
      prisma.exportProject.groupBy({
        by: ["country"],
        where: {
          tenantId: ctx!.tenantId,
          ...projectListOwnerWhere(user!),
          AND: [{ country: { not: null } }, { country: { not: "" } }],
        },
      }),
      prisma.exportProject.groupBy({
        by: ["entryStatus"],
        where: countWhere,
        _count: { _all: true },
      }),
    ]);

    const entryCounts = { pending: 0, entered: 0, all: 0 };
    for (const row of entryGroups) {
      const key = row.entryStatus;
      const n = row._count._all;
      if (key === "pending" || key === "entered") entryCounts[key] = n;
      entryCounts.all += n;
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      countries: extraCountryValues(countryRows.map((row) => row.country)),
      entryCounts,
    });
  } catch (e) {
    console.error("List export projects error:", e);
    return NextResponse.json(
      { error: prismaErrorToUserMessage(e, "加载项目失败") },
      { status: 500 },
    );
  }
}

const createSchema = z.object({
  name: z.string().trim().min(1, "请填写项目名称"),
  country: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  industry: z.enum(PROJECT_INDUSTRIES).optional().nullable(),
  stage: z.enum(PROJECT_STAGES).optional(),
  confidence: z.enum(PROJECT_CONFIDENCE).optional(),
  ownerOperator: z.string().optional().nullable(),
  generalContractor: z.string().optional().nullable(),
  potentialBuyers: z.string().optional().nullable(),
  entryStatus: z.enum(PROJECT_ENTRY_STATUSES).optional(),
  productNeed: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  tenderUrl: z.string().optional().nullable(),
  status: z.enum(PROJECT_STATUSES).optional(),
  bidDeadline: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const denied = denyUnlessCanManageProjects(user!);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效或为空，请刷新页面后重试" }, { status: 400 });
  }

  try {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "参数错误" },
        { status: 400 },
      );
    }

    const bidDeadline = parseOptionalDate(parsed.data.bidDeadline);
    if (parsed.data.bidDeadline && bidDeadline === undefined) {
      return NextResponse.json({ error: "投标截止日期无效" }, { status: 400 });
    }

    const ownerId = await resolveExportOwnerId(ctx!.tenantId, parsed.data.ownerId);

    const project = await prisma.exportProject.create({
      data: {
        tenantId: ctx!.tenantId,
        name: parsed.data.name,
        country: canonicalizeCountry(parsed.data.country ?? "") || parsed.data.country?.trim() || null,
        city: parsed.data.city?.trim() || null,
        location: parsed.data.location?.trim() || null,
        industry: parsed.data.industry || null,
        stage: parsed.data.stage ?? "unknown",
        confidence: parsed.data.confidence ?? "unknown",
        ownerOperator: parsed.data.ownerOperator?.trim() || null,
        generalContractor: parsed.data.generalContractor?.trim() || null,
        potentialBuyers: parsed.data.potentialBuyers?.trim() || null,
        entryStatus: parsed.data.entryStatus ?? "entered",
        productNeed: parsed.data.productNeed?.trim() || null,
        description: parsed.data.description?.trim() || null,
        source: parsed.data.source?.trim() || null,
        tenderUrl: parsed.data.tenderUrl?.trim() || null,
        status: parsed.data.status ?? "hunting",
        bidDeadline: bidDeadline ?? null,
        ownerId: ownerId ?? null,
        createdById: user!.id,
        notes: parsed.data.notes?.trim() || null,
      },
      include: PROJECT_LIST_INCLUDE,
    });
    return NextResponse.json({ data: project });
  } catch (e) {
    console.error("Create export project error:", e);
    return NextResponse.json(
      { error: prismaErrorToUserMessage(e, "创建项目失败") },
      { status: 500 },
    );
  }
}
