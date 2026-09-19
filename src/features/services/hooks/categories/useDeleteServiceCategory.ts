import { useEntityMutation } from "@/lib/api/mutations";
import { deleteServiceCategory } from "../../api/serviceCategories.api";
import { useQueryClient } from "@tanstack/react-query";
import { getScopeQueryKey } from "@/lib/api/queryKeys";

export function useDeleteServiceCategory() {
  const queryClient = useQueryClient();

  return useEntityMutation<void, Error, string>({
    mutationFn: deleteServiceCategory,
    invalidateKeys: [getScopeQueryKey("service-categories", null)],
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: getScopeQueryKey("service-category", null, [id]) });
    },
  });
}
