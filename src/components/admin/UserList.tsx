"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { parseResponseJson } from "@/lib/parse-response-json";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  tenant: string;
  createdAt: string;
}

export function UserList() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"ADMIN" | "SALES">("SALES");
  const [tenant, setTenant] = useState<"domestic" | "export">("domestic");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"ADMIN" | "SALES">("SALES");
  const [editTenant, setEditTenant] = useState<"domestic" | "export">("domestic");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPassword, setEditPassword] = useState("");

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

  useEffect(() => {
    fetchUsers();
  }, []);

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
    setEditRole(user.role as "ADMIN" | "SALES");
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
                onChange={(e) => setRole(e.target.value as "ADMIN" | "SALES")}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              >
                <option value="SALES">业务员</option>
                <option value="ADMIN">管理员</option>
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
                      {u.role === "ADMIN" ? "管理员" : "业务员"}
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
                  onChange={(e) => setEditRole(e.target.value as "ADMIN" | "SALES")}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="SALES">业务员</option>
                  <option value="ADMIN">管理员</option>
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
