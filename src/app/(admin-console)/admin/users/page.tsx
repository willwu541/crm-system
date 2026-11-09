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
      <UserList />
    </div>
  );
}
