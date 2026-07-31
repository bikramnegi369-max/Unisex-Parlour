import { useEntityMutation } from "@/lib/api/mutations";
import { updateServiceCategory } from "../../api/serviceCategories.api";
import { serviceCategoryKeys } from "../../api/serviceCategoryKeys";
import type { ServiceCategory, ServiceCategoryPayload } from "../../types/category.types";

interface UpdateServiceCategoryParams {
  id: string;
  payload: ServiceCategoryPayload;
}

export function useUpdateServiceCategory() {
  return useEntityMutation<ServiceCategory, Error, UpdateServiceCategoryParams>({
    mutationFn: ({ id, payload }) => updateServiceCategory(id, payload),
    invalidateKeys: [serviceCategoryKeys.all],
  });
}
