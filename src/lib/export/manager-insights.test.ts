import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { progressMarkCounts, sumProjectValueWan } from "./manager-insights";
import { projectAssignmentWhere } from "./projects";

describe("manager insights", () => {
  it("sums 万元 and skips blank or unreadable amounts", () => {
    const sum = sumProjectValueWan(["17073万元", "约 1,700.5 万元", "", null, "面议"]);
    assert.equal(sum.totalWan, 18773.5);
    assert.equal(sum.parsedCount, 2);
    assert.equal(sum.unparsedCount, 1);
  });

  it("counts progress marks in a fixed order and folds blanks into 未标记", () => {
    const rows = progressMarkCounts([
      { mark: "已联系", count: 2 },
      { mark: null, count: 4 },
      { mark: "其他", count: 1 },
    ]);
    assert.deepEqual(
      rows.map((row) => row.mark),
      ["待联系", "已联系", "有意向", "无需求", "跟进中", "已结束", "未标记"],
    );
    assert.equal(rows.find((row) => row.mark === "已联系")?.count, 2);
    assert.equal(rows.find((row) => row.mark === "待联系")?.count, 0);
    assert.equal(rows.find((row) => row.mark === "未标记")?.count, 5);
  });
});

describe("project unassigned filter", () => {
  it("lets a manager filter to projects with no owner", () => {
    assert.deepEqual(projectAssignmentWhere("unassigned", true), { ownerId: null });
    assert.equal(projectAssignmentWhere("", true), null);
  });

  it("does not open unassigned projects to other roles", () => {
    assert.deepEqual(projectAssignmentWhere("unassigned", false), { ownerId: { in: [] } });
  });
});
