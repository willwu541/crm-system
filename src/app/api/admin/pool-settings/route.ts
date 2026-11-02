import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPoolSettings, savePoolSettings } from "@/lib/domestic/pool-config";
import { z } from "zod";

export async function GET() {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const settings = await getPoolSettings();
  return NextResponse.json({ data: settings });
}

const updateSchema = z.object({
  leadDays: z.number().int().min(7).max(365),
  customerDays: z.number().int().min(7).max(365),
});

export async function PATCH(request: NextRequest) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    return NextResponse.json({ error: "仅管理员可修改公海规则" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
    }

    const settings = await savePoolSettings(parsed.data);
    return NextResponse.json({ data: settings });
  } catch (e) {
    console.error("Save pool settings error:", e);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
