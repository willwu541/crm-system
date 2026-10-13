export function getWebsiteBridge() {
  const chatUrl = process.env.WEBSITE_CHAT_API_URL?.trim() ?? "";
  const bridgeKey = process.env.WEBSITE_CHAT_API_KEY?.trim() ?? "";
  const formsUrl =
    process.env.WEBSITE_FORMS_API_URL?.trim() ||
    chatUrl.replace(/chat\.php$/i, "rfq-admin.php");
  return {
    chatUrl,
    formsUrl,
    bridgeKey,
    configured: Boolean(chatUrl && bridgeKey && formsUrl),
  };
}

export async function websiteBridgePost(
  url: string,
  bridgeKey: string,
  payload: Record<string, unknown>,
) {
  const upstream = await fetch(url, {
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
  const data = (await upstream.json().catch(() => ({
    ok: false,
    message: "网站返回了无效数据。",
  }))) as Record<string, unknown>;
  return { status: upstream.status, data };
}
