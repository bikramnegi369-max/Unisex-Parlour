import { useEntityMutation } from "@/lib/api/mutations";
import { updateServiceCategory } from "../../api/serviceCategories.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useQueryClient } from "@tanstack/react-query";
import type { ServiceCategory, ServiceCategoryPayload } from "../../types/category.types";

interface UpdateServiceCategoryParams {
  id: string;
  payload: ServiceCategoryPayload;
}

export function useUpdateServiceCategory() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useEntityMutation<ServiceCategory, Error, UpdateServiceCategoryParams>({
    mutationFn: ({ id, payload }) => updateServiceCategory(id, payload),
    invalidateKeys: [getBranchQueryKey("service-categories")],
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("service-category", [data.id]) });
    },
  });
}
