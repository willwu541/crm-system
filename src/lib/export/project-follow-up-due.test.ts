import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatShanghaiDate,
  isFollowUpOverdue,
  isProjectFollowUpDue,
  projectFollowUpDueWhere,
  shanghaiDayStart,
} from "./project-follow-up-due";

// 2026-11-25 周三 01:30 东八区 = 2026-11-24 17:30 UTC
const now = new Date("2026-11-24T17:30:00Z");

describe("projectFollowUpDueWhere", () => {
  it("东八区当天 0 点", () => {
    assert.equal(shanghaiDayStart(now).toISOString(), "2026-11-24T16:00:00.000Z");
  });

  it("overdue 早于今天", () => {
    assert.deepEqual(projectFollowUpDueWhere("overdue", now), {
      lt: new Date("2026-11-24T16:00:00Z"),
    });
  });

  it("today 只含今天", () => {
    assert.deepEqual(projectFollowUpDueWhere("today", now), {
      gte: new Date("2026-11-24T16:00:00Z"),
      lt: new Date("2026-11-25T16:00:00Z"),
    });
  });

  it("week 今天起 7 天内，与列表接口一致", () => {
    assert.deepEqual(projectFollowUpDueWhere("week", now), {
      gte: new Date("2026-11-24T16:00:00Z"),
      lt: new Date("2026-12-01T16:00:00Z"),
    });
  });

  it("无效参数返回 null", () => {
    assert.equal(projectFollowUpDueWhere("", now), null);
    assert.equal(projectFollowUpDueWhere("month", now), null);
    assert.equal(isProjectFollowUpDue(undefined), false);
  });
});

describe("isFollowUpOverdue / formatShanghaiDate", () => {
  it("昨天逾期，今天不算", () => {
    assert.equal(isFollowUpOverdue("2026-11-24T15:59:00Z", now), true);
    assert.equal(isFollowUpOverdue("2026-11-24T16:00:00Z", now), false);
    assert.equal(isFollowUpOverdue(null, now), false);
  });

  it("按东八区出日期", () => {
    assert.equal(formatShanghaiDate("2026-11-24T17:30:00Z"), "2026-11-25");
    assert.equal(formatShanghaiDate("bad"), null);
  });
});
