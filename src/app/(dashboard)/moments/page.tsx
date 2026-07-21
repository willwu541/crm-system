import { MomentListClient } from "@/components/moments/MomentListClient";

export default function MomentsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">朋友圈文案库</h1>
      <p className="mb-4 text-sm text-slate-500">管理员和经理可以预设文案，业务员参考发送。每天提醒发送朋友圈。</p>
      <MomentListClient />
    </div>
  );
}
