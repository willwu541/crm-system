import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 支持 CSV 和简单的制表符分隔文本
function parseRows(text: string): string[][] {
  // 尝试检测分隔符
  const firstLine = text.split("\n")[0] || "";
  const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

  return text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line =>
      line.split(delimiter).map(cell =>
        cell.replace(/^["']|["']$/g, "").trim()
      )
    );
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic" || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const text = await request.text();
    if (!text.trim()) {
      return NextResponse.json({ error: "文件内容为空" }, { status: 400 });
    }

    const rows = parseRows(text);
    if (rows.length < 2) {
      return NextResponse.json({ error: "至少需要标题行和一行数据" }, { status: 400 });
    }

    // 第一行是标题，解析列映射
    const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, ""));
    const dataRows = rows.slice(1);

    // 列名映射（兼容常见的中英文列名）
    const COL_MAP: Record<string, string> = {
      "公司名称": "companyName", "公司": "companyName", "company": "companyName", "companyname": "companyName",
      "联系人": "contactName", "姓名": "contactName", "name": "contactName", "contactname": "contactName",
      "电话": "contactPhone", "手机": "contactPhone", "phone": "contactPhone", "contactphone": "contactPhone",
      "微信": "wechat", "wechat": "wechat",
      "地区": "region", "region": "region",
      "来源": "source", "source": "source",
      "行业": "industry", "industry": "industry",
      "需求": "productNeed", "产品需求": "productNeed", "productneed": "productNeed",
      "意向": "intention", "intention": "intention",
      "备注": "remark", "remark": "remark",
    };

    const colIndexes = headers.map((h, i) => ({ col: COL_MAP[h], index: i }))
      .filter(c => c.col);

    if (colIndexes.length === 0) {
      return NextResponse.json({ error: "未能识别任何有效列，请确保包含公司名称/联系人/电话等列" }, { status: 400 });
    }

    let success = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const data: Record<string, string> = {};
      for (const ci of colIndexes) {
        const val = row[ci.index];
        if (val) data[ci.col] = val;
      }

      if (!data.companyName && !data.contactName && !data.contactPhone) {
        skipped++;
        continue;
      }

      try {
        await prisma.lead.create({
          data: {
            companyName: (data.companyName || `未知公司${i + 1}`).trim(),
            contactName: (data.contactName || "未知").trim(),
            contactPhone: (data.contactPhone || "未知").trim(),
            wechat: data.wechat?.trim() || null,
            region: data.region?.trim() || null,
            source: data.source?.trim() || null,
            industry: data.industry?.trim() || null,
            productNeed: data.productNeed?.trim() || null,
            intention: data.intention?.trim() || null,
            remark: data.remark?.trim() || null,
            status: "NEW",
            ownerId: user.id,
            createdById: user.id,
          },
        });
        success++;
      } catch (e: any) {
        errors.push(`第${i + 2}行: ${e.message}`);
        skipped++;
      }
    }

    return NextResponse.json({
      success,
      skipped,
      total: dataRows.length,
      errors: errors.slice(0, 5), // 只返回前5条错误
    });
  } catch (e) {
    console.error("Import leads error:", e);
    return NextResponse.json({ error: "导入失败，请检查文件格式" }, { status: 500 });
  }
}
