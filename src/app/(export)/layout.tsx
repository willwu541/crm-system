import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ExportHeader } from "@/components/layout/ExportHeader";
import { ExportProviders } from "@/components/layout/ExportProviders";
import { ExportSidebar } from "@/components/layout/ExportSidebar";
import { AIQuickDock } from "@/components/layout/AIQuickDock";

export default async function ExportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) {
    redirect("/login?redirect=" + encodeURIComponent("/export/dashboard"));
  }
  if (user.tenant !== "export") {
    redirect("/login?redirect=" + encodeURIComponent("/dashboard"));
  }

  return (
    <ExportProviders>
      <div className="export-crm flex min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-blue-50">
        <ExportSidebar />
        <div className="flex flex-1 flex-col">
          <ExportHeader user={user} />
          <main className="flex-1 p-7 pb-20">
            <div className="mx-auto w-full max-w-[1600px]">{children}</div>
          </main>
        </div>
        <AIQuickDock />
      </div>
    </ExportProviders>
  );
}
