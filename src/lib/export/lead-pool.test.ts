import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { resetAccessPolicyCache, saveAccessPolicy } from "../access-policy";
import {
  canSeeExportCustomer,
  canSeeExportLeadContacts,
  canStartUsingExportLead,
  canViewExportLead,
  canWorkExportCustomer,
  canWorkExportLead,
  isUnusedOwnedLead,
  newExportLeadAssignment,
  patchClaimsExportLead,
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

  it("creates every new lead in the pool, with no owner", () => {
    assert.deepEqual(newExportLeadAssignment(), { ownerId: null, claimedAt: null });
  });

  it("lets a salesperson start using a pool lead, but not someone else's", () => {
    assert.equal(canStartUsingExportLead(sales, null), true);
    assert.equal(canStartUsingExportLead(sales, "sales"), true);
    assert.equal(canStartUsingExportLead(sales, "other"), false);
    assert.equal(canWorkExportLead(sales, null), false);
  });

  it("treats filling a contact method as starting to use the lead", () => {
    assert.equal(patchClaimsExportLead({ whatsapp: "+1 555" }), true);
    assert.equal(patchClaimsExportLead({ email: "a@x.com" }), true);
    assert.equal(patchClaimsExportLead({ phone: "  " }), false);
    assert.equal(patchClaimsExportLead({ companyName: "Acme" }), false);
  });

  it("returns unused owned leads to the pool and keeps contacted or converted ones", () => {
    assert.equal(
      isUnusedOwnedLead({ ownerId: "sales", contactCount: 0, lastContactAt: null, convertedToCustomerId: null }),
      true,
    );
    assert.equal(
      isUnusedOwnedLead({ ownerId: "sales", contactCount: 1, lastContactAt: null, convertedToCustomerId: null }),
      false,
    );
    assert.equal(
      isUnusedOwnedLead({ ownerId: "sales", contactCount: 0, lastContactAt: "2026-01-01", convertedToCustomerId: null }),
      false,
    );
    assert.equal(
      isUnusedOwnedLead({ ownerId: "sales", contactCount: 0, lastContactAt: null, convertedToCustomerId: "cust" }),
      false,
    );
    assert.equal(
      isUnusedOwnedLead({ ownerId: null, contactCount: 0, lastContactAt: null, convertedToCustomerId: null }),
      false,
    );
  });
});
