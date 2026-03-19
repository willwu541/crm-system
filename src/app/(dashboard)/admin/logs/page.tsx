import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LogsClient } from "./LogsClient";

export default async function AdminLogsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/orders");

  return <LogsClient />;
}
