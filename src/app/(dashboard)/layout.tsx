import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DomesticSidebar } from "@/components/layout/DomesticSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) {
    redirect("/login?redirect=" + encodeURIComponent("/dashboard"));
  }
  if (user.tenant !== "domestic") {
    redirect("/login?redirect=" + encodeURIComponent("/export/dashboard"));
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-teal-50/30">
      <DomesticSidebar userName={user.name} userRole={user.role} />
      <main className="flex-1 p-6">
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
