"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Globe, ArrowRight, ShieldCheck, BarChart3, Users } from "lucide-react";

type Tenant = "domestic" | "export";

const FEATURES = [
  { icon: Users, text: "线索转客户，一键转化" },
  { icon: BarChart3, text: "报价订单，全流程追踪" },
  { icon: ShieldCheck, text: "回款管理，一目了然" },
];

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
    <div className="flex min-h-screen">
      {/* 左侧品牌区 */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950">
        {/* 钢格板网格背景 */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }}
        />
        {/* 十字网格叠加 */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,.15) 2px, transparent 2px),
              linear-gradient(90deg, rgba(255,255,255,.15) 2px, transparent 2px)
            `,
            backgroundSize: "96px 96px",
          }}
        />
        {/* 底部光晕 */}
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-cyan-500/8 blur-3xl" />

        {/* 内容 */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16">
          {/* 顶部 */}
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-500/20">
                <span className="text-lg font-bold text-white">格</span>
              </div>
              <div>
                <p className="text-xs font-medium tracking-widest text-teal-300/80 uppercase">WIBERG METAL</p>
                <p className="text-sm font-semibold text-white">钢格板 CRM 系统</p>
              </div>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              从线索到回款
              <br />
              <span className="text-teal-300">一站式管理</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-md leading-relaxed">
              专为钢格板行业打造的内外贸客户报价管理系统，
              让每个销售环节都有据可查。
            </p>
          </div>

          {/* 功能列表 */}
          <div className="space-y-4 mb-10">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                  <f.icon className="h-4 w-4 text-teal-400" />
                </div>
                <span className="text-sm">{f.text}</span>
              </div>
            ))}
          </div>

          {/* 底部 */}
          <div className="pt-6 border-t border-white/10">
            <div className="flex items-center gap-6 text-xs text-slate-500">
              <span>&copy; {new Date().getFullYear()} Wiberg Metal</span>
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              <span>钢格板 · 踏步板 · 沟盖板</span>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧登录区 */}
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50/30 px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* 移动端 Logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-md">
              <span className="text-xl font-bold text-white">格</span>
            </div>
            <h1 className="text-xl font-semibold text-slate-800">钢格板客户报价系统</h1>
          </div>

          {/* 卡片 */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-800">欢迎回来</h2>
              <p className="mt-1 text-sm text-slate-500">选择入口，登录系统</p>
            </div>

            {/* 入口选择 */}
            <div className="mb-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTenant("domestic")}
                className={`group flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                  tenant === "domestic"
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-teal-200 hover:text-teal-600"
                }`}
              >
                <Building2 className={`h-4 w-4 transition-colors ${tenant === "domestic" ? "text-teal-600" : "text-slate-400 group-hover:text-teal-500"}`} />
                内贸
              </button>
              <button
                type="button"
                onClick={() => setTenant("export")}
                className={`group flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                  tenant === "export"
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-teal-200 hover:text-teal-600"
                }`}
              >
                <Globe className={`h-4 w-4 transition-colors ${tenant === "export" ? "text-teal-600" : "text-slate-400 group-hover:text-teal-500"}`} />
                外贸
              </button>
            </div>

            {/* 表单 */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-in">
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
                className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm shadow-teal-500/25 hover:from-teal-700 hover:to-teal-600 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? "登录中..." : (
                  <>
                    进入{tenant === "domestic" ? "内贸" : "外贸"}系统
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* 底部提示 */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                系统运行中
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Wiberg Metal · 钢格板客户报价管理系统
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-slate-400">加载中...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
