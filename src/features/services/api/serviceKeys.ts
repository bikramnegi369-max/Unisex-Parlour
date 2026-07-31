import type { ServiceFilters } from "../types/filters.types";

export const serviceKeys = {
  all: ["services"] as const,
  lists: () => [...serviceKeys.all, "list"] as const,
  list: (branchId: string | null, filters: ServiceFilters) => [...serviceKeys.lists(), { branchId, ...filters }] as const,
  details: () => [...serviceKeys.all, "detail"] as const,
  detail: (id: string) => [...serviceKeys.details(), id] as const,
};
