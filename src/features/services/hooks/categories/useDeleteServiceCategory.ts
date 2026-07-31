import { useEntityMutation } from "@/lib/api/mutations";
import { deleteServiceCategory } from "../../api/serviceCategories.api";
import { serviceCategoryKeys } from "../../api/serviceCategoryKeys";

export function useDeleteServiceCategory() {
  return useEntityMutation<void, Error, string>({
    mutationFn: deleteServiceCategory,
    invalidateKeys: [serviceCategoryKeys.all],
  });
}
