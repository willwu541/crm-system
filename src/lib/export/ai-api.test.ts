import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { authorizeExportAiKey, readWithExportAiKey } from "./ai-api";
import { rejectAiRecordBody } from "./ai-records";

const KEY = "manager-test-key";

describe("export ai api key", () => {
  it("rejects a missing key and does not read", async () => {
    let reads = 0;
    const result = await readWithExportAiKey(null, async () => {
      reads += 1;
      return ["customer"];
    }, "");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 503);
    assert.equal(reads, 0);
  });

  it("rejects a wrong key and does not read", async () => {
    let reads = 0;
    const result = await readWithExportAiKey("Bearer wrong-key", async () => {
      reads += 1;
      return ["customer"];
    }, KEY);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 401);
    assert.equal(reads, 0);
    assert.equal(authorizeExportAiKey("Bearer ", KEY).ok, false);
  });

  it("reads only when the key matches", async () => {
    let reads = 0;
    const result = await readWithExportAiKey(`Bearer ${KEY}`, async () => {
      reads += 1;
      return [{ companyName: "Acme" }];
    }, KEY);
    assert.equal(result.ok, true);
    assert.equal(reads, 1);
    if (result.ok) assert.equal(result.data?.[0]?.companyName, "Acme");
  });
});

describe("export ai manager writes", () => {
  it("documents the allowed writes and keeps mail and deletes out", () => {
    const route = readFileSync(new URL("../../app/api/export/ai/[[...path]]/route.ts", import.meta.url), "utf8");
    const spec = readFileSync(new URL("../../../docs/export-ai-openapi.yaml", import.meta.url), "utf8");
    const page = readFileSync(new URL("../../app/(admin-console)/admin/users/page.tsx", import.meta.url), "utf8");
    assert.match(route, /export async function POST/);
    assert.match(route, /export async function PATCH/);
    assert.doesNotMatch(route, /createEmailDraft|buildEmailDraft|待发送草稿|sendMail|resend/);
    assert.doesNotMatch(route, /deleteMany|exportCustomer\.delete|exportLead\.delete|exportProject\.delete|exportContact\.delete/);
    assert.doesNotMatch(route, /status:\s*"abandoned"/);
    assert.doesNotMatch(spec, /\/api\/export\/ai\/emails/);
    assert.doesNotMatch(spec, /\/abandon/);
    assert.match(spec, /不能发信/);
    assert.match(spec, /不能废弃/);
    assert.match(page, /可新建和修改线索、项目、客户、联系人/);
    assert.match(page, /不能发邮件/);
    assert.match(page, /不能删除，不能废弃，不能改金额/);
    for (const path of [
      "/api/export/ai/customers:",
      "/api/export/ai/customers/{id}:",
      "/api/export/ai/customers/{id}/contacts:",
      "/api/export/ai/customers/{id}/analysis:",
      "/api/export/ai/contacts/{id}:",
      "/api/export/ai/leads:",
      "/api/export/ai/leads/{id}:",
      "/api/export/ai/leads/{id}/progress-mark:",
      "/api/export/ai/leads/{id}/follow-ups:",
      "/api/export/ai/leads/{id}/claim:",
      "/api/export/ai/leads/{id}/assign:",
      "/api/export/ai/projects:",
      "/api/export/ai/projects/{id}:",
      "/api/export/ai/projects/{id}/progress-mark:",
      "/api/export/ai/projects/{id}/follow-ups:",
      "/api/export/ai/projects/{id}/claim:",
      "/api/export/ai/projects/{id}/assign:",
    ]) {
      assert.match(spec, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.match(route, /takeExportLeadFromPool/);
    assert.match(route, /claimUnassignedExportProject/);
    assert.match(route, /assignExportLead/);
    assert.match(route, /kind: "assign"/);
    assert.match(route, /kind: "progress"/);
    assert.match(route, /kind: "follow_up"/);
    assert.match(route, /assignedById: boss\.id/);
    assert.match(route, /createAiLead/);
    assert.match(route, /createAiProject/);
    assert.match(route, /createAiCustomer/);
    assert.match(route, /createAiContact/);
    assert.match(route, /updateAiLead/);
    assert.match(route, /updateAiProject/);
    assert.match(route, /updateAiCustomer/);
    assert.match(route, /updateAiContact/);
    assert.match(spec, /post:/);
    assert.match(spec, /patch:/);
    assert.equal(rejectAiRecordBody({ ownerId: "someone" }), "不能指定负责人");
    assert.equal(rejectAiRecordBody({ projectValueText: "1万元" }), "不能改金额");
    assert.equal(rejectAiRecordBody({ status: "abandoned" }), "不能废弃");
    assert.equal(rejectAiRecordBody({ companyName: "Acme", notes: "备注" }), null);
  });
});
