import { useEntityMutation } from "@/lib/api/mutations";
import { updateServiceStatus } from "../../api/services.api";
import { useQueryClient } from "@tanstack/react-query";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import type { Service } from "../../types/service.types";

interface UpdateServiceStatusParams {
  id: string;
  isActive: boolean;
}

export function useUpdateServiceStatus() {
  const queryClient = useQueryClient();

  return useEntityMutation<Service, Error, UpdateServiceStatusParams>({
    mutationFn: ({ id, isActive }) => updateServiceStatus(id, isActive),
    invalidateKeys: [getScopeQueryKey("services", null)],
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getScopeQueryKey("service", null, [data.id]) });
    },
  });
}
