import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";

function getBaseUrl(request: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`.replace(/\/$/, "");
  return request.nextUrl.origin;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id: orderId } = await params;

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      ...(user.role === "SALES" ? { createdById: user.id } : {}),
    },
  });
  if (!order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  const links = await prisma.quoteLink.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });

  const baseUrl = getBaseUrl(request);
  const data = links.map((l) => ({ ...l, quoteUrl: `${baseUrl}/quote/${l.token}` }));

  return NextResponse.json({ data });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id: orderId } = await params;

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      ...(user.role === "SALES" ? { createdById: user.id } : {}),
    },
  });
  if (!order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { supplierName, expiresInDays } = body;

    let expiresAt: Date | null = null;
    if (expiresInDays && typeof expiresInDays === "number" && expiresInDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() + expiresInDays);
      expiresAt = d;
    }

    const token = generateToken();
    const link = await prisma.quoteLink.create({
      data: {
        orderId,
        token,
        supplierName: supplierName?.trim() || null,
        expiresAt,
      },
    });

    const baseUrl = getBaseUrl(request);
    const quoteUrl = `${baseUrl}/quote/${token}`;

    return NextResponse.json({
      data: { ...link, quoteUrl },
    });
  } catch (e) {
    console.error("Create quote link error:", e);
    return NextResponse.json({ error: "生成链接失败" }, { status: 500 });
  }
}
