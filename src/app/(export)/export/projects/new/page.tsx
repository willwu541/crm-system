import { ProjectDispatchForm } from "@/components/export/ProjectDispatchForm";
import { ListBackLink } from "@/components/export/shared/ListBackLink";

export default function NewExportProjectPage() {
  return (
    <div>
      <ListBackLink listPath="/export/projects" className="mb-4 inline-block text-sm text-slate-600 hover:underline">
        ← 返回项目列表
      </ListBackLink>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">快速录入并派发</h1>
      <ProjectDispatchForm />
    </div>
  );
}
