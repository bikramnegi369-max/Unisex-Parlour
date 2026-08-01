import { useEntityMutation } from "@/lib/api/mutations";
import { updateServiceStatus } from "../../api/services.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useQueryClient } from "@tanstack/react-query";
import type { Service } from "../../types/service.types";

interface UpdateServiceStatusParams {
  id: string;
  isActive: boolean;
}

export function useUpdateServiceStatus() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useEntityMutation<Service, Error, UpdateServiceStatusParams>({
    mutationFn: ({ id, isActive }) => updateServiceStatus(id, isActive),
    invalidateKeys: [getBranchQueryKey("services")],
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("service", [data.id]) });
    },
  });
}
