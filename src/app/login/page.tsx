"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Building2, Globe, ArrowRight } from "lucide-react";

type Tenant = "domestic" | "export";

const ITEMS = [
  { icon: "👤", text: "线索录入 → 一键转化客户" },
  { icon: "💰", text: "报价下单 → 实时生产追踪" },
  { icon: "📊", text: "回款统计 → 业绩一目了然" },
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
      {/* ======== 左侧 - Hero 区 ======== */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* 产品背景图 + 渐变遮罩 */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-bg.jpg"
            alt="Steel Grating Platform System"
            fill
            className="object-cover"
            priority
            sizes="50vw"
          />
        </div>
        <div
          className="absolute inset-0 z-10"
          style={{
            background:
              "linear-gradient(90deg, rgba(6,11,20,.98) 0%, rgba(6,11,20,.88) 35%, rgba(6,11,20,.40) 65%, rgba(6,11,20,.12) 100%)",
          }}
        />

        {/* 内容层 */}
        <div className="relative z-20 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* 顶部 Logo + 标题 */}
          <div>
            <Image
              src="/logo.webp"
              alt="Wiberg Metal"
              width={160}
              height={44}
              className="mb-10"
            />
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight tracking-tight mb-3">
              客户报价管理
              <br />
              <span className="text-[#0ea5e9]">系统</span>
            </h1>
            <p className="text-base text-slate-400 max-w-sm leading-relaxed">
              钢格板内贸 & 外贸一站式管理平台
              <br />
              从线索到回款，每个环节有据可查
            </p>
          </div>

          {/* 功能卖点 */}
          <div className="space-y-4">
            {ITEMS.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-[15px] text-slate-300"
              >
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          {/* 底部 */}
          <div className="pt-6 border-t border-white/10">
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} Wiberg Metal. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* ======== 右侧 - 登录区 ======== */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-[380px]">
          {/* 移动端 Logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Image
              src="/logo.webp"
              alt="Wiberg Metal"
              width={140}
              height={38}
            />
          </div>

          {/* 标题 */}
          <h2 className="text-[22px] font-semibold text-[#0f172a] mb-1">登录</h2>
          <p className="text-sm text-[#64748b] mb-6">选择入口，进入管理系统</p>

          {/* 登录卡片 */}
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-8 shadow-[0_2px_8px_rgba(15,23,42,.04)]">
            {/* 入口切换 */}
            <div className="mb-5">
              <label className="mb-2 block text-[13px] font-medium text-[#64748b]">
                登录入口
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTenant("domestic")}
                  className={`flex items-center justify-center gap-2 rounded-[10px] border-2 px-4 py-2.5 text-[14px] font-semibold transition-all active:scale-[0.98] ${
                    tenant === "domestic"
                      ? "border-[#0369a1] bg-[#f0f9ff] text-[#0369a1]"
                      : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#cbd5e1] hover:text-[#0f172a]"
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  内贸
                </button>
                <button
                  type="button"
                  onClick={() => setTenant("export")}
                  className={`flex items-center justify-center gap-2 rounded-[10px] border-2 px-4 py-2.5 text-[14px] font-semibold transition-all active:scale-[0.98] ${
                    tenant === "export"
                      ? "border-[#0369a1] bg-[#f0f9ff] text-[#0369a1]"
                      : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#cbd5e1] hover:text-[#0f172a]"
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
                <div className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-[13px] font-medium text-[#64748b]"
                >
                  邮箱
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-[12px] border border-[#cbd5e1] px-3 py-[11px] text-[15px] text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#0369a1] focus:outline-none focus:ring-2 focus:ring-[#0369a1]/15 transition-all"
                  placeholder="请输入邮箱"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-[13px] font-medium text-[#64748b]"
                >
                  密码
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-[12px] border border-[#cbd5e1] px-3 py-[11px] text-[15px] text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#0369a1] focus:outline-none focus:ring-2 focus:ring-[#0369a1]/15 transition-all"
                  placeholder="请输入密码"
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-[10px] bg-[#0369a1] px-4 py-3 text-[14px] font-semibold text-white hover:bg-[#0284c7] hover:shadow-[0_4px_20px_rgba(3,105,161,.35)] active:scale-[0.98] disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                style={{ transition: "transform .15s, box-shadow .2s, background .2s" }}
              >
                {loading ? (
                  "登录中..."
                ) : (
                  <>
                    进入{tenant === "domestic" ? "内贸" : "外贸"}系统
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-[#e2e8f0]">
              <p className="text-center text-[12px] text-[#94a3b8]">
                Wiberg Metal &copy; {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="text-[#94a3b8] text-sm">加载中...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
