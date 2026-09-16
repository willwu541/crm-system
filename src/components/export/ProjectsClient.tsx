"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  PROJECT_CONFIDENCE,
  PROJECT_INDUSTRIES,
  PROJECT_STAGES,
} from "@/lib/export-constants";
import {
  displayLabel,
  projectConfidenceLabel,
  projectIndustryLabel,
  projectStageLabel,
} from "@/lib/export-display-labels";
import { buildListUrl } from "@/lib/export/url-params";
import { parseResponseJson } from "@/lib/parse-response-json";
import {
  displayGeneralContractor,
  displayOwnerOperator,
  displayPotentialBuyers,
  formatProjectPlace,
  projectSubtitle,
  wrapSlashLabel,
} from "@/lib/export/project-board";
import { Pagination } from "./shared/Pagination";
import { CountrySelect } from "./CountrySelect";

interface ProjectRow {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  location: string | null;
  industry: string | null;
  stage: string;
  confidence: string;
  ownerOperator: string | null;
  generalContractor: string | null;
  potentialBuyers: string | null;
  source: string | null;
  notes: string | null;
  description: string | null;
  bidDeadline: string | null;
  parties: { role: string; companyName: string }[];
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function stageClass(stage: string) {
  switch (stage) {
    case "awarded":
      return "border-emerald-300 bg-emerald-50 text-emerald-800";
    case "construction":
      return "border-green-300 bg-green-50 text-green-800";
    case "tendering":
      return "border-orange-300 bg-orange-50 text-orange-800";
    case "mep_install":
      return "border-amber-300 bg-amber-50 text-amber-800";
    case "commissioning":
      return "border-teal-300 bg-teal-50 text-teal-800";
    case "delayed":
      return "border-slate-300 bg-slate-100 text-slate-600";
    case "planning":
      return "border-sky-300 bg-sky-50 text-sky-800";
    default:
      return "border-stone-300 bg-stone-50 text-stone-600";
  }
}

function dash(value: string | null | undefined): string {
  return value?.trim() ? value : "—";
}

export function ProjectsClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const stage = searchParams.get("stage") ?? "";
  const industry = searchParams.get("industry") ?? "";
  const confidence = searchParams.get("confidence") ?? "";
  const country = searchParams.get("country") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const keywordParam = searchParams.get("keyword") ?? "";

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(keywordParam);

  useEffect(() => {
    setKeyword(keywordParam);
  }, [keywordParam]);

  function updateUrl(updates: Record<string, string | number | undefined>) {
    router.replace(
      buildListUrl(pathname, {
        stage: stage || undefined,
        industry: industry || undefined,
        confidence: confidence || undefined,
        country: country || undefined,
        keyword: keyword || undefined,
        page,
        ...updates,
      }),
    );
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        if (stage) params.set("stage", stage);
        if (industry) params.set("industry", industry);
        if (confidence) params.set("confidence", confidence);
        if (country) params.set("country", country);
        if (keywordParam) params.set("keyword", keywordParam);
        const res = await fetch(`/api/export/projects?${params}`);
        const json = await parseResponseJson<{
          error?: string;
          data?: ProjectRow[];
          pagination?: PaginationInfo;
          countries?: string[];
        }>(res);
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error ?? "加载失败");
        setProjects(json.data || []);
        setPagination(json.pagination ?? null);
        setCountries(json.countries ?? []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, stage, industry, confidence, country, keywordParam]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateUrl({ keyword: keyword || undefined, page: 1 });
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜项目、公司、地点"
            className="min-w-[14rem] rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm"
          />
          <CountrySelect
            value={country}
            extraValues={countries}
            allowCustom
            emptyLabel="全部国家"
            onChange={(next) => updateUrl({ country: next || undefined, page: 1 })}
            className="min-w-[8.5rem] rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          />
          <select
            value={industry}
            onChange={(e) => updateUrl({ industry: e.target.value || undefined, page: 1 })}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          >
            <option value="">全部行业</option>
            {PROJECT_INDUSTRIES.map((s) => (
              <option key={s} value={s}>
                {projectIndustryLabel[s] ?? s}
              </option>
            ))}
          </select>
          <select
            value={stage}
            onChange={(e) => updateUrl({ stage: e.target.value || undefined, page: 1 })}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          >
            <option value="">全部阶段</option>
            {PROJECT_STAGES.map((s) => (
              <option key={s} value={s}>
                {projectStageLabel[s] ?? s}
              </option>
            ))}
          </select>
          <select
            value={confidence}
            onChange={(e) => updateUrl({ confidence: e.target.value || undefined, page: 1 })}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          >
            <option value="">全部</option>
            {PROJECT_CONFIDENCE.map((s) => (
              <option key={s} value={s}>
                {projectConfidenceLabel[s] ?? s}
              </option>
            ))}
          </select>
          <button type="submit" className="export-btn-secondary rounded-md px-3 py-1.5 text-sm">
            搜索
          </button>
        </form>
        <Link
          href="/export/projects/new"
          className="export-btn-primary ml-auto rounded-md px-4 py-1.5 text-sm font-medium"
        >
          新建项目
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-[#f7f1e8]">
        {loading ? (
          <div className="p-8 text-center text-slate-500">加载中...</div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            还没有项目。先录入碰到的项目，再让业务员去找业主、总包、分包联系方式。
          </div>
        ) : (
          <table className="w-full min-w-[72rem] text-sm">
            <thead className="sticky top-0 z-10 bg-[#f3ece3]">
              <tr className="border-b border-stone-300 text-left text-xs font-medium text-stone-500">
                <th className="px-4 py-2.5">项目</th>
                <th className="px-3 py-2.5">行业</th>
                <th className="px-3 py-2.5">地点</th>
                <th className="px-3 py-2.5">阶段</th>
                <th className="px-3 py-2.5">业主/运营商</th>
                <th className="px-3 py-2.5">总包</th>
                <th className="px-3 py-2.5">潜在采购公司</th>
                <th className="px-3 py-2.5">可靠度</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const subtitle = projectSubtitle(p);
                return (
                  <tr
                    key={p.id}
                    className="cursor-pointer border-b border-stone-200/80 hover:bg-white/70"
                    onClick={() => router.push(`/export/projects/${p.id}`)}
                  >
                    <td className="max-w-[22rem] px-4 py-3 align-top">
                      <div className="font-semibold text-slate-800" title={p.name}>
                        {p.name}
                      </div>
                      {subtitle ? (
                        <div className="mt-0.5 line-clamp-2 text-xs font-normal text-stone-500">
                          {subtitle}
                        </div>
                      ) : null}
                    </td>
                    <td className="max-w-[8.5rem] whitespace-pre-line px-3 py-3 align-top leading-5 text-slate-700">
                      {wrapSlashLabel(displayLabel(projectIndustryLabel, p.industry))}
                    </td>
                    <td className="max-w-[12rem] whitespace-pre-line px-3 py-3 align-top leading-5 text-slate-700">
                      {formatProjectPlace(p)}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${stageClass(p.stage)}`}
                      >
                        {displayLabel(projectStageLabel, p.stage)}
                      </span>
                    </td>
                    <td className="max-w-[10rem] px-3 py-3 align-top text-slate-700">
                      {dash(displayOwnerOperator(p, p.parties))}
                    </td>
                    <td className="max-w-[10rem] px-3 py-3 align-top text-slate-700">
                      {dash(displayGeneralContractor(p, p.parties))}
                    </td>
                    <td className="max-w-[12rem] px-3 py-3 align-top text-slate-700">
                      {dash(displayPotentialBuyers(p, p.parties))}
                    </td>
                    <td className="px-3 py-3 align-top text-stone-500">
                      {displayLabel(projectConfidenceLabel, p.confidence)}
                    </td>
                    <td className="px-3 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/export/projects/${p.id}`}
                        className="inline-flex rounded border border-stone-400 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-stone-50"
                      >
                        详情
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.total > 0 && (
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={(p) => updateUrl({ page: p })}
        />
      )}
    </div>
  );
}
