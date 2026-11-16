import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { projectLifecycleWhere } from "./project-lifecycle";

describe("projectLifecycleWhere", () => {
  it("defaults to excluding abandoned and deferred", () => {
    assert.deepEqual(projectLifecycleWhere(undefined), { status: { notIn: ["abandoned", "parked"] } });
    assert.deepEqual(projectLifecycleWhere("active"), { status: { notIn: ["abandoned", "parked"] } });
  });

  it("filters abandoned and deferred tabs", () => {
    assert.deepEqual(projectLifecycleWhere("abandoned"), { status: "abandoned" });
    assert.deepEqual(projectLifecycleWhere("parked"), { status: "parked" });
  });

  it("skips lifecycle when exact status is set", () => {
    assert.deepEqual(projectLifecycleWhere("active", "hunting"), {});
    assert.deepEqual(projectLifecycleWhere("abandoned", "abandoned"), {});
  });
});
