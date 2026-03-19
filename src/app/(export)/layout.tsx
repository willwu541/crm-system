import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ExportHeader } from "@/components/layout/ExportHeader";
import { ExportProviders } from "@/components/layout/ExportProviders";
import { ExportSidebar } from "@/components/layout/ExportSidebar";

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
      <div className="flex min-h-screen bg-slate-50">
        <ExportSidebar />
        <div className="flex flex-1 flex-col">
          <ExportHeader user={user} />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </ExportProviders>
  );
}
