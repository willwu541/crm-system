import { NextRequest, NextResponse } from "next/server";
import { requireExportSession } from "@/lib/export/auth";

const ACTION_MAP = {
  list: "admin_list",
  get: "admin_get",
  reply: "admin_reply",
  status: "admin_status",
} as const;

type LiveChatAction = keyof typeof ACTION_MAP;

export async function POST(request: NextRequest) {
  const { error } = await requireExportSession();
  if (error) return error;

  const apiUrl = process.env.WEBSITE_CHAT_API_URL?.trim();
  const bridgeKey = process.env.WEBSITE_CHAT_API_KEY?.trim();
  if (!apiUrl || !bridgeKey) {
    return NextResponse.json(
      { ok: false, message: "网站客服连接尚未配置，请联系管理员。" },
      { status: 503 },
    );
  }

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "请求内容无效。" }, { status: 400 });
  }

  const actionRaw = typeof input.action === "string" ? input.action : "";
  if (!(actionRaw in ACTION_MAP)) {
    return NextResponse.json({ ok: false, message: "不支持的操作。" }, { status: 400 });
  }
  const action = actionRaw as LiveChatAction;

  const payload: Record<string, unknown> = { action: ACTION_MAP[action] };
  if (typeof input.id === "string") payload.id = input.id;
  if (typeof input.message === "string") payload.message = input.message;
  if (input.status === "open" || input.status === "closed") payload.status = input.status;

  try {
    const upstream = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CRM-Chat-Key": bridgeKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const data = await upstream.json().catch(() => ({
      ok: false,
      message: "网站客服返回了无效数据。",
    }));
    return NextResponse.json(data, { status: upstream.status });
  } catch (cause) {
    console.error("Website live chat proxy error:", cause);
    return NextResponse.json(
      { ok: false, message: "暂时无法连接网站客服，请稍后重试。" },
      { status: 502 },
    );
  }
}
