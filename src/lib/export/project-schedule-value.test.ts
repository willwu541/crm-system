import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseOptionalNumber,
  parseProjectValueWan,
  parseScheduleBoundParam,
  parseScheduleMonthKey,
  projectListOrderBy,
  projectRangeWhere,
  projectSortKeys,
} from "./project-schedule-value";
import * as scriptKeys from "../../../scripts/lib/project-sort-keys.mjs";

describe("parseProjectValueWan", () => {
  it("parses plain 万元 text", () => {
    assert.equal(parseProjectValueWan("17073万元"), 17073);
    assert.equal(parseProjectValueWan("约 1,700.5 万元"), 1700.5);
    assert.equal(parseProjectValueWan("  "), null);
    assert.equal(parseProjectValueWan(null), null);
  });
});

describe("parseScheduleMonthKey", () => {
  it("parses year-month, quarter and year-only text", () => {
    assert.equal(parseScheduleMonthKey("2027年10月"), 202710);
    assert.equal(parseScheduleMonthKey("2032年第四季度"), 203210);
    assert.equal(parseScheduleMonthKey("2027年Q2"), 202704);
    assert.equal(parseScheduleMonthKey("2027-10"), 202710);
    assert.equal(parseScheduleMonthKey("2027年"), 202701);
    assert.equal(parseScheduleMonthKey("不明"), null);
  });
});

describe("parseScheduleBoundParam", () => {
  it("expands year-only bounds", () => {
    assert.equal(parseScheduleBoundParam("2027", "from"), 202701);
    assert.equal(parseScheduleBoundParam("2027", "to"), 202712);
    assert.equal(parseScheduleBoundParam("2027-10", "from"), 202710);
    assert.equal(parseOptionalNumber("12.5"), 12.5);
    assert.equal(parseOptionalNumber(""), null);
  });
});


describe("database sort keys", () => {
  it("stores parsed keys only for fields being written", () => {
    assert.deepEqual(projectSortKeys({ projectValueText: "约 1,700.5 万元", scheduleEnd: "2027年第四季度" }), {
      projectValueWan: 1700.5,
      scheduleEndKey: 202710,
    });
    assert.deepEqual(projectSortKeys({ projectValueText: null }), { projectValueWan: null });
    assert.deepEqual(projectSortKeys({}), {});
  });

  it("builds range filters on the numeric columns", () => {
    assert.deepEqual(
      projectRangeWhere({ valueMin: 1000, valueMax: null, scheduleEndFrom: 202701, scheduleEndTo: 202712 }),
      { projectValueWan: { gte: 1000 }, scheduleEndKey: { gte: 202701, lte: 202712 } },
    );
    assert.deepEqual(
      projectRangeWhere({ valueMin: null, valueMax: null, scheduleEndFrom: null, scheduleEndTo: null }),
      {},
    );
  });

  it("sorts nullable columns with blanks last and a stable tiebreak", () => {
    assert.deepEqual(projectListOrderBy("projectValue", "desc"), [
      { projectValueWan: { sort: "desc", nulls: "last" } },
      { id: "asc" },
    ]);
    assert.deepEqual(projectListOrderBy("updatedAt", "asc"), [{ updatedAt: "asc" }, { id: "asc" }]);
  });

  it("matches the node backfill and import parser", () => {
    const samples = [
      "17073万元",
      "约 1,700.5 万元",
      "",
      null,
      "2027年10月",
      "2032年第四季度",
      "2027年Q2",
      "2027-10",
      "2027年",
      "2028",
      "不明",
    ];
    for (const sample of samples) {
      assert.equal(scriptKeys.parseProjectValueWan(sample), parseProjectValueWan(sample));
      assert.equal(scriptKeys.parseScheduleMonthKey(sample), parseScheduleMonthKey(sample));
    }
  });
});