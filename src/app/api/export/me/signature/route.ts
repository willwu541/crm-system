import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { z } from "zod";

export async function GET() {
  const { user, error } = await requireExportSession();
  if (error) return error;
  const dbUser = await prisma.user.findUnique({
    where: { id: user!.id },
    select: { emailSignature: true },
  });
  return NextResponse.json({ data: { emailSignature: dbUser?.emailSignature ?? "" } });
}

const schema = z.object({
  emailSignature: z.string().max(2000),
});

export async function PATCH(request: NextRequest) {
  const { user, error } = await requireExportSession();
  if (error) return error;
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: user!.id },
      data: { emailSignature: parsed.data.emailSignature || null },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Update signature error:", e);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
