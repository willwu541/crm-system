import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 天

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "SALES";
}

export async function login(email: string, password: string): Promise<SessionUser | null> {
  const emailNorm = email?.trim()?.toLowerCase();
  if (!emailNorm) return null;

  const user = await prisma.user.findFirst({
    where: { email: emailNorm },
  });
  if (!user) return null;

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
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
    secure: process.env.NODE_ENV === "production",
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
    return payload as SessionUser;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
