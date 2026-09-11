"use client";

import { useMemo, useState } from "react";
import {
  EMPTY_COUNTRY_FILTER,
  EXPORT_COUNTRIES,
  canonicalizeCountry,
  countryOptionLabel,
  extraCountryValues,
  findExportCountry,
} from "@/lib/export/countries";

const CUSTOM_VALUE = "__custom__";

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
  const extras = useMemo(
    () => extraCountryValues([...extraValues, value]),
    [extraValues, value],
  );
  const canonical = canonicalizeCountry(value) ?? value.trim();
  const inCatalog = Boolean(canonical && findExportCountry(canonical));
  const inExtras = extras.some((item) => item === canonical);
  const [customMode, setCustomMode] = useState(Boolean(canonical) && !inCatalog && !inExtras);
  const [customDraft, setCustomDraft] = useState(customMode ? canonical : "");
  const usingCustom = allowCustom && (customMode || (Boolean(canonical) && !inCatalog && !inExtras));
  const selectValue = usingCustom ? CUSTOM_VALUE : canonical;

  function handleSelect(next: string) {
    if (next === CUSTOM_VALUE) {
      setCustomMode(true);
      onChange(customDraft.trim());
      return;
    }
    setCustomMode(false);
    onChange(next);
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${allowCustom ? "w-full" : ""}`}>
      <select
        id={id}
        value={selectValue}
        onChange={(e) => handleSelect(e.target.value)}
        className={`${className ?? ""} ${allowCustom ? "min-w-0 flex-1" : ""}`}
      >
        {allowEmpty ? <option value="">{emptyLabel}</option> : null}
        {allowUnspecified ? <option value={EMPTY_COUNTRY_FILTER}>未填国家</option> : null}
        {EXPORT_COUNTRIES.map((country) => (
          <option key={country.value} value={country.value}>
            {countryOptionLabel(country)}
          </option>
        ))}
        {extras.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
        {allowCustom ? <option value={CUSTOM_VALUE}>其他</option> : null}
      </select>
      {allowCustom && usingCustom ? (
        <input
          type="text"
          value={customDraft}
          onChange={(e) => {
            setCustomDraft(e.target.value);
            onChange(e.target.value);
          }}
          placeholder="输入国家"
          className={className}
        />
      ) : null}
    </div>
  );
}
