import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { prismaErrorToUserMessage } from "@/lib/prisma-user-message";
import { canonicalizeCountry, extraCountryValues } from "@/lib/export/countries";
import {
  PROJECT_CONFIDENCE,
  PROJECT_DEMAND_DEFAULT,
  PROJECT_DEMAND_STATUSES,
  PROJECT_ENTRY_STATUSES,
  PROJECT_INDUSTRIES,
  PROJECT_PARTY_ROLES,
  PROJECT_STAGES,
  PROJECT_STATUSES,
} from "@/lib/export-constants";
import { boardFieldsFromNewParty } from "@/lib/export/project-board";
import {
  dispatchAssignmentError,
  extractLeadManagerProjectNumber,
} from "@/lib/export/project-dispatch";
import { blankToNull } from "@/lib/export/blank-to-null";
import { normalizeWebsiteUrl } from "@/lib/website";
import {
  PROJECT_DETAIL_INCLUDE,
  PROJECT_LIST_INCLUDE,
  findProjectBySourceNumber,
  findProjectIdsByPartyPhoneDigits,
  isProjectConfidence,
  isProjectEntryStatus,
  isProjectIndustry,
  isProjectPartyRole,
  isProjectProgressMark,
  isProjectStage,
  isProjectStatus,
  parseOptionalDate,
  projectAssignmentWhere,
  projectKeywordOrClauses,
  projectLifecycleWhere,
  canManageExportProjects,
  denyUnlessCanManageProjects,
  projectListOwnerWhere,
  resolveExportOwnerId,
} from "@/lib/export/projects";
import {
  filterProjectListRowsByParsedFields,
  isProjectListSortBy,
  needsParsedProjectListPass,
  parseOptionalNumber,
  parseScheduleBoundParam,
  sortProjectListRows,
  summarizeEntryCounts,
} from "@/lib/export/project-schedule-value";
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
  const lifecycle = searchParams.get("lifecycle")?.trim();
  const stage = searchParams.get("stage")?.trim();
  const industry = searchParams.get("industry")?.trim();
  const confidence = searchParams.get("confidence")?.trim();
  const country = searchParams.get("country")?.trim();
  const entryStatus = searchParams.get("entryStatus")?.trim();
  const ownerId = searchParams.get("ownerId")?.trim();
  const assignment = searchParams.get("assignment")?.trim();
  const progressMark = searchParams.get("progressMark")?.trim();
  const role = searchParams.get("role")?.trim();
  const sortByRaw = searchParams.get("sortBy") ?? "updatedAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const sortBy = isProjectListSortBy(sortByRaw) ? sortByRaw : "updatedAt";
  const valueMin = parseOptionalNumber(searchParams.get("valueMin"));
  const valueMax = parseOptionalNumber(searchParams.get("valueMax"));
  const scheduleEndFrom = parseScheduleBoundParam(searchParams.get("scheduleEndFrom"), "from");
  const scheduleEndTo = parseScheduleBoundParam(searchParams.get("scheduleEndTo"), "to");
  const parsedPass = needsParsedProjectListPass({
    sortBy,
    valueMin,
    valueMax,
    scheduleEndFrom,
    scheduleEndTo,
  });

  const where: Record<string, unknown> = {
    tenantId: ctx!.tenantId,
    ...projectListOwnerWhere(user!),
    ...projectLifecycleWhere(lifecycle, status),
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
  const assignmentWhere = projectAssignmentWhere(assignment, manageAll);
  if (assignmentWhere) {
    Object.assign(where, assignmentWhere);
  } else if (manageAll) {
    if (matchedOwnerIds) {
      where.ownerId = matchedOwnerIds.length === 1 ? matchedOwnerIds[0] : { in: matchedOwnerIds };
    } else if (ownerId) {
      where.ownerId = ownerId;
    }
  }
  if (progressMark === "unset") where.progressMark = null;
  else if (progressMark && isProjectProgressMark(progressMark)) where.progressMark = progressMark;
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
    const countryRowsPromise = prisma.exportProject.groupBy({
      by: ["country"],
      where: {
        tenantId: ctx!.tenantId,
        ...projectListOwnerWhere(user!),
        AND: [{ country: { not: null } }, { country: { not: "" } }],
      },
    });

    if (!parsedPass) {
      const [data, total, countryRows, entryGroups] = await Promise.all([
        prisma.exportProject.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: PROJECT_LIST_INCLUDE,
        }),
        prisma.exportProject.count({ where }),
        countryRowsPromise,
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
    }

    const [candidates, countryRows] = await Promise.all([
      prisma.exportProject.findMany({
        where: countWhere,
        select: {
          id: true,
          entryStatus: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          status: true,
          bidDeadline: true,
          country: true,
          scheduleEnd: true,
          projectValueText: true,
        },
      }),
      countryRowsPromise,
    ]);

    const ranged = filterProjectListRowsByParsedFields(candidates, {
      valueMin,
      valueMax,
      scheduleEndFrom,
      scheduleEndTo,
    });
    const entryCounts = summarizeEntryCounts(ranged);
    const entryFiltered =
      entryStatus && isProjectEntryStatus(entryStatus)
        ? ranged.filter((row) => row.entryStatus === entryStatus)
        : ranged;
    const sorted = sortProjectListRows(entryFiltered, sortBy, sortOrder);
    const total = sorted.length;
    const pageIds = sorted.slice((page - 1) * pageSize, page * pageSize).map((row) => row.id);
    const unordered =
      pageIds.length === 0
        ? []
        : await prisma.exportProject.findMany({
            where: { tenantId: ctx!.tenantId, id: { in: pageIds } },
            include: PROJECT_LIST_INCLUDE,
          });
    const byId = new Map(unordered.map((row) => [row.id, row]));
    const data = pageIds.map((id) => byId.get(id)).filter((row): row is NonNullable<typeof row> => Boolean(row));

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

const contactSchema = z.object({
  role: z.enum(PROJECT_PARTY_ROLES).optional(),
  companyName: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactTitle: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  roleStatus: z.string().optional().nullable(),
  companyRole: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

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
  sourceProjectNumber: z.string().optional().nullable(),
  knownScope: z.string().optional().nullable(),
  gratingRelatedElements: z.string().optional().nullable(),
  needToVerify: z.string().optional().nullable(),
  askForRole: z.string().optional().nullable(),
  nextStep: z.string().optional().nullable(),
  feedbackDueAt: z.string().optional().nullable(),
  scheduleStatus: z.string().optional().nullable(),
  scheduleStart: z.string().optional().nullable(),
  scheduleEnd: z.string().optional().nullable(),
  tenderDeadline: z.string().optional().nullable(),
  tenderOpening: z.string().optional().nullable(),
  contractorState: z.string().optional().nullable(),
  appointmentMethod: z.string().optional().nullable(),
  projectValueText: z.string().optional().nullable(),
  projectValueOriginal: z.string().optional().nullable(),
  projectStatusRaw: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  siteArea: z.string().optional().nullable(),
  contractorListed: z.string().optional().nullable(),
  demandStatus: z.enum(PROJECT_DEMAND_STATUSES).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  bidDeadline: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  /** 保存草稿不分配；保存并分配必须选业务员。 */
  dispatch: z.enum(["draft", "assign"]).optional(),
  firstContact: contactSchema.optional().nullable(),
  extraParties: z.array(contactSchema).max(40).optional(),
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
    const feedbackDueAt = parseOptionalDate(parsed.data.feedbackDueAt);
    if (parsed.data.feedbackDueAt && feedbackDueAt === undefined) {
      return NextResponse.json({ error: "反馈日期无效" }, { status: 400 });
    }

    const mode = parsed.data.dispatch;
    const resolvedOwner = await resolveExportOwnerId(ctx!.tenantId, parsed.data.ownerId);
    const ownerId = mode === "draft" ? null : (resolvedOwner ?? null);
    const nextStep = blankToNull(parsed.data.nextStep) ?? null;
    const assignmentError = mode ? dispatchAssignmentError({ mode, ownerId }) : null;
    if (assignmentError) {
      return NextResponse.json({ error: assignmentError }, { status: 400 });
    }

    const sourceProjectNumber =
      extractLeadManagerProjectNumber(parsed.data.sourceProjectNumber) ||
      extractLeadManagerProjectNumber(parsed.data.tenderUrl) ||
      null;
    if (sourceProjectNumber) {
      const existing = await findProjectBySourceNumber(ctx!.tenantId, sourceProjectNumber);
      if (existing) {
        return NextResponse.json(
          {
            error: `LM ${sourceProjectNumber} 已经录过`,
            existing: { id: existing.id, name: existing.name },
          },
          { status: 409 },
        );
      }
    }

    const parties: {
      role: (typeof PROJECT_PARTY_ROLES)[number];
      companyName: string;
      contactName: string;
      contactTitle: string;
      email: string;
      phone: string;
      website: string;
      notes: string;
      roleStatus: string;
      companyRole: string;
      address: string;
    }[] = [];
    for (const item of [parsed.data.firstContact, ...(parsed.data.extraParties ?? [])]) {
      if (!item) continue;
      const companyName = item.companyName?.trim() ?? "";
      const contactName = item.contactName?.trim() ?? "";
      const contactTitle = item.contactTitle?.trim() ?? "";
      const email = item.email?.trim() ?? "";
      const phone = item.phone?.trim() ?? "";
      const website = item.website?.trim() ?? "";
      const notes = item.notes?.trim() ?? "";
      const roleStatus = item.roleStatus?.trim() ?? "";
      const companyRole = item.companyRole?.trim() ?? "";
      const address = item.address?.trim() ?? "";
      if (
        !companyName &&
        !contactName &&
        !contactTitle &&
        !email &&
        !phone &&
        !website &&
        !notes &&
        !roleStatus &&
        !companyRole &&
        !address
      ) {
        continue;
      }
      parties.push({
        role: item.role ?? "general_contractor",
        companyName,
        contactName,
        contactTitle,
        email,
        phone,
        website,
        notes,
        roleStatus,
        companyRole,
        address,
      });
    }

    const country = canonicalizeCountry(parsed.data.country ?? "") || parsed.data.country?.trim() || null;
    const tenderUrl = parsed.data.tenderUrl?.trim() || null;
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.exportProject.create({
        data: {
          tenantId: ctx!.tenantId,
          name: parsed.data.name,
          country,
          city: parsed.data.city?.trim() || null,
          location: parsed.data.location?.trim() || null,
          industry: parsed.data.industry || null,
          stage: parsed.data.stage ?? "unknown",
          confidence: parsed.data.confidence ?? "unknown",
          ownerOperator: parsed.data.ownerOperator?.trim() || null,
          generalContractor: parsed.data.generalContractor?.trim() || null,
          potentialBuyers: parsed.data.potentialBuyers?.trim() || null,
          entryStatus:
            parsed.data.entryStatus ?? (mode === "draft" ? "pending" : "entered"),
          productNeed: parsed.data.productNeed?.trim() || null,
          description: parsed.data.description?.trim() || null,
          source: parsed.data.source?.trim() || (sourceProjectNumber ? "LeadManager" : null),
          tenderUrl,
          sourceProjectNumber,
          knownScope: blankToNull(parsed.data.knownScope) ?? null,
          gratingRelatedElements: blankToNull(parsed.data.gratingRelatedElements) ?? null,
          needToVerify: blankToNull(parsed.data.needToVerify) ?? null,
          askForRole: blankToNull(parsed.data.askForRole) ?? null,
          nextStep,
          feedbackDueAt: feedbackDueAt ?? null,
          scheduleStatus: blankToNull(parsed.data.scheduleStatus) ?? null,
          scheduleStart: blankToNull(parsed.data.scheduleStart) ?? null,
          scheduleEnd: blankToNull(parsed.data.scheduleEnd) ?? null,
          tenderDeadline: blankToNull(parsed.data.tenderDeadline) ?? null,
          tenderOpening: blankToNull(parsed.data.tenderOpening) ?? null,
          contractorState: blankToNull(parsed.data.contractorState) ?? null,
          appointmentMethod: blankToNull(parsed.data.appointmentMethod) ?? null,
          projectValueText: blankToNull(parsed.data.projectValueText) ?? null,
          projectValueOriginal: blankToNull(parsed.data.projectValueOriginal) ?? null,
          projectStatusRaw: blankToNull(parsed.data.projectStatusRaw) ?? null,
          region: blankToNull(parsed.data.region) ?? null,
          siteArea: blankToNull(parsed.data.siteArea) ?? null,
          contractorListed: blankToNull(parsed.data.contractorListed) ?? null,
          demandStatus: parsed.data.demandStatus ?? PROJECT_DEMAND_DEFAULT,
          status: parsed.data.status ?? "hunting",
          bidDeadline: bidDeadline ?? null,
          ownerId,
          createdById: user!.id,
          notes: parsed.data.notes?.trim() || null,
        },
      });

      let board = {
        ownerOperator: created.ownerOperator,
        generalContractor: created.generalContractor,
        potentialBuyers: created.potentialBuyers,
      };
      for (const party of parties) {
        await tx.exportProjectParty.create({
          data: {
            tenantId: ctx!.tenantId,
            projectId: created.id,
            role: party.role,
            companyName: party.companyName,
            country,
            website: normalizeWebsiteUrl(party.website),
            contactName: party.contactName || null,
            contactTitle: party.contactTitle || null,
            email: party.email || null,
            phone: party.phone || null,
            notes: party.notes || null,
            roleStatus: party.roleStatus || null,
            companyRole: party.companyRole || null,
            address: party.address || null,
            foundById: user!.id,
          },
        });
        const patch = party.companyName
          ? boardFieldsFromNewParty(board, party.role, party.companyName)
          : {};
        if (Object.keys(patch).length > 0) {
          board = { ...board, ...patch };
          await tx.exportProject.update({
            where: { id: created.id, tenantId: ctx!.tenantId },
            data: patch,
          });
        }
      }

      return tx.exportProject.findUniqueOrThrow({
        where: { id: created.id, tenantId: ctx!.tenantId },
        include: PROJECT_DETAIL_INCLUDE,
      });
    });
    return NextResponse.json({ data: project });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "P2002") {
      return NextResponse.json({ error: "这个 LeadManager 项目号已经录过" }, { status: 409 });
    }
    console.error("Create export project error:", e);
    return NextResponse.json(
      { error: prismaErrorToUserMessage(e, "创建项目失败") },
      { status: 500 },
    );
  }
}
