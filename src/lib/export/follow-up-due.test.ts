import assert from "node:assert/strict";
import test from "node:test";
import { followUpDueWhere, formatFollowUpDate, parseFollowUpDate } from "./follow-up-due";

test("下次跟进日期按东八区零点存", () => {
  const day = parseFollowUpDate("2026-11-30");
  assert.deepEqual(day, new Date("2026-11-29T16:00:00.000Z"));
  assert.equal(formatFollowUpDate(day), "2026-11-30");
  assert.equal(parseFollowUpDate(""), null);
  assert.equal(parseFollowUpDate(null), null);
  assert.equal(parseFollowUpDate(undefined), undefined);
  assert.equal(parseFollowUpDate("2026-02-30"), undefined);
  assert.equal(parseFollowUpDate("not a date"), undefined);
});

test("过期、今天、7 天内按东八区日界", () => {
  const now = new Date("2026-11-23T17:30:00.000Z");
  const start = new Date("2026-11-23T16:00:00.000Z");
  assert.deepEqual(followUpDueWhere("overdue", now), { lt: start });
  assert.deepEqual(followUpDueWhere("today", now), {
    gte: start,
    lt: new Date("2026-11-24T16:00:00.000Z"),
  });
  assert.deepEqual(followUpDueWhere("week", now), {
    gte: start,
    lt: new Date("2026-11-30T16:00:00.000Z"),
  });
  assert.equal(followUpDueWhere("", now), null);
  assert.equal(followUpDueWhere("soon", now), null);
});
