import { PermissionType } from "./index";

/**
 * Maps frontend route path segments to their required permissions.
 * Keys should be the pathname sub-path or exact path (e.g. "/users", "/roles").
 * The guard will check if the user has the mapped permission to access the route.
 */
export const routePermissions = {
  "/dashboard": null, // Common authenticated navigation
  "/users": "users.view",
  "/roles": "roles.manage",
  "/branches": "branches.manage",
  "/billing": "billing.view",
  "/finance": "finance.view",
  "/reports": "reports.view",
  "/customers": "customers.view",
  "/appointments": "appointments.view",
  "/employees": "employees.view",
  "/leaves": "employees.leaves.view",
  "/services": "services.view",
  "/services/categories": "services.view",
  "/memberships": "billing.view",
  "/coupons": "billing.view",
  "/loyalty": "billing.view",
  "/inventory": "inventory.view",
  "/suppliers": "inventory.view",
  "/activity-logs": "activity-logs.view",
  "/settings": "settings.view",
} as const satisfies Record<string, PermissionType | null>;

export type RoutePath = keyof typeof routePermissions;


