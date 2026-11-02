import { redirect } from "next/navigation";

/** 公海规则已并入用户管理，旧入口直接跳转。 */
export default function PoolSettingsPage() {
  redirect("/admin/users");
}
