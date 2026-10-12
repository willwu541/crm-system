import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" },
  });
}

const querySchema = z.object({
  entity: z.enum(["customers", "leads", "contacts", "activities"]).default("customers"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().min(1).max(128).optional(),
  updatedSince: z.iso.datetime({ offset: true }).optional(),
});

/** Dedicated bearer credential; no cookie, query-string credential or write access. */
export async function GET(request: NextRequest) {
  const expected = process.env.CRM_READONLY_API_KEY?.trim();
  const tenantSlug = process.env.CRM_READONLY_TENANT_SLUG?.trim();
  if (!expected || expected.length < 32 || !tenantSlug) {
    return json({ error: "只读接口未启用" }, 503);
  }
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!supplied || !timingSafeEqual(digest(supplied), digest(expected))) {
    return json({ error: "访问密钥无效" }, 401);
  }
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return json({ error: "查询参数无效" }, 400);

  try {
    const tenant = await prisma.exportTenant.findUnique({
      where: { slug: tenantSlug }, select: { id: true },
    });
    if (!tenant) return json({ error: "只读数据范围未配置正确" }, 503);
    const { entity, limit, cursor, updatedSince } = parsed.data;
    const where = {
      tenantId: tenant.id,
      ...(cursor ? { id: { gt: cursor } } : {}),
      ...(updatedSince ? { updatedAt: { gte: new Date(updatedSince) } } : {}),
    };
    const options = { where, take: limit + 1, orderBy: { id: "asc" as const } };
    // Explicit field allowlists prevent accidental exposure of new sensitive columns.
    const rows = entity === "customers"
      ? await prisma.exportCustomer.findMany({ ...options, select: {
        id: true, customerCode: true, companyName: true, website: true,
        country: true, city: true, customerType: true, industry: true,
        interestedProducts: true, sourceChannel: true, ownerId: true,
        status: true, fitEvidence: true, lastOutcome: true, lostReason: true,
        lastFollowUpAt: true, nextFollowUpAt: true, createdAt: true, updatedAt: true,
      } })
      : entity === "leads"
        ? await prisma.exportLead.findMany({ ...options, select: {
          id: true, companyName: true, website: true, country: true, city: true,
          customerType: true, sourceChannel: true, email: true, phone: true,
          whatsapp: true, linkedin: true, mainBusiness: true, productInterest: true,
          fitEvidence: true, lastOutcome: true, ownerId: true, status: true,
          lastContactAt: true, nextFollowUpAt: true, contactCount: true,
          isDuplicate: true, duplicateReason: true, convertedToCustomerId: true,
          createdAt: true, updatedAt: true,
        } })
        : entity === "contacts"
          ? await prisma.exportContact.findMany({ ...options, select: {
            id: true, customerId: true, name: true, title: true, email: true,
            phone: true, whatsapp: true, linkedin: true, language: true,
            isPrimary: true, createdAt: true, updatedAt: true,
          } })
          : await prisma.exportActivity.findMany({ ...options, select: {
            id: true, customerId: true, leadId: true, contactId: true,
            ownerId: true, type: true, direction: true, subject: true,
            content: true, customerFeedback: true, outcome: true,
            nextFollowUpAt: true, createdAt: true, updatedAt: true,
          } });
    const data = rows.slice(0, limit);
    return json({
      readonly: true, entity, data,
      pagination: { limit, hasMore: rows.length > limit,
        nextCursor: rows.length > limit ? data[data.length - 1].id : null },
    });
  } catch {
    return json({ error: "读取失败，请稍后重试" }, 500);
  }
}

function rejectWrite() {
  return NextResponse.json({ error: "此接口仅允许只读查询" }, {
    status: 405, headers: { Allow: "GET", "Cache-Control": "no-store" },
  });
}

export const POST = rejectWrite;
export const PUT = rejectWrite;
export const PATCH = rejectWrite;
export const DELETE = rejectWrite;
