"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Globe } from "lucide-react";

type Tenant = "domestic" | "export";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenant, setTenant] = useState<Tenant>("domestic");
  const defaultRedirect = tenant === "domestic" ? "/dashboard" : "/export/dashboard";
  const redirect = searchParams.get("redirect") ?? defaultRedirect;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant, email, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "登录失败");
        return;
      }
      const finalRedirect =
        tenant === "domestic"
          ? (redirect.startsWith("/export") ? "/dashboard" : redirect)
          : redirect.startsWith("/export")
            ? redirect
            : "/export/dashboard";
      router.push(finalRedirect);
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-teal-50/30 px-4">
      <div className="w-full max-w-[400px]">
        {/* Logo / 品牌区 */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-500/20">
            <span className="text-2xl font-bold text-white">格</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">钢格板客户报价系统</h1>
          <p className="mt-1.5 text-sm text-slate-500">内贸 / 外贸 · 一站式管理</p>
        </div>

        {/* 登录卡片 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
          {/* 入口切换 */}
          <div className="mb-6">
            <label className="mb-2.5 block text-sm font-medium text-slate-600">
              选择登录入口
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTenant("domestic")}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                  tenant === "domestic"
                    ? "border-teal-500 bg-teal-50 text-teal-700 shadow-sm"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                <Building2 className="h-4 w-4" />
                内贸
              </button>
              <button
                type="button"
                onClick={() => setTenant("export")}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                  tenant === "export"
                    ? "border-teal-500 bg-teal-50 text-teal-700 shadow-sm"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                <Globe className="h-4 w-4" />
                外贸
              </button>
            </div>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-600">
                邮箱
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                placeholder="请输入邮箱"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-600">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                placeholder="请输入密码"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm shadow-teal-500/25 hover:from-teal-700 hover:to-teal-600 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {loading ? "登录中..." : `进入${tenant === "domestic" ? "内贸" : "外贸"}系统`}
            </button>
          </form>
        </div>

        {/* 底部 */}
        <p className="mt-6 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} 钢格板CRM · 客户报价管理系统
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-teal-50/30">
        <div className="animate-pulse text-slate-400">加载中...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
