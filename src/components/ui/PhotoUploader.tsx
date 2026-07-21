"use client";

import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { parseResponseJson } from "@/lib/parse-response-json";

interface Props {
  entityType: "lead" | "customer";
  entityId: string;
  onUploaded?: () => void;
}

const IS_IMAGE = /^image\//;

export function PhotoUploader({ entityType, entityId, onUploaded }: Props) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("entityType", entityType);
        fd.append("entityId", entityId);

        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const j = await parseResponseJson<{ error?: string }>(res);
          throw new Error(j.error ?? "上传失败");
        }
      }
      toast("上传成功");
      onUploaded?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }, [entityType, entityId, toast, onUploaded]);

  return (
    <label className={`inline-flex items-center gap-1 rounded-md ${uploading ? "bg-slate-300 cursor-wait" : "bg-amber-600 hover:bg-amber-700 cursor-pointer"} px-3 py-1.5 text-sm text-white transition-colors`}>
      {uploading ? "上传中..." : "📷 上传照片/图纸"}
      <input type="file" accept="image/*,.pdf,.dwg,.dxf" multiple onChange={handleFile} className="hidden" disabled={uploading} />
    </label>
  );
}

export function FileAttachmentList({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadFiles() {
      setLoading(true);
      try {
        const res = await fetch(`/api/files?entityType=${entityType}&entityId=${entityId}`);
        const json = await parseResponseJson<{ data: any[] }>(res);
        if (!cancelled && res.ok) setFiles(json.data || []);
      } finally { if (!cancelled) setLoading(false); }
    }
    loadFiles();
    return () => { cancelled = true; };
  }, [entityType, entityId, key]);

  // 暴露刷新方法
  useEffect(() => {
    (window as any).__refreshAttachments = () => setKey(k => k + 1);
  }, []);

  if (loading) return <div className="text-xs text-slate-400">加载附件中...</div>;
  if (files.length === 0) return <p className="text-xs text-slate-400">暂无附件</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {files.map((f) => (
        <a key={f.id} href={f.filePath} target="_blank" rel="noopener noreferrer"
          className={`rounded-md border overflow-hidden ${IS_IMAGE.test(f.mimeType) ? "w-20 h-20" : "px-3 py-2"} bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-xs`}>
          {IS_IMAGE.test(f.mimeType) ? (
            <img src={f.filePath} alt={f.fileName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-slate-600 truncate max-w-[120px]">{f.fileName}</span>
          )}
        </a>
      ))}
    </div>
  );
}
