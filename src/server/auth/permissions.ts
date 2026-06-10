import { OrganizationMembership, RoleName } from "@/domain/types";

export type Permission =
  | "customers:write"
  | "quotes:write"
  | "quotes:send"
  | "invoices:write"
  | "payments:record"
  | "jobs:write"
  | "jobs:update-status"
  | "team:manage"
  | "settings:manage";

const allPermissions: Permission[] = [
  "customers:write",
  "quotes:write",
  "quotes:send",
  "invoices:write",
  "payments:record",
  "jobs:write",
  "jobs:update-status",
  "team:manage",
  "settings:manage"
];

const rolePermissions: Record<RoleName, Permission[]> = {
  OWNER: allPermissions,
  OFFICE_MANAGER: allPermissions,
  ESTIMATOR: ["customers:write", "quotes:write", "quotes:send", "jobs:write", "jobs:update-status"],
  TECHNICIAN: ["jobs:update-status"],
  ACCOUNTING: ["invoices:write", "payments:record"]
};

export function hasPermission(membership: OrganizationMembership, permission: Permission) {
  return membership.status === "ACTIVE" && rolePermissions[membership.role].includes(permission);
}

export function assertPermission(membership: OrganizationMembership, permission: Permission) {
  if (!hasPermission(membership, permission)) {
    throw new Error(`Your ${membership.role.toLowerCase().replace("_", " ")} role does not allow this action`);
  }
}
