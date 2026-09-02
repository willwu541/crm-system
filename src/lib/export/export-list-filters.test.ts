import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectUniqueEmails,
  collectUniqueWhatsapps,
  customerChannelWhere,
  leadChannelWhere,
} from "./contact-channel-filter";
import { buildExportCustomerListWhere, collectUniqueEmails as collectCustomerEmails, collectUniqueWhatsappsFromContacts } from "./customer-list-where";
import { buildExportLeadListWhere, collectLeadEmails, collectLeadWhatsapps } from "./lead-list-where";
import { clearListQuery, listHref, loadListQuery, saveListQuery } from "./list-filter-storage";
import { resolveWhatsappStage } from "./follow-up";
import { companyNameTokenAndWhere, normalizeCompanyName, splitCompanyNameTokens } from "../search-text";

const ctx = { tenantId: "t1" };

describe("contact channel collect", () => {
  it("dedupes emails case-insensitively", () => {
    assert.deepEqual(collectUniqueEmails(["A@x.com", "a@x.com", "  ", "b@x.com"]), ["A@x.com", "b@x.com"]);
  });

  it("dedupes WhatsApp by digits", () => {
    assert.deepEqual(collectUniqueWhatsapps(["+1 555 0100", "15550100", "", "+44 111"]), [
      "+1 555 0100",
      "+44 111",
    ]);
  });
});

describe("channel where", () => {
  it("builds lead WhatsApp present/absent filters", () => {
    assert.deepEqual(leadChannelWhere("whatsapp"), {
      AND: [{ whatsapp: { not: null } }, { whatsapp: { not: "" } }],
    });
    assert.deepEqual(leadChannelWhere("no_email"), {
      OR: [{ email: null }, { email: "" }],
    });
  });

  it("builds customer contact WhatsApp some/none filters", () => {
    const has = customerChannelWhere("whatsapp");
    assert.ok(has && "contacts" in has);
    const none = customerChannelWhere("no_whatsapp");
    assert.ok(none && "contacts" in none);
  });
});

describe("customer list where", () => {
  it("keyword search ignores overdue and owner dropdown", () => {
    const where = buildExportCustomerListWhere(ctx, {
      ownerId: "u1",
      filter: "overdue",
      keyword: "Acme",
    });
    assert.equal(where.ownerId, undefined);
    assert.ok(!("status" in where));
    const and = where.AND as unknown[];
    assert.equal(and.length, 1);
  });

  it("sales owner filter still applies when searching by keyword", () => {
    const where = buildExportCustomerListWhere(
      { tenantId: "t1", ownerFilter: { ownerId: "u9" } },
      { keyword: "Acme", filter: "today" },
    );
    assert.equal(where.ownerId, "u9");
    assert.ok(!("nextFollowUpAt" in where));
  });

  it("WhatsApp maintain requires prior contact", () => {
    const where = buildExportCustomerListWhere(ctx, { filter: "whatsapp_maintain" });
    assert.deepEqual(where.status, { notIn: ["won", "lost"] });
    assert.deepEqual(where.lastFollowUpAt, { not: null });
    const and = where.AND as Record<string, unknown>[];
    assert.ok(and.some((c) => c.contacts));
    assert.ok(and.some((c) => Array.isArray(c.OR)));
  });

  it("WhatsApp first-contact is uncontacted with WhatsApp", () => {
    const where = buildExportCustomerListWhere(ctx, { filter: "whatsapp_first" });
    assert.equal(where.lastFollowUpAt, null);
    const and = where.AND as Record<string, unknown>[];
    assert.ok(and.some((c) => c.contacts));
  });

  it("filters has-email customers", () => {
    const where = buildExportCustomerListWhere(ctx, { channel: "email" });
    const and = where.AND as Record<string, unknown>[];
    assert.ok(and.some((c) => c.contacts));
  });

  it("keyword matches punctuated names, website and contacts", () => {
    const where = buildExportCustomerListWhere(ctx, { keyword: "ABC Trading Ltd" });
    const and = where.AND as { OR: Record<string, unknown>[] }[];
    const or = and.find((c) => Array.isArray(c.OR))?.OR ?? [];
    assert.ok(or.some((c) => "website" in c));
    assert.ok(or.some((c) => "contacts" in c));
    assert.ok(or.some((c) => Array.isArray(c.AND)));
  });

  it("includes normalized company ids in keyword OR", () => {
    const where = buildExportCustomerListWhere(ctx, {
      keyword: "Acme",
      normalizedCompanyIds: ["cust_1"],
    });
    const and = where.AND as { OR: Record<string, unknown>[] }[];
    const or = and.find((c) => Array.isArray(c.OR))?.OR ?? [];
    assert.ok(or.some((c) => {
      const id = c.id as { in?: string[] } | undefined;
      return id?.in?.includes("cust_1");
    }));
  });

  it("collects contact emails and WhatsApps from nested arrays", () => {
    assert.deepEqual(
      collectCustomerEmails([[{ email: "a@x.com" }, { email: "A@x.com" }], [{ email: "b@x.com" }]]),
      ["a@x.com", "b@x.com"],
    );
    assert.deepEqual(
      collectUniqueWhatsappsFromContacts([
        [{ whatsapp: "+1-555" }, { whatsapp: "1555" }],
        [{ whatsapp: "+86 138" }],
      ]),
      ["+1-555", "+86 138"],
    );
  });
});

describe("lead list where", () => {
  it("applies WhatsApp channel without dropping owner", () => {
    const where = buildExportLeadListWhere(ctx, { ownerId: "u2", channel: "whatsapp" });
    assert.equal(where.ownerId, "u2");
    const and = where.AND as Record<string, unknown>[];
    assert.ok(and.some((c) => c.AND || c.whatsapp));
  });

  it("searches WhatsApp in keyword", () => {
    const where = buildExportLeadListWhere(ctx, { keyword: "555" });
    const and = where.AND as { OR: unknown[] }[];
    const or = and.find((c) => Array.isArray(c.OR))?.OR as Record<string, unknown>[];
    assert.ok(or.some((c) => "whatsapp" in c));
    assert.ok(or.some((c) => "website" in c));
  });

  it("collects lead emails and WhatsApps", () => {
    assert.deepEqual(collectLeadEmails([{ email: "a@x.com" }, { email: "a@x.com" }]), ["a@x.com"]);
    assert.deepEqual(collectLeadWhatsapps([{ whatsapp: "+1" }, { whatsapp: null }]), ["+1"]);
  });

  it("WhatsApp maintain excludes never-contacted leads", () => {
    const where = buildExportLeadListWhere(ctx, { filter: "whatsapp_maintain" });
    assert.deepEqual(where.lastContactAt, { not: null });
  });
});

describe("whatsapp stage", () => {
  it("has number but never contacted is first_contact, not maintain", () => {
    assert.equal(
      resolveWhatsappStage({ hasWhatsapp: true, status: "to_develop", lastContactAt: null }),
      "first_contact",
    );
  });

  it("already contacted and silent is maintain_due", () => {
    const last = new Date();
    last.setDate(last.getDate() - 10);
    assert.equal(
      resolveWhatsappStage({
        hasWhatsapp: true,
        status: "developing",
        lastContactAt: last,
        nextFollowUpAt: null,
      }),
      "maintain_due",
    );
  });

  it("no WhatsApp is none", () => {
    assert.equal(
      resolveWhatsappStage({ hasWhatsapp: false, status: "developing", lastContactAt: new Date() }),
      "none",
    );
  });
});

describe("company name search text", () => {
  it("strips punctuation for duplicate-style matching", () => {
    assert.equal(normalizeCompanyName("ABC-Trading Co., Ltd"), "abctradingcoltd");
    assert.equal(normalizeCompanyName("ABC Trading Co Ltd"), "abctradingcoltd");
  });

  it("splits tokens and drops tiny english words", () => {
    assert.deepEqual(splitCompanyNameTokens("ABC Trading Co Ltd"), ["ABC", "Trading", "Co", "Ltd"]);
    assert.deepEqual(splitCompanyNameTokens("A Trading"), ["Trading"]);
  });

  it("builds AND contains for multi-word company names", () => {
    const where = companyNameTokenAndWhere("ABC Trading Ltd");
    assert.ok(where && Array.isArray(where.AND));
    assert.equal((where.AND as unknown[]).length, 3);
    assert.equal(companyNameTokenAndWhere("Acme"), null);
  });
});

describe("list filter storage", () => {
  it("round-trips query string", () => {
    const mem = new Map<string, string>();
    (globalThis as { sessionStorage: Storage }).sessionStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
      removeItem: (k: string) => {
        mem.delete(k);
      },
      clear: () => mem.clear(),
      key: () => null,
      length: 0,
    };
    saveListQuery("/export/customers", "ownerId=u1&sortBy=lastFollowUpAt");
    assert.equal(loadListQuery("/export/customers"), "ownerId=u1&sortBy=lastFollowUpAt");
    assert.equal(listHref("/export/customers"), "/export/customers?ownerId=u1&sortBy=lastFollowUpAt");
    clearListQuery("/export/customers");
    assert.equal(listHref("/export/customers"), "/export/customers");
  });
});
