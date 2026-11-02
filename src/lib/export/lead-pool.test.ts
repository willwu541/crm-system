import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { resetAccessPolicyCache, saveAccessPolicy } from "../access-policy";
import {
  canAssignExportWork,
  canSeeExportCustomer,
  canSeeExportLeadContacts,
  canStartUsingExportLead,
  canViewExportLead,
  canWorkExportCustomer,
  canWorkExportLead,
  isUndevelopedOwnedLead,
  newExportLeadAssignment,
  presentExportLead,
} from "./lead-pool";

const sales = { id: "sales", role: "SALES" as const };
const admin = { id: "admin", role: "ADMIN" as const };
const manager = { id: "mgr", role: "MANAGER" as const };

after(() => {
  saveAccessPolicy({ directorUserId: null, canView: {} });
  resetAccessPolicyCache();
});

describe("export lead pool visibility", () => {
  it("lets everyone see an unclaimed lead, but not work it", () => {
    assert.equal(canViewExportLead(sales, null), true);
    assert.equal(canWorkExportLead(sales, null), false);
    assert.equal(canWorkExportLead(admin, null), true);
  });

  it("hides a claimed lead from other salespeople", () => {
    assert.equal(canViewExportLead(sales, "other"), false);
    assert.equal(canViewExportLead({ id: "other", role: "SALES" }, "other"), true);
    assert.equal(canViewExportLead(admin, "other"), true);
  });

  it("masks contact fields until the lead is claimed", () => {
    const shown = presentExportLead(
      {
        ownerId: null,
        email: "a@x.com",
        phone: "123",
        notes: "call Friday",
        companyName: "Acme",
      },
      sales,
    );
    assert.equal(shown.contactsLocked, true);
    assert.equal(shown.email, null);
    assert.equal(shown.notes, null);
    assert.equal(shown.companyName, "Acme");
    assert.equal(shown.hasEmail, true);
    assert.equal(shown.canClaim, true);
  });

  it("lets a manager see a granted salesperson's lead, without editing it", () => {
    saveAccessPolicy({ directorUserId: null, canView: { mgr: ["sales"] } });
    resetAccessPolicyCache();
    assert.equal(canViewExportLead(manager, "sales"), true);
    assert.equal(canSeeExportLeadContacts(manager, "sales"), true);
    assert.equal(canWorkExportLead(manager, "sales"), false);
    assert.equal(canViewExportLead(manager, "other"), false);
    const shown = presentExportLead(
      { ownerId: "sales", email: "a@x.com", companyName: "Acme" },
      manager,
    );
    assert.equal(shown.email, "a@x.com");
    assert.equal(shown.contactsLocked, false);
    assert.equal(shown.canWork, false);
    assert.equal(canSeeExportCustomer(manager, "sales"), true);
    assert.equal(canWorkExportCustomer(manager, "sales"), false);
    assert.equal(canSeeExportCustomer(manager, "other"), false);
  });

  it("keeps a salesperson on their own leads even if a grant exists", () => {
    saveAccessPolicy({ directorUserId: null, canView: { sales: ["other"] } });
    resetAccessPolicyCache();
    assert.equal(canViewExportLead(sales, "other"), false);
    assert.equal(canSeeExportLeadContacts(sales, "other"), false);
  });

  it("lets only the manager assign work, not the sales director", () => {
    saveAccessPolicy({ directorUserId: "director", canView: {} });
    resetAccessPolicyCache();
    assert.equal(canAssignExportWork({ id: "boss", role: "ADMIN" }), true);
    assert.equal(canAssignExportWork({ id: "director", role: "ADMIN" }), false);
    assert.equal(canAssignExportWork({ id: "sales", role: "SALES" }), false);
    assert.equal(canAssignExportWork({ id: "mgr", role: "MANAGER" }), false);
  });

  it("creates every new lead in the pool, with no owner", () => {
    assert.deepEqual(newExportLeadAssignment(), { ownerId: null, claimedAt: null });
  });

  it("lets a salesperson start using a pool lead, but not someone else's", () => {
    assert.equal(canStartUsingExportLead(sales, null), true);
    assert.equal(canStartUsingExportLead(sales, "sales"), true);
    assert.equal(canStartUsingExportLead(sales, "other"), false);
    assert.equal(canWorkExportLead(sales, null), false);
  });

  it("hides the pool when the permission switch is off", () => {
    saveAccessPolicy({ directorUserId: null, canView: {}, canUsePool: { sales: false } });
    resetAccessPolicyCache();
    assert.equal(canViewExportLead(sales, null), false);
    assert.equal(canStartUsingExportLead(sales, null), false);
    const shown = presentExportLead(
      { ownerId: null, email: "a@x.com", companyName: "Acme" },
      sales,
    );
    assert.equal(shown.canClaim, false);
  });

  it("keeps pool always on for the admin, but not for the sales director", () => {
    saveAccessPolicy({
      directorUserId: "director",
      canView: {},
      canUsePool: { director: false, sales: false },
    });
    resetAccessPolicyCache();
    assert.equal(canViewExportLead({ id: "boss", role: "ADMIN" }, null), true);
    assert.equal(canViewExportLead({ id: "director", role: "ADMIN" }, null), false);
    assert.equal(canStartUsingExportLead({ id: "director", role: "ADMIN" }, null), false);
  });

  it("treats an unconverted lead as undeveloped even if it still has an old owner", () => {
    assert.equal(
      isUndevelopedOwnedLead({ ownerId: "finder", convertedToCustomerId: null, status: "new" }),
      true,
    );
    assert.equal(
      isUndevelopedOwnedLead({ ownerId: "sales", convertedToCustomerId: "cust", status: "converted" }),
      false,
    );
    assert.equal(
      isUndevelopedOwnedLead({ ownerId: "sales", convertedToCustomerId: null, status: "converted" }),
      false,
    );
    assert.equal(
      isUndevelopedOwnedLead({ ownerId: null, convertedToCustomerId: null, status: "new" }),
      false,
    );
  });
});
