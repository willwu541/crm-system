import { NextRequest, NextResponse } from "next/server";
import { requireExportSession } from "@/lib/export/auth";
import { getWebsiteBridge, websiteBridgePost } from "@/lib/export/website-bridge";

export async function POST(request: NextRequest) {
  const { error } = await requireExportSession();
  if (error) return error;

  const { visitsUrl, bridgeKey, configured } = getWebsiteBridge();
  if (!configured || !visitsUrl || !bridgeKey) {
    return NextResponse.json(
      { ok: false, message: "网站访客连接尚未配置，请联系管理员。" },
      { status: 503 },
    );
  }

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "请求内容无效。" }, { status: 400 });
  }

  if (input.action !== "list") {
    return NextResponse.json({ ok: false, message: "不支持的操作。" }, { status: 400 });
  }

  try {
    const { status, data } = await websiteBridgePost(visitsUrl, bridgeKey, {
      action: "admin_list",
    });
    return NextResponse.json(data, { status });
  } catch (cause) {
    console.error("Website visits proxy error:", cause);
    return NextResponse.json(
      { ok: false, message: "暂时无法连接网站访客记录，请稍后重试。" },
      { status: 502 },
    );
  }
}
