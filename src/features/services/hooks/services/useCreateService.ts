import { useEntityMutation } from "@/lib/api/mutations";
import { createService } from "../../api/services.api";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import type { Service, ServicePayload } from "../../types/service.types";

export function useCreateService() {
  return useEntityMutation<Service, Error, ServicePayload>({
    mutationFn: createService,
    invalidateKeys: [getScopeQueryKey("services", null)],
  });
}
