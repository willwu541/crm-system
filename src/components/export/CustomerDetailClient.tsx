"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CUSTOMER_STATUSES,
  ACTIVITY_TYPES,
  QUOTE_STATUSES,
  PAYMENT_STATUSES,
  PRODUCTION_STATUSES,
  SHIPPING_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "@/lib/export-constants";
import { useToast } from "@/components/ui/Toast";
import { CustomerForm } from "./CustomerForm";
import { ContactFormClient } from "./ContactFormClient";
import { ActivityFormClient } from "./ActivityFormClient";
import { QuoteFormClient } from "./QuoteFormClient";
import { TaskFormClient } from "./TaskFormClient";
import { Drawer } from "./shared/Drawer";
import { toDisplayString } from "@/lib/export/interested-products";
import { ExportDeleteButton } from "./ExportDeleteButton";

interface Customer {
  id: string;
  customerCode: string;
  companyName: string;
  website: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  customerType: string | null;
  interestedProducts: string[];
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
  quotes: { id: string; quoteNo: string; totalAmount: string | null; status: string; quoteDate: string }[];
  orders: { id: string; orderNo: string; totalAmount: string | null; paymentStatus: string; productionStatus: string; shippingStatus: string; orderDate: string }[];
  tasks: { id: string; title: string; dueDate: string | null; priority: string; status: string }[];
}

const STATUS_LABELS: Record<string, string> = {
  to_develop: "待开发",
  developing: "开发中",
  replied: "已回复",
  quoted: "已报价",
  negotiating: "谈判中",
  won: "已成交",
  paused: "暂停",
  lost: "已流失",
};

const ACTIVITY_LABELS: Record<string, string> = {
  email: "邮件",
  call: "电话",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  meeting: "会议",
  quote_followup: "报价跟进",
  other: "其他",
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  sent: "已发送",
  replied: "已回复",
  negotiating: "谈判中",
  won: "已成交",
  lost: "已流失",
  expired: "已过期",
};

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
      const json = await res.json();
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-4 font-medium text-slate-700">基本信息</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">网站</dt>
                <dd>
                  {customer.website ? (
                    <a href={customer.website} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline">
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
                <dd>{customer.customerType ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">感兴趣产品</dt>
                <dd>{toDisplayString(customer.interestedProducts) || "-"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">状态</dt>
                <dd>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                    {STATUS_LABELS[customer.status] ?? customer.status}
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
            <h2 className="mb-4 font-medium text-slate-700">跟进记录</h2>
            <div className="space-y-3">
              {customer.activities.length === 0 ? (
                <p className="text-sm text-slate-500">暂无跟进记录</p>
              ) : (
                customer.activities.map((a) => (
                  <div key={a.id} className="border-l-2 border-slate-200 pl-4 py-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                        {ACTIVITY_LABELS[a.type] ?? a.type}
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
                      {QUOTE_STATUS_LABELS[q.status] ?? q.status}
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
                      {o.paymentStatus === "paid" ? "已付" : o.paymentStatus === "partial_paid" ? "部分付" : "未付"}
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
                  <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {c.name}
                      {c.isPrimary && (
                        <span className="ml-1 rounded bg-teal-100 px-1 text-xs text-teal-700">主</span>
                      )}
                    </span>
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
                        {isTaskOverdue ? "超期" : t.status === "todo" ? "待办" : t.status === "in_progress" ? "进行中" : "完成"}
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
