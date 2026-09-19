import { useEntityMutation } from "@/lib/api/mutations";
import { reactivateServiceCategory } from "../../api/serviceCategories.api";
import { useQueryClient } from "@tanstack/react-query";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import type { ServiceCategory } from "../../types/category.types";

export function useReactivateServiceCategory() {
  const queryClient = useQueryClient();

  return useEntityMutation<ServiceCategory, Error, string>({
    mutationFn: reactivateServiceCategory,
    invalidateKeys: [getScopeQueryKey("service-categories", null)],
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getScopeQueryKey("service-category", null, [data.id]) });
    },
  });
}
