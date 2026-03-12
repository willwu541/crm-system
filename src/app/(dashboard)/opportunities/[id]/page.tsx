import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { serializeForClient } from "@/lib/utils";
import { OpportunityForm } from "@/components/opportunities/OpportunityForm";
import { ConvertToOrderButton } from "@/components/opportunities/ConvertToOrderButton";
import { OpportunityStatusSelect } from "@/components/opportunities/OpportunityStatusSelect";

const STATUS_MAP: Record<string, string> = {
  OPPORTUNITY: "商机中",
  CONVERTED: "已成交",
  CANCELLED: "已取消",
};

const INTENTION_MAP: Record<string, string> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSession();
  if (!user) return null;

  const opp = await prisma.opportunity.findFirst({
    where: {
      id,
      ...(user.role === "SALES" ? { createdById: user.id } : {}),
    },
    include: {
      customer: true,
      createdBy: { select: { name: true } },
      order: true,
    },
  });

  if (!opp) notFound();

  const serializedOpp = serializeForClient(opp);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">
          商机详情 - {opp.projectName}
        </h1>
        <div className="flex gap-2">
          <Link
            href="/opportunities"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            返回列表
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-slate-800">基本信息</h2>
        <dl className="mb-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">客户</dt>
            <dd>
              <Link
                href={`/customers/${opp.customer.id}`}
                className="text-blue-600 hover:underline"
              >
                {opp.customer.name}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">主状态</dt>
            <dd>
              <OpportunityStatusSelect
                opportunityId={id}
                currentStatus={opp.status}
              />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">创建人</dt>
            <dd>{opp.createdBy.name}</dd>
          </div>
        </dl>
        <OpportunityForm
          opportunityId={id}
          initial={{
            customerId: opp.customerId,
            projectName: opp.projectName,
            isQuoted: opp.isQuoted,
            intentionLevel: opp.intentionLevel,
            estimatedAmount: opp.estimatedAmount ? String(opp.estimatedAmount) : "",
            remark: opp.remark ?? "",
          }}
        />
      </div>

      {opp.status === "OPPORTUNITY" && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-medium text-slate-800">转订单</h2>
          <ConvertToOrderButton opportunityId={id} />
        </div>
      )}

      {opp.status === "CONVERTED" && opp.order && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-medium text-slate-800">关联订单</h2>
          <Link
            href={`/orders/${opp.order.id}`}
            className="text-blue-600 hover:underline"
          >
            查看订单 {opp.order.orderNo}
          </Link>
        </div>
      )}
    </div>
  );
}
