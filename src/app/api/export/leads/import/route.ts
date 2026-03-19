import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { parseInterestedProducts } from "@/lib/export/interested-products";

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = values[j] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

const FIELD_MAP: Record<string, string> = {
  companyName: "companyName",
  company_name: "companyName",
  company: "companyName",
  website: "website",
  country: "country",
  city: "city",
  address: "address",
  customerType: "customerType",
  customer_type: "customerType",
  sourceChannel: "sourceChannel",
  source_channel: "sourceChannel",
  sourceKeyword: "sourceKeyword",
  source_keyword: "sourceKeyword",
  email: "email",
  phone: "phone",
  whatsapp: "whatsapp",
  linkedin: "linkedin",
  mainBusiness: "mainBusiness",
  main_business: "mainBusiness",
  interestedProducts: "interestedProducts",
  interested_products: "interestedProducts",
  priority: "priority",
  notes: "notes",
};

export async function POST(request: NextRequest) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "请上传 CSV 文件" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV 为空或格式错误" }, { status: 400 });
    }

    let created = 0;
    for (const row of rows) {
      const data: Record<string, string> = {};
      for (const [key, val] of Object.entries(row)) {
        const mapped = FIELD_MAP[key] ?? key;
        if (val && mapped) data[mapped] = val;
      }
      if (!data.companyName) continue;

      await prisma.exportLead.create({
        data: {
          tenantId: ctx!.tenantId,
          companyName: data.companyName,
          website: data.website || undefined,
          country: data.country || undefined,
          city: data.city || undefined,
          address: data.address || undefined,
          customerType: data.customerType || undefined,
          sourceChannel: data.sourceChannel || undefined,
          sourceKeyword: data.sourceKeyword || undefined,
          email: data.email || undefined,
          phone: data.phone || undefined,
          whatsapp: data.whatsapp || undefined,
          linkedin: data.linkedin || undefined,
          mainBusiness: data.mainBusiness || undefined,
          interestedProducts: parseInterestedProducts(data.interestedProducts),
          priority: data.priority || undefined,
          notes: data.notes || undefined,
          ownerId: user!.id,
          status: "new",
        },
      });
      created++;
    }

    return NextResponse.json({ data: { created, total: rows.length } });
  } catch (e) {
    console.error("Import leads error:", e);
    return NextResponse.json({ error: "导入失败" }, { status: 500 });
  }
}
