import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { UserList } from "@/components/admin/UserList";

export default async function AdminUsersPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/opportunities");

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">用户管理</h1>
      <UserList />
    </div>
  );
}
