import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import {
  canSeeOwner,
  createdByScope,
  exportOwnerFilter,
  isOwnDataOnly,
  ownerScope,
  saveAccessPolicy,
} from "./access-policy";

function user(role: "ADMIN" | "MANAGER" | "SALES", id = "u1") {
  return { id, email: `${id}@t.com`, name: id, role, tenant: "domestic" as const };
}

after(() => {
  saveAccessPolicy({ directorUserId: null, canView: {} });
});

describe("person-level visibility", () => {
  it("director sees everyone", () => {
    saveAccessPolicy({ directorUserId: "boss", canView: {} });
    const boss = user("ADMIN", "boss");
    assert.equal(isOwnDataOnly(boss), false);
    assert.deepEqual(ownerScope(boss), {});
    assert.equal(exportOwnerFilter(boss), undefined);
  });

  it("a salesperson can be allowed to see one manager", () => {
    saveAccessPolicy({
      directorUserId: "boss",
      canView: { sales1: ["manager1"] },
    });
    const sales = user("SALES", "sales1");
    assert.equal(isOwnDataOnly(sales), false);
    assert.deepEqual(ownerScope(sales), { ownerId: { in: ["sales1", "manager1"] } });
    assert.equal(canSeeOwner(exportOwnerFilter(sales), "manager1"), true);
    assert.equal(canSeeOwner(exportOwnerFilter(sales), "manager2"), false);
  });

  it("managers only see the people you pick", () => {
    saveAccessPolicy({
      directorUserId: "boss",
      canView: { manager1: ["sales1"] },
    });
    const manager = user("MANAGER", "manager1");
    assert.deepEqual(createdByScope(manager), { createdById: { in: ["manager1", "sales1"] } });
    assert.equal(canSeeOwner(exportOwnerFilter(manager), "sales2"), false);
  });
});
