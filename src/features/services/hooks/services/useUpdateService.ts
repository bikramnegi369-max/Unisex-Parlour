import { useEntityMutation } from "@/lib/api/mutations";
import { updateService } from "../../api/services.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useQueryClient } from "@tanstack/react-query";
import type { Service, ServicePayload } from "../../types/service.types";

interface UpdateServiceParams {
  id: string;
  payload: ServicePayload;
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useEntityMutation<Service, Error, UpdateServiceParams>({
    mutationFn: ({ id, payload }) => updateService(id, payload),
    invalidateKeys: [getBranchQueryKey("services")],
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("service", [data.id]) });
    },
  });
}
