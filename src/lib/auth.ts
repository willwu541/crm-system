import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 天

export type Tenant = "domestic" | "export";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "SALES";
  tenant: Tenant;
  /** 当 tenant=export 时必填，指向 ExportTenant */
  tenantId?: string;
}

export async function login(
  email: string,
  password: string,
  tenant: Tenant
): Promise<SessionUser | null> {
  const emailNorm = email?.trim()?.toLowerCase();
  if (!emailNorm) return null;

  const user = await prisma.user.findFirst({
    where: { email: emailNorm },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tenant: true,
      tenantId: true,
      isActive: true,
      passwordHash: true,
    },
  });
  if (!user) return null;
  if (!user.isActive) return null;

  if (user.tenant !== tenant) return null;

  try {
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
  } catch {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenant: user.tenant as Tenant,
    tenantId: user.tenantId ?? undefined,
  };
}

export async function setSession(user: SessionUser): Promise<void> {
  const cookieStore = await cookies();
  const payload = JSON.stringify({
    ...user,
    expires: Date.now() + SESSION_MAX_AGE * 1000,
  });
  cookieStore.set(SESSION_COOKIE, Buffer.from(payload).toString("base64"), {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    const payload = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
    if (payload.expires && payload.expires < Date.now()) return null;
    const cookieUser = payload as SessionUser;
    if (!cookieUser.tenant) cookieUser.tenant = "domestic";

    // 每次取会话都校验账号是否仍然可用（防止被停用后仍可访问）
    const dbUser = await prisma.user.findUnique({
      where: { id: cookieUser.id },
      select: { id: true, email: true, name: true, role: true, tenant: true, tenantId: true, isActive: true },
    });
    if (!dbUser || !dbUser.isActive) return null;

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      tenant: dbUser.tenant as Tenant,
      tenantId: dbUser.tenantId ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
