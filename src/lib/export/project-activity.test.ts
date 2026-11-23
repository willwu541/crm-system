import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, describe, it } from "node:test";
import { resetAccessPolicyCache, saveAccessPolicy } from "../access-policy";
import { canMarkExportProject, planProjectActivities } from "./project-activity";

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

const sales = { id: "sales", role: "SALES" as const };
const boss = { id: "boss", role: "ADMIN" as const };
const other = { id: "other", role: "SALES" as const };

describe("who can mark a project", () => {
  it("lets the owner and the assigning manager mark, and blocks other sales on an unassigned project", () => {
    saveAccessPolicy({ directorUserId: "director", canView: {} });
    resetAccessPolicyCache();
    assert.equal(canMarkExportProject(sales, "sales"), true);
    assert.equal(canMarkExportProject(other, "sales"), false);
    assert.equal(canMarkExportProject(sales, null), false);
    assert.equal(canMarkExportProject(boss, null), true);
    assert.equal(canMarkExportProject(boss, "sales"), true);
  });
});

describe("project change log", () => {
  const prev = { stage: "unknown", status: "hunting", progressMark: null, ownerId: null };

  it("records a claim-sized assign, a progress mark, and a follow-up stays out of the mark enum", () => {
    const events = planProjectActivities({
      prev,
      next: { progressMark: "跟进中", ownerId: "sales", updateNote: "资料改了工期" },
      assigneeName: "小张",
    });
    assert.deepEqual(
      events.map((item) => item.kind),
      ["source_update", "progress", "assign"],
    );
    assert.equal(events.find((item) => item.kind === "progress")?.content, "跟进中");
    assert.equal(events.find((item) => item.kind === "assign")?.content, "小张");
    assert.equal(events.some((item) => item.kind === "follow_up"), false);
  });

  it("records stage and abandon changes, and skips unchanged fields", () => {
    const events = planProjectActivities({
      prev: { ...prev, stage: "tendering", status: "hunting", progressMark: "待联系", ownerId: "sales" },
      next: { stage: "construction", status: "abandoned", progressMark: "待联系" },
    });
    assert.deepEqual(events, [
      { kind: "stage", content: "在建" },
      { kind: "status", content: "标为废弃" },
    ]);
  });

  it("records deferring development separately from a progress mark", () => {
    const events = planProjectActivities({
      prev: { ...prev, status: "contacting" },
      next: { status: "parked", progressMark: "跟进中" },
    });
    assert.deepEqual(events, [
      { kind: "status", content: "标为暂缓开发" },
      { kind: "progress", content: "跟进中" },
    ]);
  });

  it("records leaving deferred development", () => {
    const events = planProjectActivities({
      prev: { ...prev, status: "parked" },
      next: { status: "contacting" },
    });
    assert.deepEqual(events, [{ kind: "status", content: "取消暂缓开发" }]);
  });

  it("records leaving abandoned", () => {
    const events = planProjectActivities({
      prev: { ...prev, status: "abandoned", ownerId: "sales" },
      next: { status: "hunting" },
    });
    assert.deepEqual(events, [{ kind: "status", content: "取消废弃" }]);
  });

  it("records setting, moving and clearing the next follow-up day", () => {
    assert.deepEqual(
      planProjectActivities({ prev, next: { nextFollowUpDay: "2026-11-30" } }),
      [{ kind: "next_follow_up", content: "2026-11-30" }],
    );
    assert.deepEqual(
      planProjectActivities({
        prev: { ...prev, nextFollowUpDay: "2026-11-30" },
        next: { nextFollowUpDay: "" },
      }),
      [{ kind: "next_follow_up", content: null }],
    );
    assert.deepEqual(
      planProjectActivities({
        prev: { ...prev, nextFollowUpDay: "2026-11-30" },
        next: { nextFollowUpDay: "2026-11-30" },
      }),
      [],
    );
  });
});
