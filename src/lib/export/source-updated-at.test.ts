import assert from "node:assert/strict";
import test from "node:test";
import { formatSourceUpdatedAt, sourceUpdatedWhere } from "./source-updated-at";

test("东八区到分钟", () => {
  assert.equal(formatSourceUpdatedAt("2026-11-16T02:34:00.000Z"), "2026-11-16 10:34");
  assert.equal(formatSourceUpdatedAt(null), null);
  assert.equal(formatSourceUpdatedAt(""), null);
});

test("本周从东八区周一开始", () => {
  const mondayMorning = new Date("2026-11-23T02:00:00.000Z");
  const week = sourceUpdatedWhere("week", mondayMorning);
  const today = sourceUpdatedWhere("today", mondayMorning);
  assert.deepEqual(week, { gte: new Date("2026-11-22T16:00:00.000Z") });
  assert.deepEqual(today, { gte: new Date("2026-11-22T16:00:00.000Z") });
  assert.deepEqual(sourceUpdatedWhere("1"), { not: null });
  assert.equal(sourceUpdatedWhere(""), null);
});
