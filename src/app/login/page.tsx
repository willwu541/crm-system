"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Building2, Globe, ArrowRight, CheckCircle2 } from "lucide-react";

type Tenant = "domestic" | "export";

const PRODUCTS = [
  { name: "钢格板", src: "/product-bar-grating.jpg" },
  { name: "踏步板", src: "/product-stair-tread.jpg" },
  { name: "沟盖板", src: "/product-trench-cover.jpg" },
  { name: "FRP格栅", src: "/product-frp.jpg" },
];

const STATS = [
  { value: "10+", label: "年行业经验" },
  { value: "5000+", label: "服务客户" },
  { value: "50+", label: "出口国家" },
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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant, email, password }), credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "登录失败"); return; }
      router.push(tenant === "domestic"
        ? (redirect.startsWith("/export") ? "/dashboard" : redirect)
        : redirect.startsWith("/export") ? redirect : "/export/dashboard");
      router.refresh();
    } catch { setError("网络错误"); } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen">
      {/* LEFT Hero */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <Image src="/hero-bg.jpg" alt="" fill className="object-cover" priority sizes="55vw" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(6,11,20,.97) 0%, rgba(6,11,20,.85) 40%, rgba(6,11,20,.30) 75%, rgba(6,11,20,.10) 100%)" }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-14 w-full">
          <div>
            <Image src="/logo.webp" alt="Wiberg Metal" width={160} height={44} className="mb-8" />
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/5 px-3 py-1">
              <CheckCircle2 className="h-3 w-3 text-teal-400" />
              <span className="text-[11px] font-medium text-teal-300 tracking-wide">CRM 客户报价管理系统</span>
            </div>
            <h1 className="text-[40px] xl:text-[46px] font-extrabold text-white leading-[1.1] tracking-[-0.02em] mb-3">
              从线索到回款<br /><span className="text-[#0ea5e9]">一站式管理</span>
            </h1>
            <p className="text-base text-slate-400 max-w-md">专为钢格板行业打造的内外贸客户管理系统</p>
          </div>

          <div className="grid grid-cols-4 gap-3 my-auto py-6">
            {PRODUCTS.map((p) => (
              <div key={p.name} className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm">
                <Image src={p.src} alt={p.name} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="25vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <p className="absolute bottom-2 left-2 text-[11px] font-semibold text-white">{p.name}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center gap-8 mb-6">
              {STATS.map((s, i) => (
                <div key={i} className="flex items-center gap-6">
                  <div><div className="text-2xl font-bold text-white">{s.value}</div><div className="text-[11px] text-slate-500 mt-0.5">{s.label}</div></div>
                  {i < STATS.length - 1 && <div className="w-px h-8 bg-white/10" />}
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-white/10"><p className="text-[11px] text-slate-600">&copy; {new Date().getFullYear()} Wiberg Metal.</p></div>
          </div>
        </div>
      </div>

      {/* RIGHT Form */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden mb-8 flex justify-center"><Image src="/logo.webp" alt="Wiberg Metal" width={140} height={38} /></div>
          <h2 className="text-[22px] font-bold text-[#0f172a] mb-1">登录系统</h2>
          <p className="text-sm text-[#64748b] mb-6">选择入口，进入管理后台</p>

          <div className="rounded-xl border border-[#e2e8f0] bg-white p-8 shadow-[0_2px_8px_rgba(15,23,42,.04)]">
            <div className="mb-5">
              <label className="mb-2 block text-[13px] font-semibold text-[#64748b]">登录入口</label>
              <div className="grid grid-cols-2 gap-2">
                {([["domestic", "内贸", Building2], ["export", "外贸", Globe]] as const).map(([key, label, Icon]) => (
                  <button key={key} type="button" onClick={() => setTenant(key)}
                    className={`flex items-center justify-center gap-2 rounded-[10px] border-2 px-4 py-2.5 text-[14px] font-semibold transition-all active:scale-[0.98] ${tenant === key ? "border-[#0369a1] bg-[#f0f9ff] text-[#0369a1]" : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#cbd5e1] hover:text-[#0f172a]"}`}>
                    <Icon className="h-4 w-4" />{label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</div>}
              <div>
                <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-[#64748b]">邮箱</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-[12px] border border-[#cbd5e1] px-3 py-[11px] text-[15px] text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#0369a1] focus:outline-none focus:ring-2 focus:ring-[#0369a1]/15 transition-all" placeholder="请输入邮箱" required autoComplete="email" />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold text-[#64748b]">密码</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-[12px] border border-[#cbd5e1] px-3 py-[11px] text-[15px] text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#0369a1] focus:outline-none focus:ring-2 focus:ring-[#0369a1]/15 transition-all" placeholder="请输入密码" required autoComplete="current-password" />
              </div>
              <button type="submit" disabled={loading} className="w-full rounded-[10px] bg-[#0369a1] px-4 py-3 text-[14px] font-semibold text-white hover:bg-[#0284c7] hover:shadow-[0_4px_20px_rgba(3,105,161,.35)] active:scale-[0.98] disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                {loading ? "登录中..." : <>进入{tenant === "domestic" ? "内贸" : "外贸"}系统 <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
            <div className="mt-5 pt-4 border-t border-[#e2e8f0]"><p className="text-center text-[12px] text-[#94a3b8]">Wiberg Metal &copy; {new Date().getFullYear()}</p></div>
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {["钢格板", "踏步板", "沟盖板", "FRP格栅", "护栏", "梯子"].map(tag => (
              <span key={tag} className="rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1 text-[11px] text-[#64748b]">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-white"><div className="text-[#94a3b8] text-sm">加载中...</div></div>}><LoginForm /></Suspense>;
}
