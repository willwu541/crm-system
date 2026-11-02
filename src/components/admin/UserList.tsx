"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { parseResponseJson } from "@/lib/parse-response-json";
import { formatRole } from "@/lib/role-labels";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  tenant: string;
  createdAt: string;
}

type PolicyState = {
  directorUserId: string | null;
  directorName: string | null;
  canView: Record<string, string[]>;
  canUsePool: Record<string, boolean>;
  canClaim: boolean;
  canEdit: boolean;
  canEditPool: boolean;
};

export function UserList() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [policy, setPolicy] = useState<PolicyState | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MANAGER" | "SALES">("SALES");
  const [tenant, setTenant] = useState<"domestic" | "export">("domestic");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [offboardingId, setOffboardingId] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [meRole, setMeRole] = useState<string | null>(null);
  const [meTenant, setMeTenant] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"ADMIN" | "MANAGER" | "SALES">("SALES");
  const [editTenant, setEditTenant] = useState<"domestic" | "export">("domestic");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPassword, setEditPassword] = useState("");
  const [poolLeadDays, setPoolLeadDays] = useState(30);
  const [poolCustomerDays, setPoolCustomerDays] = useState(60);
  const [savingPoolRules, setSavingPoolRules] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j: { user?: { id: string; role: string; tenant?: string } }) => {
        if (j.user) {
          setMeId(j.user.id);
          setMeRole(j.user.role);
          setMeTenant(j.user.tenant ?? null);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (meTenant !== "domestic") return;
    fetch("/api/admin/pool-settings")
      .then((r) => r.json())
      .then((j: { data?: { leadDays?: number; customerDays?: number } }) => {
        if (j.data?.leadDays) setPoolLeadDays(j.data.leadDays);
        if (j.data?.customerDays) setPoolCustomerDays(j.data.customerDays);
      })
      .catch(() => {});
  }, [meTenant]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const json = await parseResponseJson<{ data?: User[] }>(res);
      if (res.ok) setUsers(json.data || []);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPolicy() {
    const res = await fetch("/api/admin/access-policy");
    const json = await parseResponseJson<{ data?: PolicyState }>(res);
    if (res.ok && json.data) {
      setPolicy({
        ...json.data,
        canView: json.data.canView ?? {},
        canUsePool: json.data.canUsePool ?? {},
        canEditPool: json.data.canEditPool === true,
      });
    }
  }

  useEffect(() => {
    fetchUsers();
    void fetchPolicy();
  }, []);

  async function claimDirector() {
    setSavingPolicy(true);
    try {
      const res = await fetch("/api/admin/access-policy", { method: "POST" });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "设置失败");
      toast("已设为业务经理");
      await fetchPolicy();
    } catch (e) {
      setError(e instanceof Error ? e.message : "设置失败");
    } finally {
      setSavingPolicy(false);
    }
  }

  async function savePolicyPatch(body: {
    canView?: Record<string, string[]>;
    canUsePool?: Record<string, boolean>;
  }) {
    setSavingPolicy(true);
    try {
      const res = await fetch("/api/admin/access-policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "保存失败");
      await fetchPolicy();
      toast("已保存");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSavingPolicy(false);
    }
  }

  function toggleCanView(viewerId: string, ownerId: string) {
    if (!policy?.canEdit) return;
    const current = new Set(policy.canView[viewerId] ?? []);
    if (current.has(ownerId)) current.delete(ownerId);
    else current.add(ownerId);
    void savePolicyPatch({
      canView: {
        ...policy.canView,
        [viewerId]: Array.from(current),
      },
    });
  }

  async function toggleCanUsePool(userId: string) {
    if (!policy?.canEditPool) return;
    const current = policy.canUsePool[userId] !== false;
    const next = {
      ...policy.canUsePool,
      [userId]: !current,
    };
    setPolicy({ ...policy, canUsePool: next });
    setSavingPolicy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/access-policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canUsePool: next }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "保存失败");
      await fetchPolicy();
      toast(current ? "已关闭公海" : "已打开公海");
    } catch (e) {
      setPolicy({ ...policy, canUsePool: policy.canUsePool });
      setError(e instanceof Error ? e.message : "保存失败");
      toast(e instanceof Error ? e.message : "保存失败", "error");
    } finally {
      setSavingPolicy(false);
    }
  }

  async function saveDomesticPoolRules(e: React.FormEvent) {
    e.preventDefault();
    setSavingPoolRules(true);
    setError("");
    try {
      const res = await fetch("/api/admin/pool-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadDays: poolLeadDays, customerDays: poolCustomerDays }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "保存失败");
      toast("公海规则已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
      toast(err instanceof Error ? err.message : "保存失败", "error");
    } finally {
      setSavingPoolRules(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, role, tenant }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "创建失败");
      setShowForm(false);
      setEmail("");
      setPassword("");
      setName("");
      setRole("SALES");
      setTenant("domestic");
      fetchUsers();
      toast("用户创建成功");
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(user: User) {
    setEditing(user);
    setEditName(user.name);
    setEditRole(user.role as "ADMIN" | "MANAGER" | "SALES");
    setEditTenant(user.tenant as "domestic" | "export");
    setEditIsActive(user.isActive);
    setEditPassword("");
    setError("");
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSavingEdit(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          role: editRole,
          tenant: editTenant,
          isActive: editIsActive,
          password: editPassword || undefined,
        }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "更新失败");
      toast("用户已更新");
      setEditing(null);
      fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新失败");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleOffboard(user: User) {
    if (!confirm(`办理 ${user.name} 的离职交接？账号会立即停用。未转化的外贸线索退回公海，客户和已经在跟的资料交给在职管理员，不会删除。`)) return;
    setOffboardingId(user.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${user.id}/offboard`, { method: "POST" });
      const json = await parseResponseJson<{ error?: string; data?: { releasedLeads: number; reassignedCustomers: number; heirName: string } }>(res);
      if (!res.ok) throw new Error(json.error ?? "交接失败");
      const d = json.data;
      toast(
        d
          ? `已停用。公海退回 ${d.releasedLeads} 条线索，${d.reassignedCustomers} 个客户交给 ${d.heirName}`
          : "已办理离职",
      );
      fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "交接失败");
    } finally {
      setOffboardingId(null);
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`确认删除用户 ${user.name}（${user.email}）？`)) return;
    setDeletingId(user.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "删除失败");
      toast("用户已删除");
      fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {policy?.canClaim && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-800">业务经理</p>
              <p className="text-xs text-slate-500">全公司仅你一人能勾谁可以看谁的资料</p>
            </div>
            <button
              type="button"
              onClick={() => void claimDirector()}
              disabled={savingPolicy}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white disabled:opacity-50"
            >
              设为我的职位
            </button>
          </div>
        </div>
      )}

      {meTenant === "domestic" && meRole === "ADMIN" && (
        <form
          onSubmit={(e) => void saveDomesticPoolRules(e)}
          className="rounded-lg border border-amber-200 bg-amber-50/40 p-4"
        >
          <p className="mb-1 text-sm font-medium text-slate-800">内贸公海规则</p>
          <p className="mb-3 text-xs text-slate-500">
            超过设定天数未联系的线索/客户将自动进入公海。跑单需手动标记，不受此规则影响。
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">线索未联系天数</label>
              <input
                type="number"
                min={7}
                max={365}
                value={poolLeadDays}
                onChange={(e) => setPoolLeadDays(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">客户未联系天数</label>
              <input
                type="number"
                min={7}
                max={365}
                value={poolCustomerDays}
                onChange={(e) => setPoolCustomerDays(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingPoolRules}
            className="mt-3 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {savingPoolRules ? "保存中..." : "保存公海规则"}
          </button>
        </form>
      )}

      {policy?.canEditPool && (() => {
        const exportPeople = users.filter((item) => {
          if (item.tenant !== "export" || !item.isActive) return false;
          const isDirectorUser = item.id === policy.directorUserId;
          return !(item.role === "ADMIN" && !isDirectorUser);
        });
        return (
          <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-4">
            <p className="mb-1 text-sm font-medium text-slate-800">外贸公海权限</p>
            <p className="mb-3 text-xs text-slate-500">
              打开后，对方可看并认领公海线索；关掉后只能看自己的。管理者本人始终可用。
            </p>
            <div className="space-y-2">
              {exportPeople.map((viewer) => {
                const isDirectorUser = viewer.id === policy.directorUserId;
                const poolOn = policy.canUsePool[viewer.id] !== false;
                return (
                  <div
                    key={viewer.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-teal-100 bg-white px-3 py-2"
                  >
                    <span className="text-sm text-slate-800">
                      {viewer.name}
                      <span className="ml-1 text-xs text-slate-400">
                        {formatRole(viewer.role, isDirectorUser)}
                      </span>
                    </span>
                    <label className="flex cursor-pointer items-center gap-1.5 text-sm text-teal-800">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={poolOn}
                        disabled={savingPolicy}
                        onChange={() => void toggleCanUsePool(viewer.id)}
                      />
                      可看公海
                    </label>
                  </div>
                );
              })}
              {exportPeople.length === 0 ? (
                <p className="text-xs text-slate-400">还没有可配置的业务员或业务经理</p>
              ) : null}
            </div>
          </div>
        );
      })()}

      {policy?.canEdit && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-2 text-sm font-medium text-slate-800">谁可以看谁的资料</p>
          <p className="mb-2 text-xs text-slate-500">
            勾上某个人，对方就能看那个人的线索和客户。管理者看全部。
          </p>
          <div className="space-y-3">
            {(["domestic", "export"] as const).map((tenant) => {
              const group = users.filter((item) => item.tenant === tenant && item.isActive);
              if (group.length === 0) return null;
              return (
                <div key={tenant}>
                  <p className="mb-1 text-xs font-medium text-slate-500">{tenant === "export" ? "外贸" : "内贸"}</p>
                  <div className="space-y-2">
                    {group.map((viewer) => {
                      const others = group.filter((item) => item.id !== viewer.id);
                      const isDirectorUser = viewer.id === policy.directorUserId;
                      return (
                        <div key={viewer.id} className="rounded-md bg-slate-50 px-3 py-2">
                          <p className="text-sm text-slate-800">
                            {viewer.name}
                            <span className="ml-1 text-xs text-slate-400">
                              {formatRole(viewer.role, isDirectorUser)}
                            </span>
                          </p>
                          {isDirectorUser || viewer.role === "ADMIN" ? (
                            <p className="mt-1 text-xs text-slate-500">可看全部</p>
                          ) : (
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                              {others.map((owner) => (
                                <label key={owner.id} className="flex items-center gap-1 text-xs text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={(policy.canView[viewer.id] ?? []).includes(owner.id)}
                                    disabled={!policy.canEdit || savingPolicy}
                                    onChange={() => toggleCanView(viewer.id, owner.id)}
                                  />
                                  {owner.name}
                                </label>
                              ))}
                              {others.length === 0 ? <span className="text-xs text-slate-400">没有其他人</span> : null}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowForm(!showForm)}
        className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
      >
        {showForm ? "取消" : "新建用户"}
      </button>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">邮箱 *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">密码 *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">姓名 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">角色</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "ADMIN" | "MANAGER" | "SALES")}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              >
                <option value="SALES">业务员</option>
                <option value="MANAGER">经理</option>
                <option value="ADMIN">管理者</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">入口</label>
              <select
                value={tenant}
                onChange={(e) => setTenant(e.target.value as "domestic" | "export")}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              >
                <option value="domestic">内贸</option>
                <option value="export">外贸</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting ? "创建中..." : "创建"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              取消
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-slate-500">加载中...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">邮箱</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">姓名</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">角色</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">状态</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">入口</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">创建时间</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                      {formatRole(u.role, u.id === policy?.directorUserId)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {u.isActive ? "启用" : "停用"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                      {u.tenant === "export" ? "外贸" : "内贸"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 text-sm">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="text-teal-700 hover:underline"
                      >
                        编辑
                      </button>
                      {meRole === "ADMIN" && u.isActive && u.id !== meId && (
                        <button
                          type="button"
                          onClick={() => handleOffboard(u)}
                          disabled={offboardingId === u.id}
                          className="text-amber-700 hover:underline disabled:opacity-50"
                        >
                          {offboardingId === u.id ? "交接中..." : "离职交接"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(u)}
                        disabled={deletingId === u.id}
                        className="text-red-600 hover:underline disabled:opacity-50"
                      >
                        {deletingId === u.id ? "删除中..." : "删除"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setEditing(null)} aria-hidden />
          <form
            onSubmit={handleEditSubmit}
            className="relative w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h2 className="mb-4 text-lg font-semibold text-slate-800">编辑用户</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">邮箱（不可修改）</label>
                <input
                  type="text"
                  value={editing.email}
                  readOnly
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">姓名 *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">角色</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as "ADMIN" | "MANAGER" | "SALES")}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="SALES">业务员</option>
                  <option value="MANAGER">经理</option>
                  <option value="ADMIN">管理者</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">入口</label>
                <select
                  value={editTenant}
                  onChange={(e) => setEditTenant(e.target.value as "domestic" | "export")}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="domestic">内贸</option>
                  <option value="export">外贸</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">账号状态</label>
                <select
                  value={editIsActive ? "active" : "inactive"}
                  onChange={(e) => setEditIsActive(e.target.value === "active")}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="active">启用</option>
                  <option value="inactive">停用</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">重置密码（可选）</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  minLength={6}
                  placeholder="留空则不修改"
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {savingEdit ? "保存中..." : "保存修改"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
