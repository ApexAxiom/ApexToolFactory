import { describe, expect, it } from "vitest";
import { OrganizationMembership, RoleName } from "@/domain/types";
import { assertPermission, hasPermission } from "@/server/auth/permissions";

function membership(role: RoleName, status: OrganizationMembership["status"] = "ACTIVE"): OrganizationMembership {
  const timestamp = new Date().toISOString();
  return {
    id: "membership-1",
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: "org-1",
    email: "person@example.com",
    role,
    status,
    branchIds: []
  };
}

describe("role permissions", () => {
  it("lets owners and office managers do everything", () => {
    for (const role of ["OWNER", "OFFICE_MANAGER"] as const) {
      expect(hasPermission(membership(role), "payments:record")).toBe(true);
      expect(hasPermission(membership(role), "team:manage")).toBe(true);
      expect(hasPermission(membership(role), "jobs:write")).toBe(true);
    }
  });

  it("limits technicians to job status updates", () => {
    const tech = membership("TECHNICIAN");
    expect(hasPermission(tech, "jobs:update-status")).toBe(true);
    expect(hasPermission(tech, "jobs:write")).toBe(false);
    expect(hasPermission(tech, "invoices:write")).toBe(false);
    expect(hasPermission(tech, "team:manage")).toBe(false);
  });

  it("keeps estimators out of money and team management", () => {
    const estimator = membership("ESTIMATOR");
    expect(hasPermission(estimator, "quotes:send")).toBe(true);
    expect(hasPermission(estimator, "payments:record")).toBe(false);
    expect(hasPermission(estimator, "settings:manage")).toBe(false);
  });

  it("denies everything for non-active memberships", () => {
    expect(hasPermission(membership("OWNER", "DISABLED"), "quotes:write")).toBe(false);
    expect(hasPermission(membership("OWNER", "INVITED"), "quotes:write")).toBe(false);
  });

  it("throws a readable error when permission is missing", () => {
    expect(() => assertPermission(membership("TECHNICIAN"), "invoices:write")).toThrow(/technician role/);
  });
});
