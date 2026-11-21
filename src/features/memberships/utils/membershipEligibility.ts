import type { MembershipBenefits } from "../types/membership.types";

interface ServiceEntity {
  id?: string;
  _id?: string;
  serviceId?: string;
  categoryId?: string | { _id?: string; id?: string };
}

type IdLike = string | { id?: string; _id?: string } | null | undefined;

function extractId(value: IdLike): string | undefined {
  if (!value) return undefined;
  if (typeof value === "object") {
    return (value._id || value.id)?.toString();
  }
  return typeof value === "string" ? value : String(value);
}

function matchesId(list: IdLike[] | undefined | null, targetId?: string): boolean {
  if (!Array.isArray(list) || !targetId) return false;
  return list.some((item) => extractId(item) === targetId);
}

/**
 * Determines whether a service is eligible for membership benefits based on category
 * and specific service inclusion and exclusion lists.
 *
 * Rules:
 * 1. Exclusions have absolute precedence: if serviceId or categoryId is excluded, return false.
 * 2. If neither eligibleServiceIds nor eligibleServiceCategoryIds are specified (or both are empty),
 *    all non-excluded services qualify (default permissive behavior).
 * 3. If eligible lists are specified, the service must match at least one inclusion rule:
 *    either serviceId is in eligibleServiceIds OR categoryId is in eligibleServiceCategoryIds.
 */
export function isServiceEligibleForMembershipBenefits(
  service: ServiceEntity,
  benefits?: Partial<MembershipBenefits> | null
): boolean {
  if (!benefits) return false;

  const srvId = extractId(service.serviceId || service.id || service._id);
  const catId = extractId(service.categoryId);

  // 1. Exclusions have absolute precedence
  if (srvId && matchesId(benefits.excludedServiceIds, srvId)) {
    return false;
  }

  if (catId && matchesId(benefits.excludedServiceCategoryIds, catId)) {
    return false;
  }

  // 2. Inclusions
  const hasEligibleServices =
    Array.isArray(benefits.eligibleServiceIds) && benefits.eligibleServiceIds.length > 0;
  const hasEligibleCats =
    Array.isArray(benefits.eligibleServiceCategoryIds) &&
    benefits.eligibleServiceCategoryIds.length > 0;

  // Default: if neither eligible list is defined or non-empty, all non-excluded services qualify
  if (!hasEligibleServices && !hasEligibleCats) {
    return true;
  }

  // If inclusion lists exist, match either specific service or category
  if (hasEligibleServices && srvId && matchesId(benefits.eligibleServiceIds, srvId)) {
    return true;
  }

  if (hasEligibleCats && catId && matchesId(benefits.eligibleServiceCategoryIds, catId)) {
    return true;
  }

  return false;
}
