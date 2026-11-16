import assert from "node:assert/strict";
import test from "node:test";
import { formatSourceUpdatedAt } from "./source-updated-at";

test("东八区到分钟", () => {
  assert.equal(formatSourceUpdatedAt("2026-11-16T02:34:00.000Z"), "2026-11-16 10:34");
  assert.equal(formatSourceUpdatedAt(null), null);
  assert.equal(formatSourceUpdatedAt(""), null);
});
