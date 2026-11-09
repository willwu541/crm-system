import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dispatchAssignmentError, extractLeadManagerProjectNumber } from "./project-dispatch";

const waterPlant = "137094003";

describe("extractLeadManagerProjectNumber", () => {
  it("reads the project id from a LeadManager path and ignores version queries", () => {
    const base = `https://app-leadmanager.bcicentral.com/main/project/${waterPlant}`;
    assert.equal(extractLeadManagerProjectNumber(base), waterPlant);
    assert.equal(extractLeadManagerProjectNumber(`${base}?version=4&updated=20261106`), waterPlant);
    assert.equal(extractLeadManagerProjectNumber(`${base}?version=999999`), waterPlant);
    assert.equal(extractLeadManagerProjectNumber(`${base}/v2?foo=1`), waterPlant);
    assert.equal(
      extractLeadManagerProjectNumber(`https://app-leadmanager.bcicentral.com/#/main/project/${waterPlant}?version=2`),
      waterPlant,
    );
  });

  it("reads a labeled or plain project number", () => {
    assert.equal(extractLeadManagerProjectNumber("LM 137094003"), waterPlant);
    assert.equal(extractLeadManagerProjectNumber("lm:137094003"), waterPlant);
    assert.equal(extractLeadManagerProjectNumber(waterPlant), waterPlant);
  });

  it("reads projectId from the query and ignores a version-only link", () => {
    assert.equal(
      extractLeadManagerProjectNumber(
        `https://app-leadmanager.bcicentral.com/main/search?projectId=${waterPlant}&version=3`,
      ),
      waterPlant,
    );
    assert.equal(extractLeadManagerProjectNumber("https://example.com/page?version=137094003"), null);
    assert.equal(extractLeadManagerProjectNumber(""), null);
    assert.equal(extractLeadManagerProjectNumber("Kuala Kubu Bharu water plant"), null);
  });
});

describe("dispatchAssignmentError", () => {
  it("lets a draft save without an assignee or a question", () => {
    assert.equal(dispatchAssignmentError({ mode: "draft", ownerId: null, nextStep: "" }), null);
    assert.equal(dispatchAssignmentError({ mode: "draft", ownerId: "user", nextStep: null }), null);
  });

  it("requires an owner and a question when assigning, but not a contact name", () => {
    assert.equal(
      dispatchAssignmentError({ mode: "assign", ownerId: null, nextStep: "问钢格板" }),
      "分配前请选择业务员",
    );
    assert.equal(
      dispatchAssignmentError({ mode: "assign", ownerId: "user", nextStep: "  " }),
      "分配前请写明业务员要问什么",
    );
    assert.equal(
      dispatchAssignmentError({ mode: "assign", ownerId: "user", nextStep: "确认是否用钢格板" }),
      null,
    );
  });
});
