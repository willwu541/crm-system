import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appendProjectUpdateNote, buildProjectUpdateNoteEntry } from "./project-update-note";

describe("project update note", () => {
  it("builds a dated stage change entry", () => {
    const entry = buildProjectUpdateNoteEntry({
      note: "总包说下周开标",
      stage: "tendering",
      previousStage: "pre_construction",
      at: new Date(2026, 10, 10, 9, 5),
    });
    assert.match(entry, /^\[更新 2026-11-10 09:05\]/);
    assert.match(entry, /阶段：施工前 → 招标/);
    assert.match(entry, /总包说下周开标/);
  });

  it("prepends new entry above older notes", () => {
    const merged = appendProjectUpdateNote("旧备注", "[更新 2026-11-10 09:05]\n招标");
    assert.equal(merged, "[更新 2026-11-10 09:05]\n招标\n\n旧备注");
  });

  it("returns null for empty append on empty notes", () => {
    assert.equal(appendProjectUpdateNote(null, "  "), null);
  });
});
