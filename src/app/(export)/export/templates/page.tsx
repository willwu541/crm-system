import { TemplatesClient } from "@/components/export/TemplatesClient";
import { SignatureCard } from "@/components/export/SignatureCard";

export default function Page() {
  return (
    <main className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">邮件 / 沟通模板</h1>
      <p className="text-sm text-slate-500">
        团队共享的开发信、跟进、报价跟进等模板。支持变量替换（如 {`{{customer.companyName}}`}），新增跟进时可一键套用。
      </p>
      <SignatureCard />
      <TemplatesClient />
    </main>
  );
}
