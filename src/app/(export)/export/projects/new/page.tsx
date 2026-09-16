import { ProjectForm } from "@/components/export/ProjectForm";
import { ListBackLink } from "@/components/export/shared/ListBackLink";

export default function NewExportProjectPage() {
  return (
    <div>
      <ListBackLink listPath="/export/projects" className="mb-4 inline-block text-sm text-slate-600 hover:underline">
        ← 返回项目列表
      </ListBackLink>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">新建项目</h1>
      <ProjectForm />
    </div>
  );
}
