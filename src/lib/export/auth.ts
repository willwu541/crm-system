import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ExportContext } from "./types";

const DEFAULT_TENANT_SLUG = "default";

export async function requireExportSession(): Promise<
  | { user: Awaited<ReturnType<typeof getSession>>; ctx: ExportContext; error: null }
  | { user: null; ctx: null; error: NextResponse }
> {
  const user = await getSession();
  if (!user) {
    return {
      user: null,
      ctx: null,
      error: NextResponse.json({ error: "未登录" }, { status: 401 }),
    };
  }
  if (user.tenant !== "export") {
    return {
      user: null,
      ctx: null,
      error: NextResponse.json({ error: "无权限访问外贸系统" }, { status: 403 }),
    };
  }

  let tenantId = user.tenantId;
  if (!tenantId) {
    const tenant = await prisma.exportTenant.findUnique({
      where: { slug: DEFAULT_TENANT_SLUG },
    });
    tenantId = tenant?.id ?? "";
  }
  if (!tenantId) {
    return {
      user: null,
      ctx: null,
      error: NextResponse.json({ error: "未配置租户" }, { status: 403 }),
    };
  }

  const ctx: ExportContext = {
    tenantId,
    userId: user.id,
    ownerFilter: user.role === "SALES" ? { ownerId: user.id } : undefined,
  };

  return { user, ctx, error: null };
}

export function getExportContext(user: NonNullable<Awaited<ReturnType<typeof getSession>>>, tenantId: string): ExportContext {
  return {
    tenantId,
    userId: user.id,
    ownerFilter: user.role === "SALES" ? { ownerId: user.id } : undefined,
  };
}
