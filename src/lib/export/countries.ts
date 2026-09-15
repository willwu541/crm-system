export const EMPTY_COUNTRY_FILTER = "__empty__";

export type ExportCountry = {
  value: string;
  label: string;
  aliases: string[];
};

/** 下拉国别；value 用英文，方便邮件模板；中文别名也能筛到旧数据。 */
export const EXPORT_COUNTRIES: ExportCountry[] = [
  { value: "United States", label: "美国", aliases: ["USA", "US", "America", "U.S.", "U.S.A.", "美国", "美國"] },
  { value: "Canada", label: "加拿大", aliases: ["加拿大"] },
  { value: "Mexico", label: "墨西哥", aliases: ["墨西哥"] },
  { value: "United Kingdom", label: "英国", aliases: ["UK", "U.K.", "Britain", "Great Britain", "England", "英国", "英國"] },
  { value: "Germany", label: "德国", aliases: ["德国", "德國", "Deutschland"] },
  { value: "France", label: "法国", aliases: ["法国", "法國"] },
  { value: "Italy", label: "意大利", aliases: ["意大利", "Italia"] },
  { value: "Netherlands", label: "荷兰", aliases: ["Holland", "荷兰", "荷蘭"] },
  { value: "Spain", label: "西班牙", aliases: ["西班牙"] },
  { value: "Poland", label: "波兰", aliases: ["波兰", "波蘭"] },
  { value: "Belgium", label: "比利时", aliases: ["比利时", "比利時"] },
  { value: "Sweden", label: "瑞典", aliases: ["瑞典"] },
  { value: "Norway", label: "挪威", aliases: ["挪威"] },
  { value: "Denmark", label: "丹麦", aliases: ["丹麦", "丹麥"] },
  { value: "Finland", label: "芬兰", aliases: ["芬兰", "芬蘭"] },
  { value: "Ireland", label: "爱尔兰", aliases: ["爱尔兰", "愛爾蘭"] },
  { value: "Switzerland", label: "瑞士", aliases: ["瑞士"] },
  { value: "Austria", label: "奥地利", aliases: ["奥地利", "奧地利"] },
  { value: "Portugal", label: "葡萄牙", aliases: ["葡萄牙"] },
  { value: "Greece", label: "希腊", aliases: ["希腊", "希臘"] },
  { value: "Australia", label: "澳大利亚", aliases: ["澳洲", "澳大利亚", "澳大利亞"] },
  { value: "New Zealand", label: "新西兰", aliases: ["NZ", "新西兰", "新西蘭"] },
  { value: "United Arab Emirates", label: "阿联酋", aliases: ["UAE", "U.A.E.", "Dubai", "阿联酋", "阿聯酋", "迪拜"] },
  { value: "Saudi Arabia", label: "沙特阿拉伯", aliases: ["KSA", "沙特", "沙特阿拉伯"] },
  { value: "Qatar", label: "卡塔尔", aliases: ["卡塔尔", "卡塔爾"] },
  { value: "Kuwait", label: "科威特", aliases: ["科威特"] },
  { value: "Oman", label: "阿曼", aliases: ["阿曼"] },
  { value: "Bahrain", label: "巴林", aliases: ["巴林"] },
  { value: "Singapore", label: "新加坡", aliases: ["新加坡"] },
  { value: "Malaysia", label: "马来西亚", aliases: ["马来西亚", "馬來西亞"] },
  { value: "Indonesia", label: "印度尼西亚", aliases: ["印尼", "印度尼西亚", "印度尼西亞"] },
  { value: "Thailand", label: "泰国", aliases: ["泰国", "泰國"] },
  { value: "Vietnam", label: "越南", aliases: ["越南"] },
  { value: "Philippines", label: "菲律宾", aliases: ["菲律宾", "菲律賓"] },
  { value: "India", label: "印度", aliases: ["印度"] },
  { value: "Japan", label: "日本", aliases: ["日本"] },
  { value: "South Korea", label: "韩国", aliases: ["Korea", "韩国", "韓國", "南韩", "南韓"] },
  { value: "Taiwan", label: "中国台湾", aliases: ["中国台湾", "台灣", "台湾", "Chinese Taipei"] },
  { value: "Hong Kong", label: "中国香港", aliases: ["HK", "中国香港", "香港"] },
  { value: "China", label: "中国", aliases: ["中国", "中國", "PRC"] },
  { value: "South Africa", label: "南非", aliases: ["南非"] },
  { value: "Egypt", label: "埃及", aliases: ["埃及"] },
  { value: "Nigeria", label: "尼日利亚", aliases: ["尼日利亚", "尼日利亞"] },
  { value: "Kenya", label: "肯尼亚", aliases: ["肯尼亚", "肯尼亞"] },
  { value: "Brazil", label: "巴西", aliases: ["巴西"] },
  { value: "Chile", label: "智利", aliases: ["智利"] },
  { value: "Argentina", label: "阿根廷", aliases: ["阿根廷"] },
  { value: "Colombia", label: "哥伦比亚", aliases: ["哥伦比亚", "哥倫比亞"] },
  { value: "Peru", label: "秘鲁", aliases: ["秘鲁", "秘魯"] },
  { value: "Turkey", label: "土耳其", aliases: ["土耳其"] },
  { value: "Russia", label: "俄罗斯", aliases: ["俄罗斯", "俄羅斯"] },
  { value: "Israel", label: "以色列", aliases: ["以色列"] },
  { value: "Jordan", label: "约旦", aliases: ["约旦", "約旦"] },
  { value: "Pakistan", label: "巴基斯坦", aliases: ["巴基斯坦"] },
  { value: "Bangladesh", label: "孟加拉", aliases: ["孟加拉", "孟加拉国", "孟加拉國"] },
];

const COUNTRY_LOOKUP = new Map<string, ExportCountry>();
for (const country of EXPORT_COUNTRIES) {
  COUNTRY_LOOKUP.set(normalizeCountryKey(country.value), country);
  COUNTRY_LOOKUP.set(normalizeCountryKey(country.label), country);
  for (const alias of country.aliases) {
    COUNTRY_LOOKUP.set(normalizeCountryKey(alias), country);
  }
}

export function normalizeCountryKey(value: string) {
  return value.trim().toLowerCase().replace(/[.\s_-]+/g, " ");
}

export function findExportCountry(value: string | null | undefined): ExportCountry | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  return COUNTRY_LOOKUP.get(normalizeCountryKey(raw));
}

export function canonicalizeCountry(value: string | null | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  return findExportCountry(raw)?.value ?? raw;
}

export function countryLabel(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) return "-";
  return findExportCountry(raw)?.label ?? raw;
}

export function countryOptionLabel(country: ExportCountry) {
  return `${country.label} ${country.value}`;
}

export function countryMatchNames(selected: string): string[] {
  const raw = selected.trim();
  if (!raw) return [];
  const match = findExportCountry(raw);
  if (!match) return [raw];
  return Array.from(new Set([match.value, match.label, ...match.aliases]));
}

export function countryPrismaWhere(selected: string | undefined): Record<string, unknown> | null {
  const raw = selected?.trim();
  if (!raw) return null;
  if (raw === EMPTY_COUNTRY_FILTER) {
    return { OR: [{ country: null }, { country: "" }] };
  }
  const names = countryMatchNames(raw);
  if (names.length === 1) {
    return { country: { equals: names[0], mode: "insensitive" } };
  }
  return {
    OR: names.map((name) => ({ country: { equals: name, mode: "insensitive" } })),
  };
}

export function mergeCountryStats(
  rows: { country: string | null; count: number }[],
): { country: string; count: number }[] {
  const merged = new Map<string, number>();
  for (const row of rows) {
    const key = canonicalizeCountry(row.country);
    if (!key) continue;
    merged.set(key, (merged.get(key) ?? 0) + row.count);
  }
  return Array.from(merged.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);
}

export function searchExportCountries(
  query: string,
  extraValues: Array<string | null | undefined> = [],
): { value: string; display: string }[] {
  const extras = extraCountryValues(extraValues).map((value) => ({
    value,
    display: value,
    haystack: value,
  }));
  const catalog = EXPORT_COUNTRIES.map((country) => ({
    value: country.value,
    display: countryOptionLabel(country),
    haystack: [country.value, country.label, ...country.aliases].join(" "),
  }));
  const q = query.trim().toLowerCase();
  const rows = [...catalog, ...extras];
  if (!q) return rows.map(({ value, display }) => ({ value, display }));
  return rows
    .filter((row) => row.haystack.toLowerCase().includes(q) || row.display.toLowerCase().includes(q))
    .map(({ value, display }) => ({ value, display }));
}

export function extraCountryValues(used: Array<string | null | undefined>): string[] {
  const extras: string[] = [];
  const seen = new Set<string>();
  for (const item of used) {
    const raw = item?.trim();
    if (!raw) continue;
    const canonical = canonicalizeCountry(raw) ?? raw;
    const key = normalizeCountryKey(canonical);
    if (seen.has(key) || findExportCountry(canonical)) continue;
    seen.add(key);
    extras.push(canonical);
  }
  return extras.sort((a, b) => a.localeCompare(b, "zh"));
}
