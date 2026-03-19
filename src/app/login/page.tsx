"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-xl font-semibold text-teal-800">
          客户报价系统
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">登录入口</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTenant("domestic")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  tenant === "domestic"
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                内贸
              </button>
              <button
                type="button"
                onClick={() => setTenant("export")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  tenant === "export"
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                外贸
              </button>
            </div>
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              邮箱
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="admin@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] rounded-lg bg-teal-600 px-4 py-3 font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">加载中...</div>}>
      <LoginForm />
    </Suspense>
  );
}
