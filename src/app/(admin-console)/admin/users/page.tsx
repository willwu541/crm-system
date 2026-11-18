import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAssignExportWork } from "@/lib/export/lead-pool";
import { UserList } from "@/components/admin/UserList";

export default async function AdminUsersPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!canAssignExportWork(user)) {
    redirect(user.tenant === "export" ? "/export/dashboard" : "/dashboard");
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">用户管理</h1>
      <p className="mb-6 max-w-3xl text-sm leading-6 text-slate-600">
        这个接口代表管理者本人。可标记联系、写进度、写客户分析，可按页面规则分配线索和项目。不能发邮件。前缀{" "}
        <span className="font-medium text-slate-800">/api/export/ai</span>
        ，请求头使用 Authorization: Bearer 密钥。密钥只写在服务器环境变量 EXPORT_AI_API_KEY，页面不显示密钥。
        接口说明在 docs/export-ai-openapi.yaml。
      </p>
      <UserList />
    </div>
  );
}
