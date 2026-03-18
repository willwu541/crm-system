import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const keyword = request.nextUrl.searchParams.get("keyword")?.trim();
  const where = keyword
    ? {
        OR: [
          { name: { contains: keyword, mode: "insensitive" as const } },
          { contactName: { contains: keyword, mode: "insensitive" as const } },
          { contactPhone: { contains: keyword, mode: "insensitive" as const } },
        ],
      }
    : {};

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: suppliers });
}

const createSchema = z.object({
  name: z.string().min(1, "加工户名称必填"),
  contactName: z.string().min(1, "联系人必填"),
  contactPhone: z.string().min(1, "联系电话必填"),
  address: z.string().optional(),
  remark: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "参数错误";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: parsed.data.name.trim(),
        contactName: parsed.data.contactName.trim(),
        contactPhone: parsed.data.contactPhone.trim(),
        address: parsed.data.address?.trim() || null,
        remark: parsed.data.remark?.trim() || null,
      },
    });
    return NextResponse.json({ data: supplier });
  } catch (e) {
    console.error("Create supplier error:", e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
