"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { parseResponseJson } from "@/lib/parse-response-json";

/**
 * 个人邮件签名编辑卡片，用于模板页右上。
 * 签名会通过 {{user.signature}} 自动渲染到邮件模板。
 */
export function SignatureCard() {
  const { toast } = useToast();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/export/me/signature");
        const json = await parseResponseJson<{ data?: { emailSignature: string } }>(r);
        if (json.data) setValue(json.data.emailSignature ?? "");
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const r = await fetch("/api/export/me/signature", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailSignature: value }),
      });
      const json = await parseResponseJson<{ error?: string }>(r);
      if (!r.ok) throw new Error(json.error ?? "保存失败");
      toast("签名已保存");
    } catch (e) {
      toast(e instanceof Error ? e.message : "保存失败", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-700">我的邮件签名</h3>
          <p className="text-xs text-slate-500">
            模板里 <code className="rounded bg-slate-100 px-1">{`{{user.signature}}`}</code>{" "}
            会替换为这里的内容
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-xs text-teal-600 hover:underline"
        >
          {open ? "收起" : "编辑"}
        </button>
      </div>
      {open && (
        <div className="mt-3 space-y-2">
          {loading ? (
            <div className="text-xs text-slate-400">加载中...</div>
          ) : (
            <>
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={6}
                placeholder={`如：\n--\nDavid Wang | Sales Manager\nMobile/WhatsApp: +86 138-xxxx-xxxx\nEmail: david@example.com\nABC Steel Grating Co., Ltd.`}
                className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存签名"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
