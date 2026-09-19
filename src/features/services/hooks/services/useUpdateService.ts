import { useEntityMutation } from "@/lib/api/mutations";
import { updateService } from "../../api/services.api";
import { useQueryClient } from "@tanstack/react-query";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import type { Service, ServicePayload } from "../../types/service.types";

interface UpdateServiceParams {
  id: string;
  payload: ServicePayload;
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useEntityMutation<Service, Error, UpdateServiceParams>({
    mutationFn: ({ id, payload }) => updateService(id, payload),
    invalidateKeys: [getScopeQueryKey("services", null)],
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getScopeQueryKey("service", null, [data.id]) });
    },
  });
}
