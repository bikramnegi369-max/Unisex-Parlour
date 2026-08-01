import { useEntityMutation } from "@/lib/api/mutations";
import { deleteService } from "../../api/services.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useQueryClient } from "@tanstack/react-query";

export function useDeleteService() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useEntityMutation<void, Error, string>({
    mutationFn: deleteService,
    invalidateKeys: [getBranchQueryKey("services")],
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("service", [id]) });
    },
  });
}
