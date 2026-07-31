import { useEntityMutation } from "@/lib/api/mutations";
import { createService } from "../../api/services.api";
import { serviceKeys } from "../../api/serviceKeys";
import type { Service, ServicePayload } from "../../types/service.types";

export function useCreateService() {
  return useEntityMutation<Service, Error, ServicePayload>({
    mutationFn: createService,
    invalidateKeys: [serviceKeys.all],
  });
}
