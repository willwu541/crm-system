import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { SupplierForm } from "@/components/suppliers/SupplierForm";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSession();
  if (!user) return null;

  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">加工户详情 - {supplier.name}</h1>
        <Link
          href="/suppliers"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          返回列表
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <SupplierForm
          supplierId={id}
          initial={{
            name: supplier.name,
            contactName: supplier.contactName,
            contactPhone: supplier.contactPhone,
            address: supplier.address ?? "",
            remark: supplier.remark ?? "",
          }}
        />
      </div>
    </div>
  );
}
