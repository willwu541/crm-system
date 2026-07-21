"use client";

import { useState } from "react";
import {
  ANALYSIS_STATUS_LABELS,
  SENTIMENT_LABELS,
} from "@/lib/domestic/customer-access";

export interface RecordingItem {
  id: string;
  title: string | null;
  fileName: string;
  filePath: string;
  fileSize: number;
  analysisStatus: string;
  analysisError: string | null;
  summary: string | null;
  customerIntent: string | null;
  keyPoints: string[];
  suggestedFollowUp: string | null;
  sentiment: string | null;
  transcript: string | null;
  createdAt: string;
  uploadedBy?: { name: string };
}

export function RecordingUpload({
  customerId,
  aiConfigured,
  onUploaded,
}: {
  customerId: string;
  aiConfigured: boolean;
  onUploaded: (recording: RecordingItem) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("customerId", customerId);

      const uploadRes = await fetch("/api/recordings/upload", { method: "POST", body: formData });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) {
        setError(uploadJson.error || "上传失败");
        return;
      }

      const saveRes = await fetch(`/api/customers/${customerId}/recordings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...uploadJson,
          title: title.trim() || file.name,
          runAnalysis: aiConfigured,
        }),
      });
      const saveJson = await saveRes.json();
      if (!saveRes.ok) {
        setError(saveJson.error || "保存录音失败");
        return;
      }

      onUploaded(saveJson.data);
      setTitle("");
      e.target.value = "";
    } catch {
      setError("上传失败，请重试");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <h3 className="font-medium text-slate-800">上传通话录音</h3>
      {!aiConfigured && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded px-3 py-2">
          未配置 AI 密钥，录音可上传但无法自动分析。请在 .env 中设置 OPENAI_API_KEY 后重试分析。
        </p>
      )}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="录音标题（可选）"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <label className="flex cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-slate-300 px-4 py-6 text-sm text-slate-600 hover:border-teal-400 hover:bg-teal-50/50">
        <input
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.amr"
          className="hidden"
          disabled={uploading}
          onChange={handleFile}
        />
        {uploading ? "上传并分析中，请稍候..." : "点击选择录音文件（mp3/wav/m4a/amr，最大 100MB）"}
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function RecordingPanel({
  customerId,
  recordings,
  aiConfigured,
}: {
  customerId: string;
  recordings: RecordingItem[];
  aiConfigured: boolean;
}) {
  return (
    <RecordingList
      customerId={customerId}
      recordings={recordings}
      aiConfigured={aiConfigured}
    />
  );
}

export function RecordingList({
  customerId,
  recordings: initial,
  aiConfigured,
}: {
  customerId: string;
  recordings: RecordingItem[];
  aiConfigured: boolean;
}) {
  const [recordings, setRecordings] = useState(initial);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  async function retryAnalysis(id: string) {
    setRetryingId(id);
    try {
      const res = await fetch(`/api/recordings/${id}`, { method: "POST" });
      const json = await res.json();
      if (json.data) {
        setRecordings((list) => list.map((r) => (r.id === id ? { ...r, ...json.data } : r)));
      }
    } finally {
      setRetryingId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("确定删除这条录音？")) return;
    const res = await fetch(`/api/recordings/${id}`, { method: "DELETE" });
    if (res.ok) setRecordings((list) => list.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-4">
      <RecordingUpload
        customerId={customerId}
        aiConfigured={aiConfigured}
        onUploaded={(r) => setRecordings((list) => [r, ...list])}
      />

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 font-medium text-slate-800">
          录音记录 ({recordings.length})
        </div>
        {recordings.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">暂无录音，上传后将自动进行 AI 分析</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recordings.map((r) => (
              <li key={r.id} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-slate-800">{r.title || r.fileName}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {new Date(r.createdAt).toLocaleString("zh-CN")}
                      {r.uploadedBy ? ` · ${r.uploadedBy.name}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {ANALYSIS_STATUS_LABELS[r.analysisStatus] ?? r.analysisStatus}
                    </span>
                    {r.sentiment && (
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                        {SENTIMENT_LABELS[r.sentiment] ?? r.sentiment}
                      </span>
                    )}
                    <a href={r.filePath} target="_blank" rel="noreferrer" className="text-xs text-teal-600 hover:underline">
                      播放
                    </a>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                      className="text-xs text-slate-600 hover:text-teal-600"
                    >
                      {expandedId === r.id ? "收起" : "详情"}
                    </button>
                    {(r.analysisStatus === "FAILED" || r.analysisStatus === "PENDING") && aiConfigured && (
                      <button
                        type="button"
                        disabled={retryingId === r.id}
                        onClick={() => retryAnalysis(r.id)}
                        className="text-xs text-amber-700 hover:underline disabled:opacity-50"
                      >
                        {retryingId === r.id ? "分析中..." : "重新分析"}
                      </button>
                    )}
                    <button type="button" onClick={() => remove(r.id)} className="text-xs text-red-600 hover:underline">
                      删除
                    </button>
                  </div>
                </div>

                {r.summary && (
                  <p className="mt-2 text-sm text-slate-700">
                    <span className="font-medium">摘要：</span>
                    {r.summary}
                  </p>
                )}
                {r.customerIntent && (
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-medium">客户意向：</span>
                    {r.customerIntent}
                  </p>
                )}

                {expandedId === r.id && (
                  <div className="mt-3 space-y-2 rounded-md bg-slate-50 p-3 text-sm">
                    {r.keyPoints?.length > 0 && (
                      <div>
                        <div className="font-medium text-slate-700">关键要点</div>
                        <ul className="mt-1 list-disc pl-5 text-slate-600">
                          {r.keyPoints.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {r.suggestedFollowUp && (
                      <div>
                        <div className="font-medium text-slate-700">跟进建议</div>
                        <p className="mt-1 text-slate-600">{r.suggestedFollowUp}</p>
                      </div>
                    )}
                    {r.transcript && (
                      <div>
                        <div className="font-medium text-slate-700">通话转写</div>
                        <p className="mt-1 whitespace-pre-wrap text-slate-600">{r.transcript}</p>
                      </div>
                    )}
                    {r.analysisError && (
                      <p className="text-red-600">分析错误：{r.analysisError}</p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
