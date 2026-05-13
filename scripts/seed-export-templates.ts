/**
 * 安装 / 更新外贸 CRM 的内置邮件 / 沟通模板。
 *
 * 运行：
 *   npx tsx scripts/seed-export-templates.ts
 *
 * 已存在同 tenant + 同名 + isBuiltin=true 的模板会被覆盖更新，其他用户自建模板不会被动。
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("错误: 请设置 .env 中的 DATABASE_URL");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

interface SeedTemplate {
  name: string;
  category: string;
  language: "en" | "zh";
  subject: string;
  body: string;
}

const TEMPLATES: SeedTemplate[] = [
  /* ============================================================
   * 1. 首封开发信 (D+0 dev_letter)
   * ============================================================ */
  {
    name: "首封开发信 - 工厂自荐 EN",
    category: "dev_letter",
    language: "en",
    subject:
      "Steel grating supplier introduction for {{customer.companyName}}{{lead.companyName}}",
    body: `Dear {{contact.name}},

Hope this email finds you well.

I came across {{customer.companyName}}{{lead.companyName}} and noticed your involvement in projects that may require steel grating, stair treads, trench covers or related steel walkway products. We are a manufacturer based in China with over 10 years of export experience covering the {{customer.country}}{{lead.country}} market.

Our main products:
- Welded / press-locked / swaged steel grating
- Stair treads (with or without nosing)
- Trench / drain covers
- Handrails and walkway systems
- Hot-dip galvanized / mill finish / painted

We can quote in CIF, FOB, or DAP, and ship in 20'GP / 40'HQ containers. Lead time is typically 20-30 days after deposit.

If you have any active inquiry or upcoming project, please share the drawing / spec sheet and we will revert with a competitive quotation within 24 hours.

Looking forward to working with you.

Best regards,
{{user.name}}
{{user.signature}}`,
  },
  {
    name: "首封开发信 - 工厂自荐 中文",
    category: "dev_letter",
    language: "zh",
    subject: "关于钢格板 / 踏步板供应的合作咨询 - {{customer.companyName}}{{lead.companyName}}",
    body: `您好 {{contact.name}}：

我们是一家专业生产钢格板、踏步板、沟盖板、栏杆走道等产品的工厂，10 年以上出口经验，主要市场涵盖 {{customer.country}}{{lead.country}} 等地区。

主要产品：
- 压焊 / 压锁 / 插接钢格板
- 踏步板（带 / 不带前缘）
- 沟盖板 / 水沟盖
- 栏杆走道系统
- 表面：热镀锌 / 原色 / 喷涂

贸易条款支持 CIF / FOB / DAP，可整柜 20'GP 或 40'HQ 装柜出运，常规交期定金后 20-30 天。

如有进行中的项目询盘或图纸需求，欢迎随时发给我，我们 24 小时内回复报价。

期待合作！

{{user.name}}
{{user.signature}}`,
  },

  /* ============================================================
   * 2. Follow-up #1 (D+3 followup_1)
   * ============================================================ */
  {
    name: "Follow-up #1 - 3 天后跟催 EN",
    category: "followup_1",
    language: "en",
    subject: "Re: Steel grating supplier introduction - any feedback?",
    body: `Hi {{contact.name}},

Just following up on my previous email - did it reach you safely?

We would be happy to send you our latest catalog, surface finish samples, or a sample quotation for a typical specification you may use. Even a quick reply will help me understand your project pipeline.

If you are currently working with another supplier, no problem - we are here whenever you may need a second source or a tighter price comparison.

Best regards,
{{user.name}}
{{user.signature}}`,
  },
  {
    name: "Follow-up #1 - 3 天后跟催 中文",
    category: "followup_1",
    language: "zh",
    subject: "Re: 关于钢格板 / 踏步板供应 - 邮件是否收到？",
    body: `您好 {{contact.name}}：

3 天前给您发过一封关于我们工厂的介绍邮件，不知道是否方便看一下？

如方便，可以告诉我：
- 您当前主要采购的产品和规格
- 是否有进行中的项目需要报价

即使您目前已有合作的工厂，我们也欢迎作为备选供应商，提供报价对比或备货支持。

期待您的回复。

{{user.name}}
{{user.signature}}`,
  },

  /* ============================================================
   * 3. Follow-up #2 (D+7 followup_2) - 提供新角度
   * ============================================================ */
  {
    name: "Follow-up #2 - 1 周后附产品资料 EN",
    category: "followup_2",
    language: "en",
    subject: "Catalog + sample quotation for steel grating - {{customer.companyName}}{{lead.companyName}}",
    body: `Hi {{contact.name}},

I am attaching our product catalog and a sample quotation for the most common steel grating specifications (30×3 bearing bar, 30×100mm mesh, hot-dip galvanized).

Even if you do not have an active project now, this should give you a baseline of our pricing and quality. Many of our long-term clients started with a small trial order before placing larger ones.

A few questions to help me provide a more accurate proposal:
1. Which specification(s) do you usually use?
2. Estimated annual volume?
3. Main destination port?

Looking forward to hearing back.

Best regards,
{{user.name}}
{{user.signature}}`,
  },
  {
    name: "Follow-up #2 - 1 周后附产品资料 中文",
    category: "followup_2",
    language: "zh",
    subject: "钢格板产品资料 + 参考报价 - {{customer.companyName}}{{lead.companyName}}",
    body: `您好 {{contact.name}}：

附上我们的产品手册和一份常规规格的参考报价（扁钢 30×3 / 网眼 30×100 / 热浸镀锌），供您参考。

即使目前没有正式项目，您也可以先收一份资料留底。我们很多长期客户都是从一票试单开始，再扩展到批量采购。

为了给您更精准的方案，方便了解一下：
1. 贵司常用的规格是哪些？
2. 大致年用量？
3. 目的港在哪里？

期待回复。

{{user.name}}
{{user.signature}}`,
  },

  /* ============================================================
   * 4. Follow-up #3 (D+14 followup_3) - 询样 / 项目需求
   * ============================================================ */
  {
    name: "Follow-up #3 - 2 周后询样 EN",
    category: "followup_3",
    language: "en",
    subject: "Free sample available - steel grating from China",
    body: `Hi {{contact.name}},

I noticed we haven't had a chance to connect yet. To make things easier for you to evaluate our quality, we can send a free sample piece of steel grating (with hot-dip galvanized finish) - you only need to cover the courier cost.

Many buyers find this is the fastest way to compare us against their current supplier without committing to a trial order.

If interested, just share your shipping address and a preferred specification. I'll arrange it within 2 working days.

Best regards,
{{user.name}}
{{user.signature}}`,
  },
  {
    name: "Follow-up #3 - 2 周后询样 中文",
    category: "followup_3",
    language: "zh",
    subject: "免费样品申请 - 钢格板 / 踏步板",
    body: `您好 {{contact.name}}：

注意到您可能比较忙。为方便您评估我们的工艺，我们可以免费寄一片钢格板小样（热镀锌处理），运费您方承担即可。

很多客户都是用这种方式快速对比现有供应商，不必先下试单。

如有兴趣，请提供：
- 收件地址
- 希望样品的规格

我会在 2 个工作日内安排发出。

{{user.name}}
{{user.signature}}`,
  },

  /* ============================================================
   * 5. Long-tail (D+30+ long_tail)
   * ============================================================ */
  {
    name: "Long-tail - 月度行业动态 EN",
    category: "long_tail",
    language: "en",
    subject: "Quick market update - steel grating prices this month",
    body: `Hi {{contact.name}},

A quick note from our side: steel raw material prices have shifted recently, and we are seeing more inquiries from {{customer.country}}{{lead.country}} as a result.

If you'd like an updated quotation or just want to know the current market trend, feel free to reply. No commitment needed.

Wishing you a productive month.

Best regards,
{{user.name}}
{{user.signature}}`,
  },
  {
    name: "Long-tail - 月度行业动态 中文",
    category: "long_tail",
    language: "zh",
    subject: "钢格板本月行情更新",
    body: `您好 {{contact.name}}：

简单同步一下：近期钢材原料价格有所波动，我们也接到不少来自 {{customer.country}}{{lead.country}} 的询盘。

如果方便，您可以收一份最新的市场价格更新，或者就行业动态聊几句，没有任何采购压力。

祝商祺。

{{user.name}}
{{user.signature}}`,
  },

  /* ============================================================
   * 6. Quote follow-up (quote_followup)
   * ============================================================ */
  {
    name: "报价后跟进 - 3 天 EN",
    category: "quote_followup",
    language: "en",
    subject: "Quotation {{quote.no}} - any questions?",
    body: `Hi {{contact.name}},

I sent you our quotation {{quote.no}} a few days ago - just wanted to make sure it reached you.

Please let me know if you have any questions on:
- Pricing or payment terms
- Specifications or surface finish
- Lead time or shipping arrangement

Happy to revise the offer based on your feedback.

Best regards,
{{user.name}}
{{user.signature}}`,
  },
  {
    name: "报价后跟进 - 3 天 中文",
    category: "quote_followup",
    language: "zh",
    subject: "关于报价 {{quote.no}} - 是否有需要进一步沟通的地方？",
    body: `您好 {{contact.name}}：

几天前给您发的报价 {{quote.no}}，不知您是否收到，方便回复一下吗？

如果在价格、规格、表面处理、交期或运输方面有任何疑问，欢迎告诉我，我们可以根据您的需求重新调整方案。

期待您的回复。

{{user.name}}
{{user.signature}}`,
  },

  /* ============================================================
   * 7. Push close (push_close)
   * ============================================================ */
  {
    name: "促单 - 价格有效期临近 EN",
    category: "push_close",
    language: "en",
    subject: "Quotation {{quote.no}} - price validity expiring soon",
    body: `Hi {{contact.name}},

A friendly reminder that our quotation {{quote.no}} will expire on its validity date. Steel raw material prices have been moving upward, and we may not be able to hold the same price after that.

If the project is still on track, I'd suggest confirming the order soon to lock in the current pricing. Even a 30% deposit will secure the price and start production planning.

Let me know how you'd like to move forward.

Best regards,
{{user.name}}
{{user.signature}}`,
  },
  {
    name: "促单 - 价格有效期临近 中文",
    category: "push_close",
    language: "zh",
    subject: "报价 {{quote.no}} 有效期即将到期 - 是否需要锁价？",
    body: `您好 {{contact.name}}：

提醒一下，您手上的报价 {{quote.no}} 即将到达有效期。近期钢材原料价格有上涨趋势，过期后我们可能无法维持原价。

如果项目仍在推进中，建议尽快下单锁价。即使先支付 30% 定金，也可以锁定当前价格并开始排产准备。

请告诉我您的下一步打算。

{{user.name}}
{{user.signature}}`,
  },

  /* ============================================================
   * 8. Sample request (sample_request)
   * ============================================================ */
  {
    name: "样品询问 - 主动提供 EN",
    category: "sample_request",
    language: "en",
    subject: "Free sample of steel grating - shall I send one to you?",
    body: `Hi {{contact.name}},

Would you be interested in receiving a free sample of our steel grating? It's the best way to evaluate the welding quality, galvanizing thickness, and finish before placing any order.

We cover the sample cost - you just provide:
- Shipping address (DHL/FedEx)
- Preferred specification

I can arrange it within 2 working days.

Best regards,
{{user.name}}
{{user.signature}}`,
  },
  {
    name: "样品询问 - 主动提供 中文",
    category: "sample_request",
    language: "zh",
    subject: "钢格板样品 - 是否需要寄一片给您评估？",
    body: `您好 {{contact.name}}：

是否需要我们寄一片样品给您做品质评估？这是最直观确认我们焊接、镀锌厚度、表面处理的方式。

样品免费，您只需提供：
- 收件地址（DHL / FedEx）
- 希望的规格

我可在 2 个工作日内安排发出。

{{user.name}}
{{user.signature}}`,
  },

  /* ============================================================
   * 9. Holiday (holiday)
   * ============================================================ */
  {
    name: "节日问候 - 通用 EN",
    category: "holiday",
    language: "en",
    subject: "Season's greetings from your steel grating partner",
    body: `Dear {{contact.name}},

Wishing you and the {{customer.companyName}}{{lead.companyName}} team a great holiday season.

Thank you for the trust and cooperation throughout the year. We look forward to another year of productive partnership.

Should you need any quotation or technical support during the holiday period, feel free to reach me anytime.

Warm regards,
{{user.name}}
{{user.signature}}`,
  },
  {
    name: "节日问候 - 通用 中文",
    category: "holiday",
    language: "zh",
    subject: "节日问候 - 来自 {{user.name}}",
    body: `尊敬的 {{contact.name}}：

祝您和 {{customer.companyName}}{{lead.companyName}} 全体同事节日愉快！

感谢这一年来的信任与合作，期待新一年继续合作共赢。

节日期间如有任何报价或技术支持需求，欢迎随时联系我。

{{user.name}}
{{user.signature}}`,
  },

  /* ============================================================
   * 10. Reactivation - 沉睡客户唤醒
   * ============================================================ */
  {
    name: "沉睡客户唤醒 - 重新建联 EN",
    category: "reactivation",
    language: "en",
    subject: "Long time no see - any new project on your side?",
    body: `Hi {{contact.name}},

It's been a while since we last connected. Hope everything has been going well on your side.

We've recently improved our production capacity and added new finishes (including powder coating in custom RAL colors). If you have any project coming up, I'd be glad to send you our latest pricing and a fresh sample.

Even just a quick "hi" would be great to know things are well.

Best regards,
{{user.name}}
{{user.signature}}`,
  },
  {
    name: "沉睡客户唤醒 - 重新建联 中文",
    category: "reactivation",
    language: "zh",
    subject: "好久不见 - 近期是否有新项目？",
    body: `您好 {{contact.name}}：

好久没和您联系了，不知您近况如何。

我们最近扩大了产能，并新增了一些表面处理工艺（包括 RAL 色卡定制喷塑）。如您近期有新项目，欢迎告诉我，我可以发一份最新的报价和样品给您。

哪怕只是简单回复一下报个平安，也很高兴知道您一切顺利。

{{user.name}}
{{user.signature}}`,
  },
];

async function main() {
  const tenant = await prisma.exportTenant.upsert({
    where: { slug: "default" },
    update: {},
    create: { slug: "default", name: "默认租户" },
  });
  console.log(`使用 tenant: ${tenant.name} (${tenant.id})`);

  // 找一个外贸管理员或第一个外贸用户作为内置模板的 createdBy
  let owner = await prisma.user.findFirst({
    where: { tenant: "export", role: "ADMIN" },
    select: { id: true, name: true },
  });
  if (!owner) {
    owner = await prisma.user.findFirst({
      where: { tenant: "export" },
      select: { id: true, name: true },
    });
  }
  if (!owner) {
    // 回退到任意管理员
    owner = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true, name: true },
    });
  }
  if (!owner) {
    console.error("找不到任何 user 作为模板创建人。请先初始化用户。");
    process.exit(1);
  }
  console.log(`使用 createdBy: ${owner.name} (${owner.id})`);

  let inserted = 0;
  let updated = 0;
  for (const t of TEMPLATES) {
    const existing = await prisma.exportEmailTemplate.findFirst({
      where: {
        tenantId: tenant.id,
        name: t.name,
        isBuiltin: true,
      },
    });
    if (existing) {
      await prisma.exportEmailTemplate.update({
        where: { id: existing.id },
        data: {
          category: t.category,
          language: t.language,
          subject: t.subject,
          body: t.body,
          isShared: true,
          isBuiltin: true,
        },
      });
      updated += 1;
    } else {
      await prisma.exportEmailTemplate.create({
        data: {
          tenantId: tenant.id,
          createdById: owner.id,
          name: t.name,
          category: t.category,
          language: t.language,
          subject: t.subject,
          body: t.body,
          isShared: true,
          isBuiltin: true,
        },
      });
      inserted += 1;
    }
  }
  console.log(`完成：新增 ${inserted} 条，更新 ${updated} 条。`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
