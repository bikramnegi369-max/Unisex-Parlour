import { useEntityMutation } from "@/lib/api/mutations";
import { reactivateServiceCategory } from "../../api/serviceCategories.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useQueryClient } from "@tanstack/react-query";
import type { ServiceCategory } from "../../types/category.types";

export function useReactivateServiceCategory() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useEntityMutation<ServiceCategory, Error, string>({
    mutationFn: reactivateServiceCategory,
    invalidateKeys: [getBranchQueryKey("service-categories")],
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("service-category", [data.id]) });
    },
  });
}
