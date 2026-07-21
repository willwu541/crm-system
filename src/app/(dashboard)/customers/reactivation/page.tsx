import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerOwnerFilter } from "@/lib/domestic/customer-access";
import {
  DEFAULT_DORMANT_DAYS,
  daysSinceContact,
  getDormantThresholdDate,
  getReactivationSuggestion,
} from "@/lib/domestic/reactivation";
import { REACTIVATION_STATUSES } from "@/lib/domestic/constants";
import { ReactivationClient } from "@/components/customers/ReactivationClient";
import { serializeForClient } from "@/lib/utils";

export default async function ReactivationPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const threshold = getDormantThresholdDate(DEFAULT_DORMANT_DAYS);
  const where = {
    ...customerOwnerFilter(user),
    status: { in: REACTIVATION_STATUSES },
    OR: [
      { lastContactAt: { lt: threshold } },
      { lastContactAt: null, createdAt: { lt: threshold } },
    ],
  };

  const customers = await prisma.customer.findMany({
    where,
    include: {
      owner: { select: { name: true } },
    },
    orderBy: [{ lastContactAt: "asc" }, { createdAt: "asc" }],
    take: 50,
  });

  const data = customers.map((c) => ({
    ...c,
    daysSilent: daysSinceContact(c.lastContactAt, c.createdAt),
    suggestion: getReactivationSuggestion({
      name: c.name,
      wechat: c.wechat,
      daysSilent: daysSinceContact(c.lastContactAt, c.createdAt),
      wakeUpCount: c.wakeUpCount,
    }),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">客户私域唤醒</h1>
      <ReactivationClient
        initialData={serializeForClient(data) as Parameters<typeof ReactivationClient>[0]["initialData"]}
        dormantDays={DEFAULT_DORMANT_DAYS}
      />
    </div>
  );
}
