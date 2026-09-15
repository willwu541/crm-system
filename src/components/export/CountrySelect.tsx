"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_COUNTRY_FILTER,
  canonicalizeCountry,
  countryLabel,
  extraCountryValues,
  searchExportCountries,
} from "@/lib/export/countries";

type CountrySelectProps = {
  value: string;
  onChange: (value: string) => void;
  emptyLabel?: string;
  allowEmpty?: boolean;
  allowUnspecified?: boolean;
  allowCustom?: boolean;
  extraValues?: string[];
  className?: string;
  id?: string;
};

export function CountrySelect({
  value,
  onChange,
  emptyLabel = "全部国家",
  allowEmpty = true,
  allowUnspecified = false,
  allowCustom = false,
  extraValues = [],
  className,
  id,
}: CountrySelectProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const extras = useMemo(
    () => extraCountryValues([...extraValues, value]),
    [extraValues, value],
  );
  const options = useMemo(() => searchExportCountries(query, extras), [query, extras]);
  const canonical = canonicalizeCountry(value) ?? value.trim();
  const shown = !canonical
    ? ""
    : canonical === EMPTY_COUNTRY_FILTER
      ? "未填国家"
      : countryLabel(canonical) === canonical
        ? canonical
        : `${countryLabel(canonical)} ${canonical}`;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function commit(raw: string) {
    const next = raw.trim();
    if (!next) {
      onChange("");
      setQuery("");
      setOpen(false);
      return;
    }
    if (allowUnspecified && (next === "未填国家" || next === EMPTY_COUNTRY_FILTER)) {
      onChange(EMPTY_COUNTRY_FILTER);
      setQuery("");
      setOpen(false);
      return;
    }
    const match = options.find(
      (item) =>
        item.value.toLowerCase() === next.toLowerCase() ||
        item.display.toLowerCase() === next.toLowerCase(),
    );
    if (match) {
      onChange(match.value);
    } else if (allowCustom) {
      onChange(canonicalizeCountry(next) ?? next);
    }
    setQuery("");
    setOpen(false);
  }

  function pick(next: string) {
    onChange(next);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={boxRef} className={`relative min-w-[9.5rem] ${className?.includes("w-full") ? "w-full" : ""}`}>
      <input
        id={id}
        type="text"
        autoComplete="off"
        value={open ? query : shown}
        placeholder={emptyLabel}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setOpen(true);
          setQuery(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(query || shown);
          }
          if (e.key === "Escape") setOpen(false);
        }}
        className={className}
      />
      {open ? (
        <div className="absolute z-30 mt-1 max-h-64 w-full min-w-[16rem] overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {allowEmpty ? (
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick("")}
            >
              {emptyLabel}
            </button>
          ) : null}
          {allowUnspecified ? (
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(EMPTY_COUNTRY_FILTER)}
            >
              未填国家
            </button>
          ) : null}
          {options.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-teal-50 ${
                item.value === canonical ? "bg-teal-50 text-teal-800" : "text-slate-700"
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(item.value)}
            >
              {item.display}
            </button>
          ))}
          {allowCustom && query.trim() && !options.some((item) => item.display.toLowerCase() === query.trim().toLowerCase() || item.value.toLowerCase() === query.trim().toLowerCase()) ? (
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left text-sm text-teal-700 hover:bg-teal-50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(query)}
            >
              新增「{query.trim()}」
            </button>
          ) : null}
          {options.length === 0 && !allowCustom ? (
            <div className="px-3 py-2 text-sm text-slate-400">没有匹配的国家</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
