import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerOwnerFilter } from "@/lib/domestic/customer-access";
import { analyzeCallRecording, isAiConfigured } from "@/lib/domestic/ai-analysis";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (!isAiConfigured()) {
    return NextResponse.json({ error: "未配置 OPENAI_API_KEY" }, { status: 400 });
  }

  const { id } = await params;
  const recording = await prisma.callRecording.findFirst({
    where: { id },
    include: { customer: true },
  });

  if (!recording) {
    return NextResponse.json({ error: "录音不存在" }, { status: 404 });
  }

  const allowed = await prisma.customer.findFirst({
    where: { id: recording.customerId, ...customerOwnerFilter(user) },
  });
  if (!allowed) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  await prisma.callRecording.update({
    where: { id },
    data: { analysisStatus: "PROCESSING", analysisError: null },
  });

  try {
    const result = await analyzeCallRecording(
      recording.filePath,
      recording.mimeType,
      recording.customer.name
    );
    const updated = await prisma.callRecording.update({
      where: { id },
      data: {
        transcript: result.transcript,
        summary: result.summary,
        customerIntent: result.customerIntent,
        keyPoints: result.keyPoints,
        suggestedFollowUp: result.suggestedFollowUp,
        sentiment: result.sentiment,
        analysisStatus: "COMPLETED",
        analysisError: null,
      },
    });
    return NextResponse.json({ data: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI 分析失败";
    const updated = await prisma.callRecording.update({
      where: { id },
      data: { analysisStatus: "FAILED", analysisError: msg },
    });
    return NextResponse.json({ error: msg, data: updated }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const recording = await prisma.callRecording.findFirst({
    where: { id },
    include: { customer: true },
  });
  if (!recording) {
    return NextResponse.json({ error: "录音不存在" }, { status: 404 });
  }

  const allowed = await prisma.customer.findFirst({
    where: { id: recording.customerId, ...customerOwnerFilter(user) },
  });
  if (!allowed) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  await prisma.callRecording.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
