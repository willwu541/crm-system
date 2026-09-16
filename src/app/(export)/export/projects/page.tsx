import { ProjectsClient } from "@/components/export/ProjectsClient";

export default function ExportProjectsPage() {
  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold text-slate-800">Projects 项目</h1>
      <p className="mb-4 text-sm text-slate-500">
        录入碰到的项目，业务员去找业主、总包、分包等联系方式。团队全员可见。
      </p>
      <ProjectsClient />
    </div>
  );
}
