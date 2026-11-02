import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isDirector } from "@/lib/access-policy";
import { DomesticSidebar } from "@/components/layout/DomesticSidebar";

export default async function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) {
    redirect("/login?redirect=" + encodeURIComponent("/admin/users"));
  }
  if (user.role !== "ADMIN") {
    redirect(user.tenant === "export" ? "/export/dashboard" : "/dashboard");
  }

  if (user.tenant === "domestic") {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-teal-50/30">
        <DomesticSidebar userName={user.name} userRole={user.role} isDirector={isDirector(user)} />
        <main className="flex-1 p-6">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-6">
          <p className="text-sm font-semibold text-slate-800">用户与公海管理</p>
          <Link
            href="/export/dashboard"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
          >
            返回外贸
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1600px] p-6">{children}</main>
    </div>
  );
}
