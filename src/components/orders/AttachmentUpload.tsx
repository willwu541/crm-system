"use client";

import { useState, useRef } from "react";

interface Attachment {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  orderItemId: string | null;
}

interface Props {
  orderId: string;
  orderAttachments: Attachment[];
  itemAttachments: Record<string, Attachment[]>;
  orderItems: { id: string; specModel?: string }[];
  onUploaded: () => void;
  onDeleted: () => void;
}

const ALLOWED_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".zip"];

export function AttachmentUpload({
  orderId,
  orderAttachments,
  itemAttachments,
  orderItems,
  onUploaded,
  onDeleted,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function uploadFile(file: File, orderItemId?: string) {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!ALLOWED_EXT.includes(ext)) {
      setError("仅支持 pdf、jpg、png、gif、zip 格式");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("文件不能超过 10MB");
      return;
    }

    setError("");
    if (orderItemId) setUploadingItem(orderItemId);
    else setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("orderId", orderId);
      if (orderItemId) formData.append("orderItemId", orderItemId);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "上传失败");

      const attRes = await fetch(`/api/orders/${orderId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...uploadData,
          orderItemId: orderItemId || null,
        }),
      });
      if (!attRes.ok) throw new Error("保存失败");
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploading(false);
      setUploadingItem(null);
    }
  }

  async function deleteAttachment(id: string) {
    try {
      const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-medium text-slate-800">订单级附件</h3>
        <div className="flex flex-wrap gap-2">
          {orderAttachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            >
              <a
                href={a.filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:underline"
              >
                {a.fileName}
              </a>
              <button
                type="button"
                onClick={() => deleteAttachment(a.id)}
                className="text-red-600 hover:underline"
              >
                删除
              </button>
            </div>
          ))}
          <label className="cursor-pointer rounded border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f);
                e.target.value = "";
              }}
              disabled={uploading}
            />
            {uploading ? "上传中..." : "+ 添加附件"}
          </label>
        </div>
      </div>

      {orderItems.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 font-medium text-slate-800">明细级附件</h3>
          <div className="space-y-3">
            {orderItems.map((item) => {
              const atts = itemAttachments[item.id] || [];
              const isUploading = uploadingItem === item.id;
              return (
                <div
                  key={item.id}
                  className="rounded border border-slate-100 bg-slate-50/50 p-3"
                >
                  <div className="mb-2 text-xs text-slate-500">
                    {item.specModel ? `${item.specModel}` : `明细 #${item.id.slice(-6)}`}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {atts.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 rounded bg-white px-2 py-1 text-sm"
                      >
                        <a
                          href={a.filePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-600 hover:underline"
                        >
                          {a.fileName}
                        </a>
                        <button
                          type="button"
                          onClick={() => deleteAttachment(a.id)}
                          className="text-red-600 hover:underline"
                        >
                          删
                        </button>
                      </div>
                    ))}
                    <label className="cursor-pointer text-sm text-slate-600 hover:underline">
                      <input
                        ref={(el) => {
                          itemFileRefs.current[item.id] = el;
                        }}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.gif,.zip"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadFile(f, item.id);
                          e.target.value = "";
                        }}
                        disabled={isUploading}
                      />
                      {isUploading ? "上传中..." : "+ 添加"}
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
