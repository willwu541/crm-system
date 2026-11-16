import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assignableExportUserWhere, projectOwnerFilterUserWhere } from "./assignees";

describe("project owner filter users", () => {
  it("includes sales, managers, and admins who can own a project", () => {
    const where = projectOwnerFilterUserWhere(null);
    assert.deepEqual(where.OR[0], { role: { in: ["SALES", "MANAGER", "ADMIN"] } });
  });

  it("keeps assignment targets as sales and managers", () => {
    const where = assignableExportUserWhere("director-1");
    assert.deepEqual(where.OR[0], { role: { in: ["SALES", "MANAGER"] } });
    assert.deepEqual(where.OR[1], { id: "director-1" });
  });
});
