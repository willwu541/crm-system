import { NextRequest, NextResponse } from "next/server";
import { requireExportSession } from "@/lib/export/auth";
import { getWebsiteBridge, websiteBridgePost } from "@/lib/export/website-bridge";

const ACTION_MAP = {
  list: "admin_list",
  get: "admin_get",
  status: "admin_status",
} as const;

type FormAction = keyof typeof ACTION_MAP;

export async function POST(request: NextRequest) {
  const { error } = await requireExportSession();
  if (error) return error;

  const { formsUrl, bridgeKey, configured } = getWebsiteBridge();
  if (!configured || !formsUrl || !bridgeKey) {
    return NextResponse.json(
      { ok: false, message: "官网表单连接尚未配置，请联系管理员。" },
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
  const action = actionRaw as FormAction;

  const payload: Record<string, unknown> = { action: ACTION_MAP[action] };
  if (typeof input.id === "string") payload.id = input.id;
  if (input.status === "open" || input.status === "closed") payload.status = input.status;

  try {
    const { status, data } = await websiteBridgePost(formsUrl, bridgeKey, payload);
    return NextResponse.json(data, { status });
  } catch (cause) {
    console.error("Website forms proxy error:", cause);
    return NextResponse.json(
      { ok: false, message: "暂时无法连接官网表单，请稍后重试。" },
      { status: 502 },
    );
  }
}
