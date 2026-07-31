import { useEntityMutation } from "@/lib/api/mutations";
import { reactivateServiceCategory } from "../../api/serviceCategories.api";
import { serviceCategoryKeys } from "../../api/serviceCategoryKeys";
import type { ServiceCategory } from "../../types/category.types";

export function useReactivateServiceCategory() {
  return useEntityMutation<ServiceCategory, Error, string>({
    mutationFn: reactivateServiceCategory,
    invalidateKeys: [serviceCategoryKeys.all],
  });
}
