import { useEntityMutation } from "@/lib/api/mutations";
import { updateServiceCategory } from "../../api/serviceCategories.api";
import { useQueryClient } from "@tanstack/react-query";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import type { ServiceCategory, ServiceCategoryPayload } from "../../types/category.types";

interface UpdateServiceCategoryParams {
  id: string;
  payload: ServiceCategoryPayload;
}

export function useUpdateServiceCategory() {
  const queryClient = useQueryClient();

  return useEntityMutation<ServiceCategory, Error, UpdateServiceCategoryParams>({
    mutationFn: ({ id, payload }) => updateServiceCategory(id, payload),
    invalidateKeys: [getScopeQueryKey("service-categories", null)],
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getScopeQueryKey("service-category", null, [data.id]) });
    },
  });
}
