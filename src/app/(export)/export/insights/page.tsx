import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAssignExportWork } from "@/lib/export/lead-pool";
import { loadManagerInsights } from "@/lib/export/load-manager-insights";

export default async function ExportInsightsPage() {
  const user = await getSession();
  if (!user) redirect("/login?redirect=" + encodeURIComponent("/export/insights"));
  if (!canAssignExportWork(user)) {
    redirect(user.tenant === "export" ? "/export/dashboard" : "/dashboard");
  }

  let tenantId = user.tenantId;
  if (!tenantId) {
    const tenant = await prisma.exportTenant.findUnique({ where: { slug: "default" } });
    tenantId = tenant?.id ?? "";
  }
  if (!tenantId) {
    return <p className="p-6 text-sm text-slate-600">未配置租户，暂时不能汇总。</p>;
  }

  const data = await loadManagerInsights(tenantId);
  const readable = [
    `未分配线索：${data.unassignedLeadCount}`,
    `未分配项目：${data.unassignedProjectCount}`,
    `金额合计：${data.value.totalWan} 万元（已解析 ${data.value.parsedCount} 条，无法解析 ${data.value.unparsedCount} 条）`,
    ...data.progressMarks.map((row) => `进度标记 ${row.mark}：${row.count}`),
    ...data.byStage.map((row) => `阶段 ${row.label}：${row.count}`),
    ...data.byCountry.map((row) => `国家 ${row.country}：${row.count}`),
  ].join("\n");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">经营分析</h1>
        <p className="mt-1 text-sm text-slate-500">只汇总本系统里的线索和项目，给管理者看进度。业务员和业务经理看不到这一页。</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-lg border border-stone-200 bg-white p-4">
          <p className="text-sm text-slate-500">未分配线索</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{data.unassignedLeadCount}</p>
        </article>
        <article className="rounded-lg border border-stone-200 bg-white p-4">
          <p className="text-sm text-slate-500">未分配项目</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{data.unassignedProjectCount}</p>
        </article>
        <article className="rounded-lg border border-stone-200 bg-white p-4">
          <p className="text-sm text-slate-500">项目金额合计（万元）</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{data.value.totalWan}</p>
          <p className="mt-1 text-xs text-slate-500">
            从项目金额原文解析。已解析 {data.value.parsedCount} 条，写了金额但无法解析 {data.value.unparsedCount} 条。
          </p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <CountTable title="按进度标记" rows={data.progressMarks.map((row) => ({ label: row.mark, count: row.count }))} />
        <CountTable title="按阶段" rows={data.byStage.map((row) => ({ label: row.label, count: row.count }))} />
        <CountTable title="按国家" rows={data.byCountry.map((row) => ({ label: row.country, count: row.count }))} />
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-800">最近更新的项目</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs text-slate-500">
              <th className="py-2 pr-3">项目</th>
              <th className="py-2 pr-3">国家</th>
              <th className="py-2 pr-3">阶段</th>
              <th className="py-2 pr-3">进度标记</th>
              <th className="py-2 pr-3">负责人</th>
              <th className="py-2 pr-3">金额</th>
              <th className="py-2">更新时间</th>
            </tr>
          </thead>
          <tbody>
            {data.recent.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-4 text-slate-500">
                  还没有项目。
                </td>
              </tr>
            ) : (
              data.recent.map((row) => (
                <tr key={row.id} className="border-b border-stone-100">
                  <td className="py-2 pr-3">
                    <Link href={`/export/projects/${row.id}`} className="text-slate-800 hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-3">{row.country}</td>
                  <td className="py-2 pr-3">{row.stage}</td>
                  <td className="py-2 pr-3">{row.progressMark}</td>
                  <td className="py-2 pr-3">{row.ownerName}</td>
                  <td className="py-2 pr-3">{row.projectValueText || "—"}</td>
                  <td className="py-2">{row.updatedAt.slice(0, 16).replace("T", " ")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        <h2 className="text-base font-semibold text-slate-800">给人和后续分析看的摘要</h2>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-6 text-slate-700">{readable}</pre>
      </section>
    </div>
  );
}

function CountTable({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      <ul className="mt-2 divide-y divide-stone-100 text-sm">
        {rows.length === 0 ? (
          <li className="py-2 text-slate-500">没有数据。</li>
        ) : (
          rows.map((row) => (
            <li key={row.label} className="flex items-center justify-between py-1.5">
              <span>{row.label}</span>
              <span className="font-medium text-slate-900">{row.count}</span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
