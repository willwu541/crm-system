import { NextResponse } from "next/server";

export function escapeCSV(val: string | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function csvDownloadResponse(
  filename: string,
  headers: string[],
  rows: (string | null | undefined)[][]
): NextResponse {
  const csv = [headers.join(","), ...rows.map((row) => row.map(escapeCSV).join(","))].join("\n");
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
