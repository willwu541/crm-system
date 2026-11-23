import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProjectListOrderBy, buildProjectListWhere } from "./project-list-where";

const now = new Date("2026-11-24T17:30:00Z");
const boss = { tenantId: "t1", userId: "boss", manageAll: true };
const sales = { tenantId: "t1", userId: "s1", manageAll: false };
const sp = (q: string) => new URLSearchParams(q);

describe("buildProjectListWhere", () => {
  it("默认只看进行中，管理者不限负责人", () => {
    assert.deepEqual(buildProjectListWhere(boss, sp(""), now), {
      tenantId: "t1",
      status: { notIn: ["abandoned", "parked"] },
    });
  });

  it("业务员只看自己的，传 ownerId 也无效", () => {
    const where = buildProjectListWhere(sales, sp("ownerId=other"), now);
    assert.equal(where.ownerId, "s1");
  });

  it("业务员查未分配得到空集", () => {
    const where = buildProjectListWhere(sales, sp("assignment=unassigned"), now);
    assert.deepEqual(where.ownerId, { in: [] });
  });

  it("管理者按负责人 / 未分配", () => {
    assert.equal(buildProjectListWhere(boss, sp("ownerId=u2"), now).ownerId, "u2");
    assert.equal(buildProjectListWhere(boss, sp("assignment=unassigned&ownerId=u2"), now).ownerId, null);
  });

  it("生命周期、阶段、国家、进度标记", () => {
    const where = buildProjectListWhere(
      boss,
      sp("lifecycle=parked&stage=tendering&country=SA&progressMark=unset&entryStatus=entered"),
      now,
    );
    assert.equal(where.status, "parked");
    assert.equal(where.stage, "tendering");
    assert.equal(where.country, "SA");
    assert.equal(where.progressMark, null);
    assert.equal(where.entryStatus, "entered");
  });

  it("忽略无效的阶段和进度标记", () => {
    const where = buildProjectListWhere(boss, sp("stage=bogus&progressMark=bogus"), now);
    assert.equal("stage" in where, false);
    assert.equal("progressMark" in where, false);
  });

  it("资料更新、下次跟进", () => {
    const where = buildProjectListWhere(boss, sp("sourceUpdated=today&followUpDue=overdue"), now);
    assert.deepEqual(where.sourceUpdatedAt, { gte: new Date("2026-11-24T16:00:00Z") });
    assert.deepEqual(where.nextFollowUpAt, { lt: new Date("2026-11-24T16:00:00Z") });
  });

  it("金额、完工区间用数值列", () => {
    const where = buildProjectListWhere(boss, sp("valueMin=100&scheduleEndFrom=2027&scheduleEndTo=2027-06"), now);
    assert.deepEqual(where.projectValueWan, { gte: 100 });
    assert.deepEqual(where.scheduleEndKey, { gte: 202701, lte: 202706 });
  });

  it("关键词查名称和项目号", () => {
    const where = buildProjectListWhere(boss, sp("keyword=LM123"), now);
    const and = where.AND as { OR: Record<string, unknown>[] }[];
    assert.equal(and.length, 1);
    assert.deepEqual(and[0].OR[0], { name: { contains: "LM123", mode: "insensitive" } });
    assert.deepEqual(and[0].OR[1], { sourceProjectNumber: { contains: "LM123", mode: "insensitive" } });
  });
});

describe("buildProjectListOrderBy", () => {
  it("金额走 projectValueWan，空值在后", () => {
    assert.deepEqual(buildProjectListOrderBy(sp("sortBy=projectValue&sortOrder=desc")), [
      { projectValueWan: { sort: "desc", nulls: "last" } },
      { id: "asc" },
    ]);
  });

  it("未知字段回落到 updatedAt desc", () => {
    assert.deepEqual(buildProjectListOrderBy(sp("sortBy=hack")), [{ updatedAt: "desc" }, { id: "asc" }]);
  });
});
