import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterProjectListRowsByParsedFields,
  parseOptionalNumber,
  parseProjectValueWan,
  parseScheduleBoundParam,
  parseScheduleMonthKey,
  sortProjectListRows,
  summarizeEntryCounts,
} from "./project-schedule-value";

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

describe("filter and sort project list rows", () => {
  const rows = [
    {
      id: "a",
      name: "Beta",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-06-01"),
      status: "hunting",
      bidDeadline: null,
      country: "Vietnam",
      scheduleEnd: "2030年第四季度",
      projectValueText: "500万元",
      entryStatus: "entered",
    },
    {
      id: "b",
      name: "Alpha",
      createdAt: new Date("2024-02-01"),
      updatedAt: new Date("2024-05-01"),
      status: "hunting",
      bidDeadline: null,
      country: "Indonesia",
      scheduleEnd: "2027年10月",
      projectValueText: "17073万元",
      entryStatus: "pending",
    },
    {
      id: "c",
      name: "Gamma",
      createdAt: new Date("2024-03-01"),
      updatedAt: new Date("2024-07-01"),
      status: "hunting",
      bidDeadline: null,
      country: null,
      scheduleEnd: null,
      projectValueText: null,
      entryStatus: "entered",
    },
  ];

  it("filters by value and schedule range", () => {
    const filtered = filterProjectListRowsByParsedFields(rows, {
      valueMin: 1000,
      valueMax: 20000,
      scheduleEndFrom: 202701,
      scheduleEndTo: 202712,
    });
    assert.deepEqual(
      filtered.map((row) => row.id),
      ["b"],
    );
  });

  it("sorts by project value and schedule end", () => {
    assert.deepEqual(
      sortProjectListRows(rows, "projectValue", "desc").map((row) => row.id),
      ["b", "a", "c"],
    );
    assert.deepEqual(
      sortProjectListRows(rows, "scheduleEnd", "asc").map((row) => row.id),
      ["b", "a", "c"],
    );
    assert.deepEqual(
      sortProjectListRows(rows, "name", "asc").map((row) => row.id),
      ["b", "a", "c"],
    );
  });

  it("summarizes entry counts", () => {
    assert.deepEqual(summarizeEntryCounts(rows), { pending: 1, entered: 2, all: 3 });
  });
});
