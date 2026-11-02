import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PoolSettingsClient } from "@/components/admin/PoolSettingsClient";

export default async function PoolSettingsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">公海自动回收规则</h1>
      <PoolSettingsClient />
    </div>
  );
}
