import { useEntityMutation } from "@/lib/api/mutations";
import { deleteService } from "../../api/services.api";
import { useQueryClient } from "@tanstack/react-query";
import { getScopeQueryKey } from "@/lib/api/queryKeys";

export function useDeleteService() {
  const queryClient = useQueryClient();

  return useEntityMutation<void, Error, string>({
    mutationFn: deleteService,
    invalidateKeys: [getScopeQueryKey("services", null)],
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: getScopeQueryKey("service", null, [id]) });
    },
  });
}
