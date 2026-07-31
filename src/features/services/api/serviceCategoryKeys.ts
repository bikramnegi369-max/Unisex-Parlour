import type { ServiceCategoryFilters } from "../types/filters.types";

export const serviceCategoryKeys = {
  all: ["service-categories"] as const,
  lists: () => [...serviceCategoryKeys.all, "list"] as const,
  list: (branchId: string | null, filters: ServiceCategoryFilters) => [...serviceCategoryKeys.lists(), { branchId, ...filters }] as const,
  details: () => [...serviceCategoryKeys.all, "detail"] as const,
  detail: (id: string) => [...serviceCategoryKeys.details(), id] as const,
};
