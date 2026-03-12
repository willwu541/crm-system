"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConvertToOrderButton({
  opportunityId,
  compact,
}: {
  opportunityId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConvert() {
    if (!confirm("确定将此商机转为正式订单？")) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/convert`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "转换失败");
      router.push(`/orders/${json.data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "转换失败");
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <>
        {error && <span className="text-xs text-red-600">{error}</span>}
        <button
          type="button"
          onClick={handleConvert}
          disabled={loading}
          className="text-green-600 hover:underline disabled:opacity-50"
        >
          {loading ? "转换中..." : "转订单"}
        </button>
      </>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleConvert}
        disabled={loading}
        className="rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "转换中..." : "转为正式订单"}
      </button>
    </div>
  );
}
