"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { CustomerForm } from "./CustomerForm";
import { ContactFormClient } from "./ContactFormClient";
import { ActivityFormClient } from "./ActivityFormClient";
import { QuoteFormClient } from "./QuoteFormClient";
import { TaskFormClient } from "./TaskFormClient";
import { Drawer } from "./shared/Drawer";
import { ExportDeleteButton } from "./ExportDeleteButton";
import { parseResponseJson } from "@/lib/parse-response-json";
import {
  activityTypeLabel,
  customerStatusLabel,
  customerTypeLabel,
  displayInterestedProductsList,
  displayLabel,
  marketPriorityLabel,
  paymentStatusLabel,
  quoteStatusLabel,
  taskPriorityLabel,
  taskStatusLabel,
  valueLevelLabel,
} from "@/lib/export-display-labels";
import { getWebsiteHost, normalizeWebsiteUrl } from "@/lib/website";

interface Customer {
  id: string;
  customerCode: string;
  companyName: string;
  website: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  customerType: string | null;
  industry: string | null;
  marketPriority: string | null;
  valueLevel: string | null;
  interestedProducts: string[];
  sourceChannel: string | null;
  status: string;
  owner: { name: string };
  lastFollowUpAt: string | null;
  nextFollowUpAt: string | null;
  lastStageChangedAt: string | null;
  lostReason: string | null;
  notes: string | null;
  createdAt: string;
  contacts: { id: string; name: string; title: string | null; email: string | null; phone?: string | null; whatsapp?: string | null; linkedin?: string | null; language?: string | null; isPrimary: boolean; notes?: string | null }[];
  activities: { id: string; type: string; subject: string | null; content: string | null; createdAt: string; contact: { name: string } | null; owner: { name: string } }[];
  quotes: { id: string; quoteNo: string; totalAmount: string | null; status: string; quoteDate: string; createdAt: string }[];
  orders: { id: string; orderNo: string; totalAmount: string | null; paymentStatus: string; productionStatus: string; shippingStatus: string; orderDate: string; createdAt: string }[];
  tasks: { id: string; title: string; dueDate: string | null; priority: string; status: string; createdAt: string }[];
}

export function CustomerDetailClient({ customerId }: { customerId: string }) {
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<"contact" | "activity" | "quote" | "task" | "edit" | "contactEdit" | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);

  async function fetchCustomer(opts?: { silent?: boolean }) {
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch(`/api/export/customers/${customerId}`);
      const json = await parseResponseJson<{ error?: string; data?: Customer }>(res);
      if (!res.ok) throw new Error(json.error ?? "加载失败");
      if (json.data) setCustomer(json.data);
    } catch (e) {
      if (!opts?.silent) setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  function closeDrawer() {
    setDrawer(null);
    setEditingContactId(null);
  }

  function handleFormSuccess() {
    closeDrawer();
    toast("保存成功");
    fetchCustomer({ silent: true });
  }

  if (loading) return <div className="p-12 text-center text-slate-500">加载中...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!customer) return <div className="p-8 text-center text-slate-500">客户不存在</div>;

  const editingContact = editingContactId ? customer.contacts.find((c) => c.id === editingContactId) : null;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const lastRef = customer.lastFollowUpAt
    ? new Date(customer.lastFollowUpAt)
    : new Date(customer.createdAt);
  const isOverdue =
    !["won", "lost"].includes(customer.status) && lastRef < sevenDaysAgo;
  const isNextDue =
    customer.nextFollowUpAt && new Date(customer.nextFollowUpAt) <= new Date();
  const primaryContact = customer.contacts.find((contact) => contact.isPrimary) ?? customer.contacts[0] ?? null;
  const websiteUrl = normalizeWebsiteUrl(customer.website);
  const websiteHost = getWebsiteHost(customer.website);
  const timelineItems = [
    {
      id: `customer-${customer.id}`,
      type: "customer",
      occurredAt: customer.createdAt,
      title: "创建客户",
      description: `${customer.companyName} (${customer.customerCode})`,
      href: `/export/customers/${customer.id}`,
      badge: "客户",
    },
    ...customer.activities.map((activity) => ({
      id: `activity-${activity.id}`,
      type: "activity",
      occurredAt: activity.createdAt,
      title: activity.subject || "新增跟进",
      description: `${activityTypeLabel[activity.type] ?? activity.type} · ${activity.owner.name}${activity.contact ? ` · ${activity.contact.name}` : ""}${activity.content ? ` · ${activity.content}` : ""}`,
      href: undefined,
      badge: "跟进",
    })),
    ...customer.quotes.map((quote) => ({
      id: `quote-${quote.id}`,
      type: "quote",
      occurredAt: quote.quoteDate || quote.createdAt,
      title: `报价 ${quote.quoteNo}`,
      description: `${quoteStatusLabel[quote.status] ?? quote.status}${quote.totalAmount != null ? ` · ${String(quote.totalAmount)}` : ""}`,
      href: `/export/quotes/${quote.id}`,
      badge: "报价",
    })),
    ...customer.orders.map((order) => ({
      id: `order-${order.id}`,
      type: "order",
      occurredAt: order.orderDate || order.createdAt,
      title: `订单 ${order.orderNo}`,
      description: `${paymentStatusLabel[order.paymentStatus] ?? order.paymentStatus}${order.totalAmount != null ? ` · ${String(order.totalAmount)}` : ""}`,
      href: `/export/orders/${order.id}`,
      badge: "订单",
    })),
    ...customer.tasks.map((task) => ({
      id: `task-${task.id}`,
      type: "task",
      occurredAt: task.createdAt,
      title: `任务 ${task.title}`,
      description: `${taskStatusLabel[task.status] ?? task.status}${task.dueDate ? ` · 截止 ${new Date(task.dueDate).toLocaleDateString("zh-CN")}` : ""}`,
      href: `/export/tasks/${task.id}`,
      badge: "任务",
    })),
  ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-800">{customer.companyName}</h1>
            {isOverdue && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                超7天未跟进
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            {customer.customerCode} · {customer.country ?? "-"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              打开官网
            </a>
          )}
          <button
            onClick={() => setDrawer("contact")}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            新增联系人
          </button>
          <button
            onClick={() => setDrawer("activity")}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            新增跟进
          </button>
          <button
            onClick={() => setDrawer("quote")}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            新建报价
          </button>
          <button
            onClick={() => setDrawer("task")}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            新建任务
          </button>
          <button
            onClick={() => setDrawer("edit")}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            编辑客户
          </button>
          <ExportDeleteButton
            apiPath={`/api/export/customers/${customerId}`}
            redirectTo="/export/customers"
            label="删除客户"
            className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50"
          />
          <Link
            href="/export/customers"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            返回
          </Link>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm lg:grid-cols-4">
        <div>
          <p className="text-slate-500">官网</p>
          {websiteUrl ? (
            <a href={websiteUrl} target="_blank" rel="noreferrer" className="font-medium text-teal-600 hover:underline">
              {websiteHost ?? customer.website}
            </a>
          ) : (
            <p className="font-medium text-slate-700">未填写</p>
          )}
        </div>
        <div>
          <p className="text-slate-500">主要联系人</p>
          <p className="font-medium text-slate-800">{primaryContact?.name ?? "-"}</p>
          <p className="text-slate-500">{primaryContact?.title ?? "未填写职位"}</p>
        </div>
        <div>
          <p className="text-slate-500">电话 / 邮箱</p>
          <p className="font-medium text-slate-800">{primaryContact?.phone ?? primaryContact?.whatsapp ?? "-"}</p>
          <p className="text-slate-500">{primaryContact?.email ?? "未填写邮箱"}</p>
        </div>
        <div>
          <p className="text-slate-500">负责人 / 来源</p>
          <p className="font-medium text-slate-800">{customer.owner.name}</p>
          <p className="text-slate-500">{customer.sourceChannel ?? "未填写来源"}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-4 font-medium text-slate-700">基本信息</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">网站</dt>
                <dd>
                  {websiteUrl ? (
                    <a href={websiteUrl} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline">
                      {customer.website}
                    </a>
                  ) : (
                    "-"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">城市</dt>
                <dd>{customer.city ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">地址</dt>
                <dd>{customer.address ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">客户类型</dt>
                <dd>{displayLabel(customerTypeLabel, customer.customerType)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">感兴趣产品</dt>
                <dd>{displayInterestedProductsList(customer.interestedProducts)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">行业</dt>
                <dd>{customer.industry ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">市场优先级</dt>
                <dd>{displayLabel(marketPriorityLabel, customer.marketPriority)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">价值等级</dt>
                <dd>{displayLabel(valueLevelLabel, customer.valueLevel)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">来源渠道</dt>
                <dd>{customer.sourceChannel ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">状态</dt>
                <dd>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                    {customerStatusLabel[customer.status] ?? customer.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">负责人</dt>
                <dd>{customer.owner.name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">上次跟进</dt>
                <dd>{customer.lastFollowUpAt ? new Date(customer.lastFollowUpAt).toLocaleDateString("zh-CN") : "-"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">下次跟进</dt>
                <dd
                  className={
                    isNextDue ? "font-medium text-amber-600" : ""
                  }
                >
                  {customer.nextFollowUpAt
                    ? new Date(customer.nextFollowUpAt).toLocaleDateString("zh-CN")
                    : "-"}
                  {isNextDue && " (待跟进)"}
                </dd>
              </div>
            </dl>
            {customer.notes && (
              <div className="mt-4">
                <dt className="text-slate-500">备注</dt>
                <dd className="mt-1 text-slate-700">{customer.notes}</dd>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-4 font-medium text-slate-700">客户时间轴</h2>
            <div className="space-y-3">
              {timelineItems.map((item) => (
                <div key={item.id} className="border-l-2 border-slate-200 pl-4 py-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{item.badge}</span>
                    <span className="text-slate-400">{new Date(item.occurredAt).toLocaleString("zh-CN")}</span>
                  </div>
                  {item.href ? (
                    <Link href={item.href} className="mt-1 block font-medium text-teal-600 hover:underline">
                      {item.title}
                    </Link>
                  ) : (
                    <p className="mt-1 font-medium text-slate-700">{item.title}</p>
                  )}
                  <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-4 font-medium text-slate-700">跟进记录</h2>
            <div className="space-y-3">
              {customer.activities.length === 0 ? (
                <p className="text-sm text-slate-500">暂无跟进记录</p>
              ) : (
                customer.activities.map((a) => (
                  <div key={a.id} className="border-l-2 border-slate-200 pl-4 py-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                        {activityTypeLabel[a.type] ?? a.type}
                      </span>
                      <span className="text-slate-500">{a.owner.name}</span>
                      <span className="text-slate-400">{new Date(a.createdAt).toLocaleString("zh-CN")}</span>
                      <ExportDeleteButton
                        apiPath={`/api/export/activities/${a.id}`}
                        onDeleted={() => fetchCustomer({ silent: true })}
                        label="删除"
                        className="ml-auto text-xs text-red-600 hover:underline disabled:opacity-50"
                      />
                    </div>
                    {a.subject && <p className="mt-1 font-medium text-slate-700">{a.subject}</p>}
                    {a.content && <p className="mt-1 text-sm text-slate-600">{a.content}</p>}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-medium text-slate-700">报价</h2>
              <button
                onClick={() => setDrawer("quote")}
                className="text-sm text-teal-600 hover:underline"
              >
                新建报价
              </button>
            </div>
            <ul className="space-y-2">
              {customer.quotes.length === 0 ? (
                <p className="text-sm text-slate-500">暂无报价</p>
              ) : (
                customer.quotes.map((q) => (
                  <li key={q.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/export/quotes/${q.id}`} className="flex-1 truncate text-teal-600 hover:underline">
                      {q.quoteNo} {q.totalAmount != null ? `· ${String(q.totalAmount)}` : ""}
                    </Link>
                    <span className="text-slate-400">{new Date(q.quoteDate).toLocaleDateString("zh-CN")}</span>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-xs ${
                        q.status === "won" ? "bg-green-50 text-green-700" : q.status === "lost" || q.status === "expired" ? "bg-slate-100 text-slate-500" : "bg-teal-50 text-teal-700"
                      }`}
                    >
                      {quoteStatusLabel[q.status] ?? q.status}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-medium text-slate-700">订单</h2>
              <Link
                href={`/export/orders/new?customerId=${customerId}`}
                className="text-sm text-teal-600 hover:underline"
              >
                新建订单
              </Link>
            </div>
            <ul className="space-y-2">
              {customer.orders.length === 0 ? (
                <p className="text-sm text-slate-500">暂无订单</p>
              ) : (
                customer.orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/export/orders/${o.id}`} className="flex-1 truncate text-teal-600 hover:underline">
                      {o.orderNo} {o.totalAmount != null ? `· ${String(o.totalAmount)}` : ""}
                    </Link>
                    <span className="text-slate-400">{new Date(o.orderDate).toLocaleDateString("zh-CN")}</span>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-xs ${
                        o.paymentStatus === "paid" ? "bg-green-50 text-green-700" : o.paymentStatus === "partial_paid" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {paymentStatusLabel[o.paymentStatus] ?? o.paymentStatus}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-medium text-slate-700">联系人</h2>
              <button
                onClick={() => setDrawer("contact")}
                className="text-sm text-teal-600 hover:underline"
              >
                新增
              </button>
            </div>
            <ul className="space-y-2">
              {customer.contacts.length === 0 ? (
                <p className="text-sm text-slate-500">暂无联系人</p>
              ) : (
                customer.contacts.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800">
                        {c.name}
                        {c.isPrimary && (
                          <span className="ml-1 rounded bg-teal-100 px-1 text-xs text-teal-700">主</span>
                        )}
                      </div>
                      <div className="text-slate-500">{c.title ?? "未填写职位"}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {c.email ?? "未填邮箱"} · {c.phone ?? c.whatsapp ?? "未填电话"}
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingContactId(c.id);
                          setDrawer("contactEdit");
                        }}
                        className="text-teal-600 hover:underline"
                      >
                        编辑
                      </button>
                      <ExportDeleteButton
                        apiPath={`/api/export/contacts/${c.id}`}
                        onDeleted={() => fetchCustomer({ silent: true })}
                        label="删除"
                        className="text-xs text-red-600 hover:underline disabled:opacity-50"
                      />
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-medium text-slate-700">任务</h2>
              <button
                onClick={() => setDrawer("task")}
                className="text-sm text-teal-600 hover:underline"
              >
                新建任务
              </button>
            </div>
            <ul className="space-y-2">
              {customer.tasks.length === 0 ? (
                <p className="text-sm text-slate-500">暂无任务</p>
              ) : (
                customer.tasks.map((t) => {
                  const isTaskOverdue = t.status !== "done" && t.dueDate && new Date(t.dueDate) < new Date();
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                      <Link href={`/export/tasks/${t.id}`} className="flex-1 truncate text-teal-600 hover:underline">
                        {t.title}
                      </Link>
                      <span className="text-slate-400">
                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString("zh-CN") : "-"}
                      </span>
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 text-xs ${
                          isTaskOverdue ? "bg-red-100 text-red-700" : t.status === "done" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isTaskOverdue ? "超期" : taskStatusLabel[t.status] ?? t.status}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Drawers */}
      <Drawer
        open={drawer === "contact"}
        onClose={closeDrawer}
        title="新增联系人"
      >
        <ContactFormClient
          customerId={customerId}
          onSuccess={handleFormSuccess}
          onCancel={closeDrawer}
        />
      </Drawer>

      <Drawer
        open={drawer === "contactEdit" && !!editingContact}
        onClose={closeDrawer}
        title="编辑联系人"
      >
        {editingContact && (
          <ContactFormClient
            customerId={customerId}
            contactId={editingContact.id}
            initial={editingContact}
            onSuccess={handleFormSuccess}
            onCancel={closeDrawer}
          />
        )}
      </Drawer>

      <Drawer open={drawer === "activity"} onClose={closeDrawer} title="新增跟进">
        <ActivityFormClient
          customerId={customerId}
          onSuccess={handleFormSuccess}
          onCancel={closeDrawer}
        />
      </Drawer>

      <Drawer open={drawer === "quote"} onClose={closeDrawer} title="新建报价" width="xl">
        <QuoteFormClient
          customerId={customerId}
          initial={{ customerId }}
          onSuccess={handleFormSuccess}
          onCancel={closeDrawer}
        />
      </Drawer>

      <Drawer open={drawer === "task"} onClose={closeDrawer} title="新建任务">
        <TaskFormClient
          customerId={customerId}
          initial={{ customerId }}
          onSuccess={handleFormSuccess}
          onCancel={closeDrawer}
        />
      </Drawer>

      <Drawer open={drawer === "edit"} onClose={closeDrawer} title="编辑客户" width="xl">
        <CustomerForm
          customerId={customerId}
          initial={customer as unknown as Record<string, unknown>}
          onSuccess={handleFormSuccess}
          onCancel={closeDrawer}
        />
      </Drawer>
    </div>
  );
}
