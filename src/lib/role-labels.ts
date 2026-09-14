export function formatRole(role: string, isDirector = false) {
  if (isDirector) return "业务经理";
  if (role === "ADMIN") return "管理者";
  if (role === "MANAGER") return "经理";
  return "业务员";
}
