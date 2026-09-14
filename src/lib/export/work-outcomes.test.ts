import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isThinWorkNote, validateWorkLog } from "./work-outcomes";

describe("work log quality", () => {
  it("rejects empty follow-up slogans", () => {
    assert.equal(isThinWorkNote("已跟进"), true);
    assert.equal(isThinWorkNote("any update?"), true);
    assert.equal(isThinWorkNote("ok"), true);
    assert.equal(isThinWorkNote("格栅分销"), false);
    assert.equal(
      isThinWorkNote("官网 Projects 有工厂走道，采购是 Ahmad"),
      false,
    );
  });

  it("requires an outcome and a real note", () => {
    assert.ok(validateWorkLog(undefined, "官网有钢格板产品页"));
    assert.ok(validateWorkLog("real_reply", "已跟进"));
    assert.equal(validateWorkLog("switchboard", "格栅分销"), null);
    assert.equal(validateWorkLog("real_reply", "格栅分销", "Please find our grating catalogue"), null);
    assert.equal(validateWorkLog("real_reply", "对方确认格栅由他们采购，下周发图纸"), null);
  });
});
