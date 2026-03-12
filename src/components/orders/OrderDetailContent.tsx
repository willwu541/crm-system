"use client";

import { useRouter } from "next/navigation";
import { AttachmentUpload } from "./AttachmentUpload";
import { QuoteLinks } from "./QuoteLinks";

interface Attachment {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  orderItemId: string | null;
}

interface OrderItem {
  id: string;
  specModel?: string;
}

interface Props {
  orderId: string;
  orderAttachments: Attachment[];
  itemAttachments: Record<string, Attachment[]>;
  orderItems: OrderItem[];
  showQuoteLinks?: boolean;
}

export function OrderDetailContent({
  orderId,
  orderAttachments,
  itemAttachments,
  orderItems,
  showQuoteLinks,
}: Props) {
  const router = useRouter();

  if (showQuoteLinks) {
    return <QuoteLinks orderId={orderId} />;
  }

  return (
    <AttachmentUpload
      orderId={orderId}
      orderAttachments={orderAttachments}
      itemAttachments={itemAttachments}
      orderItems={orderItems}
      onUploaded={() => router.refresh()}
      onDeleted={() => router.refresh()}
    />
  );
}
