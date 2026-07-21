"use client";

import { PhotoUploader, FileAttachmentList } from "@/components/ui/PhotoUploader";

export function CustomerAttachments({ customerId }: { customerId: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium text-slate-800">照片/图纸</h2>
        <PhotoUploader entityType="customer" entityId={customerId} onUploaded={() => {}} />
      </div>
      <FileAttachmentList entityType="customer" entityId={customerId} />
    </div>
  );
}
