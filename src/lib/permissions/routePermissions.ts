import { PermissionType } from "./index";

/**
 * Maps frontend route path segments to their required permissions.
 * Keys should be the pathname sub-path or exact path (e.g. "/users", "/roles").
 * The guard will check if the user has the mapped permission to access the route.
 */
export const routePermissions = {
  "/users": "users.manage",
  "/roles": "roles.manage",
  "/branches": "branches.manage",
  "/finance": "finance.view",
  "/reports": "reports.view",
  "/customers": "customers.view",
  "/appointments": "appointments.view",
  "/employees": "employees.view",
  "/services": "services.view",
  "/memberships": "billing.view",
  "/coupons": "billing.view",
  "/inventory": "inventory.view",
  "/activity-logs": "activity-logs.view",
  "/settings": "settings.view",
} as const satisfies Record<string, PermissionType>;

export type RoutePath = keyof typeof routePermissions;

