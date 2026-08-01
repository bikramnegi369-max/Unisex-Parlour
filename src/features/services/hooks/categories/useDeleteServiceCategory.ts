import { useEntityMutation } from "@/lib/api/mutations";
import { deleteServiceCategory } from "../../api/serviceCategories.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useQueryClient } from "@tanstack/react-query";

export function useDeleteServiceCategory() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useEntityMutation<void, Error, string>({
    mutationFn: deleteServiceCategory,
    invalidateKeys: [getBranchQueryKey("service-categories")],
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("service-category", [id]) });
    },
  });
}
