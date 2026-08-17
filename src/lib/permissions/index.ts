import type { BranchAccess } from "@/types/branch";

export type PermissionType =
  | "customers.view"
  | "customers.create"
  | "customers.edit"
  | "customers.update"
  | "customers.delete"
  | "appointments.view"
  | "appointments.create"
  | "appointments.edit"
  | "appointments.update_status"
  | "appointments.cancel"
  | "appointments.delete"
  | "appointments.reminders.send"
  | "employees.view"
  | "employees.create"
  | "employees.edit"
  | "employees.update"
  | "employees.delete"
  | "employees.assign_branch"
  | "employees.assign_service"
  | "employees.leaves.view"
  | "employees.leaves.manage"
  | "services.view"
  | "services.create"
  | "services.edit"
  | "services.update"
  | "services.delete"
  | "billing.view"
  | "billing.create"
  | "billing.refund"
  | "finance.view"
  | "finance.create"
  | "finance.edit"
  | "inventory.view"
  | "inventory.create"
  | "inventory.adjust"
  | "reports.view"
  | "settings.view"
  | "settings.edit"
  | "settings.update"
  | "users.manage"
  | "users.view"
  | "users.create"
  | "users.update"
  | "roles.view"
  | "roles.create"
  | "roles.update"
  | "roles.delete"
  | "branches.view"
  | "branches.create"
  | "branches.update"
  | "branches.delete"
  | "activity-logs.view";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string; // Dynamic role representation to support future custom roles
  permissions: PermissionType[];
  /** The organization this user belongs to. */
  organizationId: string;
  /**
   * List of branches the user is authorized to access.
   * Users with organization-wide access typically receive access to all branches via the backend.
   * An empty array means no branch access has been granted yet.
   */
  branchAccess: BranchAccess[];
  /** If true, the user has access across all branches in the organization. */
  hasOrgWideAccess?: boolean;
}

// ---------------------------------------------------------------------------
// Permission Helpers
// ---------------------------------------------------------------------------

export function hasPermission(user: UserSession | null, permission: PermissionType): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(user: UserSession | null, permissions: PermissionType[]): boolean {
  if (!user) return false;
  return permissions.some((p) => user.permissions.includes(p));
}

export function hasAllPermissions(user: UserSession | null, permissions: PermissionType[]): boolean {
  if (!user) return false;
  return permissions.every((p) => user.permissions.includes(p));
}

// ---------------------------------------------------------------------------
// Branch Access Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the user has access to the given branch.
 * Users with organization-wide access always have access to all branches.
 */
export function hasBranchAccess(user: UserSession | null, branchId: string): boolean {
  if (!user) return false;
  if (hasOrgWideAccess(user)) return true;
  return user.branchAccess.some((b) => b.branchId === branchId && b.isActive);
}

/**
 * Returns the list of active branches the user is authorized to access.
 * For users with org-wide access, this returns all branches.
 */
export function getAccessibleBranches(user: UserSession | null): BranchAccess[] {
  if (!user) return [];
  return user.branchAccess.filter((b) => b.isActive);
}

/**
 * Returns true if the user has org-wide access across all branches.
 * This drives whether the "All Branches" switcher option is shown.
 */
export function hasOrgWideAccess(user: UserSession | null): boolean {
  if (!user) return false;
  return !!user.hasOrgWideAccess;
}

