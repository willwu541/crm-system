import { readFile } from "fs/promises";
import path from "path";

export interface RecordingAnalysisResult {
  transcript: string;
  summary: string;
  customerIntent: string;
  keyPoints: string[];
  suggestedFollowUp: string;
  sentiment: "positive" | "neutral" | "negative";
}

function getAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_ANALYSIS_MODEL?.trim() || "gpt-4o-mini";
  const whisperModel = process.env.AI_WHISPER_MODEL?.trim() || "whisper-1";
  return { apiKey, baseUrl, model, whisperModel };
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

async function transcribeAudio(filePath: string, mimeType: string): Promise<string> {
  const { apiKey, baseUrl, whisperModel } = getAiConfig();
  if (!apiKey) {
    throw new Error("未配置 OPENAI_API_KEY，无法进行语音转写");
  }

  const absPath = filePath.startsWith("/")
    ? path.join(process.cwd(), "public", filePath.slice(1))
    : filePath;

  const buffer = await readFile(absPath);
  const ext = path.extname(absPath).slice(1) || "mp3";
  const blob = new Blob([buffer], { type: mimeType || "audio/mpeg" });
  const form = new FormData();
  form.append("file", blob, `recording.${ext}`);
  form.append("model", whisperModel);
  form.append("language", "zh");

  const res = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`语音转写失败: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as { text?: string };
  if (!data.text?.trim()) {
    throw new Error("语音转写结果为空，请检查录音文件");
  }
  return data.text.trim();
}

async function analyzeTranscript(transcript: string, customerName: string): Promise<RecordingAnalysisResult> {
  const { apiKey, baseUrl, model } = getAiConfig();
  if (!apiKey) {
    throw new Error("未配置 OPENAI_API_KEY，无法进行 AI 分析");
  }

  const systemPrompt = `你是钢格板内贸 CRM 的销售通话分析助手。根据通话转写文本，输出 JSON：
{
  "summary": "2-4 句通话摘要",
  "customerIntent": "客户意向：高/中/低，并简述原因",
  "keyPoints": ["要点1", "要点2", "要点3"],
  "suggestedFollowUp": "具体可执行的下一步跟进建议（含私域触达话术要点）",
  "sentiment": "positive|neutral|negative"
}
只返回 JSON，不要 markdown。`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `客户名称：${customerName}\n\n通话转写：\n${transcript}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI 分析失败: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("AI 分析返回为空");
  }

  let parsed: Partial<RecordingAnalysisResult>;
  try {
    parsed = JSON.parse(content) as Partial<RecordingAnalysisResult>;
  } catch {
    throw new Error("AI 分析结果解析失败");
  }

  const sentiment = parsed.sentiment;
  const normalizedSentiment =
    sentiment === "positive" || sentiment === "negative" ? sentiment : "neutral";

  return {
    transcript,
    summary: parsed.summary?.trim() || "暂无摘要",
    customerIntent: parsed.customerIntent?.trim() || "未识别",
    keyPoints: Array.isArray(parsed.keyPoints)
      ? parsed.keyPoints.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
      : [],
    suggestedFollowUp: parsed.suggestedFollowUp?.trim() || "建议 3 天内电话或微信跟进确认需求。",
    sentiment: normalizedSentiment,
  };
}

export async function analyzeCallRecording(
  filePath: string,
  mimeType: string,
  customerName: string
): Promise<RecordingAnalysisResult> {
  const transcript = await transcribeAudio(filePath, mimeType);
  return analyzeTranscript(transcript, customerName);
}
