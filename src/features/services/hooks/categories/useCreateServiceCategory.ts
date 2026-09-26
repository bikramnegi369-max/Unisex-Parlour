import { useEntityMutation } from "@/lib/api/mutations";
import { createServiceCategory } from "../../api/serviceCategories.api";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import type { ServiceCategory, ServiceCategoryCreatePayload } from "../../types/category.types";

export function useCreateServiceCategory() {
  return useEntityMutation<ServiceCategory, Error, ServiceCategoryCreatePayload>({
    mutationFn: createServiceCategory,
    invalidateKeys: [getScopeQueryKey("service-categories", null)],
  });
}
