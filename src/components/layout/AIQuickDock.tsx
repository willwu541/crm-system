"use client";

import { useState } from "react";
import { AI_LINKS } from "@/lib/export/resources";

export function AIQuickDock() {
  const [open, setOpen] = useState(false);
  const quickLinks = AI_LINKS.slice(0, 6);

  return (
    <div className="fixed bottom-4 left-[15.5rem] z-40 max-[1024px]:left-4">
      <div className="w-56 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-700">AI 快捷入口</p>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            {open ? "收起" : "展开"}
          </button>
        </div>
        {open && (
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map((a) => (
              <a
                key={a.name}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-slate-200 px-2 py-1.5 text-center text-xs font-medium text-teal-700 hover:bg-teal-50"
                title={a.note}
              >
                {a.name}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

