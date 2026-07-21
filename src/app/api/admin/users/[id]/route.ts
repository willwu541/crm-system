import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdminOrManager() {
  const me = await getSession();
  if (!me || (me.role !== "ADMIN" && me.role !== "MANAGER")) {
    return { me: null, error: NextResponse.json({ error: "无权限" }, { status: 403 }) };
  }
  return { me, error: null };
}

const updateSchema = z.object({
  name: z.string().min(1, "姓名必填").optional(),
  role: z.enum(["ADMIN", "MANAGER", "SALES"]).optional(),
  tenant: z.enum(["domestic", "export"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6, "密码至少6位").optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { me, error } = await requireAdminOrManager();
  if (error) return error;

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "参数错误" },
        { status: 400 },
      );
    }

    if (parsed.data.role === "ADMIN" && target.role !== "ADMIN") {
      // pass
    }
    if (parsed.data.role === "SALES" && target.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "系统至少保留 1 个管理员" }, { status: 400 });
      }
      if (target.id === me!.id) {
        return NextResponse.json({ error: "不能把当前登录管理员降级为业务员" }, { status: 400 });
      }
    }
    if (parsed.data.isActive === false && target.id === me!.id) {
      return NextResponse.json({ error: "不能停用当前登录账号" }, { status: 400 });
    }
    if (
      target.role === "ADMIN" &&
      target.isActive &&
      parsed.data.isActive === false
    ) {
      const activeAdminCount = await prisma.user.count({
        where: { role: "ADMIN", isActive: true },
      });
      if (activeAdminCount <= 1) {
        return NextResponse.json({ error: "系统至少保留 1 个启用中的管理员" }, { status: 400 });
      }
    }

    let tenantId: string | null | undefined = undefined;
    if (parsed.data.tenant !== undefined) {
      if (parsed.data.tenant === "export") {
        const tenant = await prisma.exportTenant.findUnique({ where: { slug: "default" } });
        tenantId = tenant?.id ?? null;
      } else {
        tenantId = null;
      }
    }

    let passwordHash: string | undefined;
    if (parsed.data.password) {
      passwordHash = await bcrypt.hash(parsed.data.password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
        ...(parsed.data.tenant !== undefined ? { tenant: parsed.data.tenant } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        ...(tenantId !== undefined ? { tenantId } : {}),
        ...(passwordHash ? { passwordHash } : {}),
      },
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

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("Update user error:", e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { me, error } = await requireAdminOrManager();
  if (error) return error;

  const { id } = await params;
  if (id === me!.id) {
    return NextResponse.json({ error: "不能删除当前登录账号" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  if (target.role === "ADMIN" && target.isActive) {
    const activeAdminCount = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
    if (activeAdminCount <= 1) {
      return NextResponse.json({ error: "系统至少保留 1 个启用中的管理员" }, { status: 400 });
    }
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Delete user error:", e);
    return NextResponse.json(
      { error: "该用户存在关联数据，无法删除。可先改为停用账号（后续可加）" },
      { status: 400 },
    );
  }
}

