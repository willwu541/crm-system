import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LEAD_STATUSES, PROJECT_STATUSES } from "@/lib/export-constants";
import { deferStatusChange } from "./defer-development";

describe("defer development", () => {
  it("remembers the in-progress status and restores it", () => {
    const parked = deferStatusChange({
      currentStatus: "contacting",
      requestedStatus: "parked",
      allowed: PROJECT_STATUSES,
      fallback: "hunting",
    });
    assert.deepEqual(parked, { status: "parked", parkedFromStatus: "contacting", log: "mark" });

    const restored = deferStatusChange({
      currentStatus: "parked",
      parkedFromStatus: "contacting",
      resume: true,
      allowed: PROJECT_STATUSES,
      fallback: "hunting",
    });
    assert.deepEqual(restored, { status: "contacting", parkedFromStatus: null, log: "unmark" });
  });

  it("falls back when a lead was parked before the previous status was stored", () => {
    const restored = deferStatusChange({
      currentStatus: "parked",
      parkedFromStatus: null,
      resume: true,
      allowed: LEAD_STATUSES,
      fallback: "new",
    });
    assert.equal(restored.status, "new");
    assert.equal(restored.log, "unmark");
  });

  it("does not treat an unchanged status as a new deferral", () => {
    assert.deepEqual(
      deferStatusChange({
        currentStatus: "parked",
        requestedStatus: "parked",
        parkedFromStatus: "valid",
        allowed: LEAD_STATUSES,
        fallback: "new",
      }),
      { log: null },
    );
  });
});
