import { useEntityMutation } from "@/lib/api/mutations";
import { createServiceCategory } from "../../api/serviceCategories.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import type { ServiceCategory, ServiceCategoryPayload } from "../../types/category.types";

export function useCreateServiceCategory() {
  const { getBranchQueryKey } = useBranchContext();
  return useEntityMutation<ServiceCategory, Error, ServiceCategoryPayload>({
    mutationFn: createServiceCategory,
    invalidateKeys: [getBranchQueryKey("service-categories")],
  });
}
