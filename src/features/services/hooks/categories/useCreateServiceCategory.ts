import { useEntityMutation } from "@/lib/api/mutations";
import { createServiceCategory } from "../../api/serviceCategories.api";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import type { ServiceCategory, ServiceCategoryPayload } from "../../types/category.types";

export function useCreateServiceCategory() {
  return useEntityMutation<ServiceCategory, Error, ServiceCategoryPayload>({
    mutationFn: createServiceCategory,
    invalidateKeys: [getScopeQueryKey("service-categories", null)],
  });
}
