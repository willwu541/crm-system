import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAssignExportWork } from "@/lib/export/lead-pool";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  return NextResponse.json({
    user: { ...user, canAssign: canAssignExportWork(user) },
  });
}
