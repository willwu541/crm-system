import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, describe, it } from "node:test";
import { resetAccessPolicyCache, saveAccessPolicy } from "../access-policy";
import { canAssignExportWork } from "./lead-pool";
import {
  activityActionText,
  buildTodaySummary,
  deletionActionText,
  formatDayKey,
  isTodayStaff,
  parseSummaryDay,
  summaryLogDays,
  todayRange,
  type TodayActionInput,
} from "./today-summary";

const policyPath = path.join(process.cwd(), "data", "access-policy.json");
const originalPolicy = (() => {
  try {
    return readFileSync(policyPath, "utf-8");
  } catch {
    return null;
  }
})();

after(() => {
  if (originalPolicy !== null) writeFileSync(policyPath, originalPolicy, "utf-8");
  resetAccessPolicyCache();
});

function action(partial: Partial<TodayActionInput> & Pick<TodayActionInput, "id" | "userId" | "at" | "text">): TodayActionInput {
  return {
    id: partial.id,
    userId: partial.userId,
    userName: partial.userName ?? partial.userId,
    role: partial.role ?? "SALES",
    director: partial.director ?? false,
    at: partial.at,
    text: partial.text,
    href: partial.href ?? null,
  };
}

describe("today summary permission", () => {
  it("uses the same boss gate as assigning work", () => {
    saveAccessPolicy({ directorUserId: "director", canView: {} });
    resetAccessPolicyCache();
    assert.equal(canAssignExportWork({ id: "boss", role: "ADMIN" }), true);
    assert.equal(canAssignExportWork({ id: "director", role: "ADMIN" }), false);
    assert.equal(canAssignExportWork({ id: "mgr", role: "MANAGER" }), false);
    assert.equal(canAssignExportWork({ id: "sales", role: "SALES" }), false);
  });
});

describe("today summary grouping", () => {
  const staff = [
    { id: "sales", name: "小张", role: "SALES", isActive: true, director: false },
    { id: "mgr", name: "李经理", role: "MANAGER", isActive: true, director: false },
    { id: "director", name: "王经理", role: "ADMIN", isActive: true, director: true },
  ];

  it("keeps idle salespeople and sales managers, and adds the boss only when they acted", () => {
    const morning = new Date(2026, 10, 9, 9, 30);
    const later = new Date(2026, 10, 9, 15, 0);
    const rows = buildTodaySummary(staff, [
      action({
        id: "claim:1",
        userId: "sales",
        userName: "小张",
        at: morning,
        text: "认领线索 · Acme",
      }),
      action({
        id: "assign:1",
        userId: "boss",
        userName: "老板",
        role: "ADMIN",
        at: later,
        text: "分配线索给小张 · Beta",
      }),
    ]);

    assert.deepEqual(
      rows.map((row) => [row.userId, row.count, row.idle, row.roleLabel]),
      [
        ["boss", 1, false, "管理者"],
        ["sales", 1, false, "业务员"],
        ["mgr", 0, true, "经理"],
        ["director", 0, true, "业务经理"],
      ],
    );
    assert.equal(rows.find((row) => row.userId === "sales")?.actions[0]?.text, "认领线索 · Acme");
    assert.equal(rows.find((row) => row.userId === "mgr")?.actions.length, 0);
  });

  it("does not treat an idle admin or an inactive salesperson as staff", () => {
    assert.equal(isTodayStaff({ id: "boss", name: "老板", role: "ADMIN", isActive: true }, "director"), false);
    assert.equal(isTodayStaff({ id: "director", name: "王经理", role: "ADMIN", isActive: true }, "director"), true);
    assert.equal(isTodayStaff({ id: "sales", name: "小张", role: "SALES", isActive: false }, "director"), false);
    assert.equal(isTodayStaff({ id: "mgr", name: "李经理", role: "MANAGER", isActive: true }, null), true);
  });

  it("orders one person's actions from latest to earliest", () => {
    const rows = buildTodaySummary(
      [{ id: "sales", name: "小张", role: "SALES", isActive: true, director: false }],
      [
        action({ id: "a", userId: "sales", at: new Date(2026, 10, 9, 9, 0), text: "早" }),
        action({ id: "b", userId: "sales", at: new Date(2026, 10, 9, 11, 0), text: "晚" }),
      ],
    );
    assert.deepEqual(rows[0]?.actions.map((item) => item.text), ["晚", "早"]);
    assert.equal(rows[0]?.count, 2);
  });

  it("labels stored follow-ups and deletions without inventing a count", () => {
    assert.equal(
      activityActionText({ type: "call", company: "Acme", content: "打了总机，转到采购" }),
      "电话 (Call) · Acme · 打了总机，转到采购",
    );
    assert.equal(deletionActionText("customer", "Acme (C-1)"), "删除客户 · Acme (C-1)");
  });

  it("uses the server local day, matching lead claims", () => {
    const now = new Date(2026, 10, 9, 23, 30);
    const { start, end } = todayRange(now);
    assert.equal(start.getFullYear(), 2026);
    assert.equal(start.getMonth(), 10);
    assert.equal(start.getDate(), 9);
    assert.equal(start.getHours(), 0);
    assert.equal(end.getTime() - start.getTime(), 24 * 60 * 60 * 1000);
    assert.ok(now >= start && now < end);
    assert.equal(formatDayKey(start), "2026-11-09");
  });

  it("opens a past day and refuses a future or invalid day", () => {
    const now = new Date(2026, 10, 9, 15, 0);
    assert.equal(formatDayKey(parseSummaryDay("2026-11-01", now)), "2026-11-01");
    assert.equal(formatDayKey(parseSummaryDay("2026-11-10", now)), "2026-11-09");
    assert.equal(formatDayKey(parseSummaryDay("2026-02-31", now)), "2026-11-09");
    assert.equal(formatDayKey(parseSummaryDay("昨天", now)), "2026-11-09");
  });

  it("lists recent days and keeps an older selected day on the log", () => {
    const now = new Date(2026, 10, 9, 15, 0);
    const days = summaryLogDays(now, 3, new Date(2026, 9, 1));
    assert.deepEqual(
      days.map((day) => day.date),
      ["2026-11-09", "2026-11-08", "2026-11-07", "2026-10-01"],
    );
    assert.equal(days[0]?.label, "今天");
    assert.equal(days[0]?.isToday, true);
  });
});
