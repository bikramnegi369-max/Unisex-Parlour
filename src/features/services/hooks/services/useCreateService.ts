import { useEntityMutation } from "@/lib/api/mutations";
import { createService } from "../../api/services.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import type { Service, ServicePayload } from "../../types/service.types";

export function useCreateService() {
  const { getBranchQueryKey } = useBranchContext();
  return useEntityMutation<Service, Error, ServicePayload>({
    mutationFn: createService,
    invalidateKeys: [getBranchQueryKey("services")],
  });
}
