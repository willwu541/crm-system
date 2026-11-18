import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appendTimestampedNote, progressMarkActivityText } from "./ai-writes";

describe("export ai notes", () => {
  it("appends analysis without dropping earlier text", () => {
    const first = appendTimestampedNote(null, "第一次分析", new Date("2026-11-18T03:16:00Z"));
    const second = appendTimestampedNote(first, "第二次分析", new Date("2026-11-18T04:16:00Z"));
    assert.match(first, /第一次分析/);
    assert.match(second, /第一次分析/);
    assert.match(second, /第二次分析/);
    assert.ok(second.indexOf("第一次分析") < second.indexOf("第二次分析"));
  });

  it("names a progress mark the way the daily summary reads it", () => {
    assert.equal(progressMarkActivityText("已联系"), "进度标记改为已联系");
  });
});
