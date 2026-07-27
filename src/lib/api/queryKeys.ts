/**
 * Scope structure for query keys.
 */
export type QueryScope =
  | { scope: "branch"; branchId: string }
  | { scope: "organization" };

/**
 * Returns a scope-aware query key for any given entity/feature.
 *
 * @param entityName The name of the entity, e.g. "customers", "appointments"
 * @param branchId The active branch ID (null or "all" representing organization-wide)
 * @param additionalKeys Additional dynamic query key parts (e.g. search, filters, pagination)
 */
export function getScopeQueryKey(
  entityName: string,
  branchId: string | null,
  additionalKeys: unknown[] = []
): [string, QueryScope, ...unknown[]] {
  const isOrgScope = branchId === null || branchId === "all";
  const scopeObj: QueryScope = isOrgScope
    ? { scope: "organization" }
    : { scope: "branch", branchId };

  return [entityName, scopeObj, ...additionalKeys];
}
