import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerOwnerFilter } from "@/lib/domestic/customer-access";
import { analyzeCallRecording, isAiConfigured } from "@/lib/domestic/ai-analysis";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id: customerId } = await params;
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, ...customerOwnerFilter(user) },
  });
  if (!customer) {
    return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  }

  const recordings = await prisma.callRecording.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { name: true } } },
  });

  return NextResponse.json({ data: recordings, aiConfigured: isAiConfigured() });
}

const createSchema = z.object({
  fileName: z.string().min(1),
  filePath: z.string().min(1),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1),
  title: z.string().optional(),
  orderId: z.string().optional(),
  runAnalysis: z.boolean().optional(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id: customerId } = await params;
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, ...customerOwnerFilter(user) },
  });
  if (!customer) {
    return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
    }

    const data = parsed.data;
    const shouldAnalyze = data.runAnalysis !== false && isAiConfigured();

    let recording = await prisma.callRecording.create({
      data: {
        customerId,
        orderId: data.orderId || null,
        title: data.title?.trim() || data.fileName,
        fileName: data.fileName,
        filePath: data.filePath,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        analysisStatus: shouldAnalyze ? "PROCESSING" : isAiConfigured() ? "PENDING" : "FAILED",
        analysisError: isAiConfigured() ? null : "未配置 OPENAI_API_KEY，请先在 .env 中配置后重试分析",
        uploadedById: user.id,
      },
    });

    await prisma.customer.update({
      where: { id: customerId },
      data: { lastContactAt: new Date(), status: "ACTIVE" },
    });

    if (shouldAnalyze) {
      try {
        const result = await analyzeCallRecording(data.filePath, data.mimeType, customer.name);
        recording = await prisma.callRecording.update({
          where: { id: recording.id },
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
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI 分析失败";
        recording = await prisma.callRecording.update({
          where: { id: recording.id },
          data: { analysisStatus: "FAILED", analysisError: msg },
        });
      }
    }

    return NextResponse.json({ data: recording });
  } catch (e) {
    console.error("Create recording error:", e);
    return NextResponse.json({ error: "保存录音失败" }, { status: 500 });
  }
}
