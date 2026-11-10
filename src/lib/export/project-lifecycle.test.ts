import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { projectLifecycleWhere } from "./project-lifecycle";

describe("projectLifecycleWhere", () => {
  it("defaults to excluding abandoned", () => {
    assert.deepEqual(projectLifecycleWhere(undefined), { status: { not: "abandoned" } });
    assert.deepEqual(projectLifecycleWhere("active"), { status: { not: "abandoned" } });
  });

  it("filters abandoned tab", () => {
    assert.deepEqual(projectLifecycleWhere("abandoned"), { status: "abandoned" });
  });

  it("skips lifecycle when exact status is set", () => {
    assert.deepEqual(projectLifecycleWhere("active", "hunting"), {});
    assert.deepEqual(projectLifecycleWhere("abandoned", "abandoned"), {});
  });
});
