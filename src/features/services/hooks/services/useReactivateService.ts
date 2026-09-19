import { useEntityMutation } from "@/lib/api/mutations";
import { reactivateService } from "../../api/services.api";
import { useQueryClient } from "@tanstack/react-query";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import type { Service } from "../../types/service.types";

export function useReactivateService() {
  const queryClient = useQueryClient();

  return useEntityMutation<Service, Error, string>({
    mutationFn: reactivateService,
    invalidateKeys: [getScopeQueryKey("services", null)],
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getScopeQueryKey("service", null, [data.id]) });
    },
  });
}
