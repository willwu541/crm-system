import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Header } from "@/components/layout/Header";

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
    <div className="min-h-screen bg-slate-50">
      <Header user={user} />
      <main className="p-4 sm:p-6">{children}</main>
    </div>
  );
}
