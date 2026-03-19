import { NextRequest, NextResponse } from "next/server";
import { login, setSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  tenant: z.enum(["domestic", "export"]),
  email: z.string().email("请输入有效邮箱"),
  password: z.string().min(1, "请输入密码"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "参数错误" },
        { status: 400 }
      );
    }

    const user = await login(parsed.data.email, parsed.data.password, parsed.data.tenant);
    if (!user) {
      return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
    }

    await setSession(user);
    return NextResponse.json({ user });
  } catch (e) {
    console.error("Login error:", e);
    const msg =
      process.env.NODE_ENV === "development" && e instanceof Error
        ? e.message.includes("ECONNREFUSED")
          ? "数据库连接失败，请确认 PostgreSQL 已启动且 DATABASE_URL 正确"
          : e.message
        : "登录失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
