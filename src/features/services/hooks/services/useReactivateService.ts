import { useEntityMutation } from "@/lib/api/mutations";
import { reactivateService } from "../../api/services.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useQueryClient } from "@tanstack/react-query";
import type { Service } from "../../types/service.types";

export function useReactivateService() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useEntityMutation<Service, Error, string>({
    mutationFn: reactivateService,
    invalidateKeys: [getBranchQueryKey("services")],
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("service", [data.id]) });
    },
  });
}
