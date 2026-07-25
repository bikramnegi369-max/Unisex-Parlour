export type QueryScope =
  | { type: "organization" }
  | { type: "branch"; branchId: string };

/**
 * Reusable helper function to generate consistent, scope-isolated cache keys.
 * Ensures data scope is partitioned correctly by organization and branch.
 */
export function createScopedQueryKey(
  entity: string,
  organizationId: string,
  scope: QueryScope,
  filters?: Record<string, unknown>
): unknown[] {
  const scopeSegment = scope.type === "organization" ? "organization" : scope.branchId;
  return filters 
    ? [entity, organizationId, scopeSegment, filters] 
    : [entity, organizationId, scopeSegment];
}
