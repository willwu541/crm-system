import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

export async function GET() {
  const user = await getSession();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      tenant: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: users });
}

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "密码至少6位"),
  name: z.string().min(1, "姓名必填"),
  role: z.enum(["ADMIN", "MANAGER", "SALES"]),
  tenant: z.enum(["domestic", "export"]),
});

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "参数错误" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json({ error: "邮箱已存在" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    let tenantId: string | undefined;
    if (parsed.data.tenant === "export") {
      const tenant = await prisma.exportTenant.findUnique({
        where: { slug: "default" },
      });
      tenantId = tenant?.id;
    }
    const newUser = await prisma.user.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        passwordHash,
        name: parsed.data.name,
        role: parsed.data.role,
        tenant: parsed.data.tenant,
        tenantId,
      },
      select: { id: true, email: true, name: true, role: true, isActive: true, tenant: true, tenantId: true },
    });

    return NextResponse.json({ data: newUser });
  } catch (e) {
    console.error("Create user error:", e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
