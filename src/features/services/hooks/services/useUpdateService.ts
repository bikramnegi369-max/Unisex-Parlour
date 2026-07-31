import { useEntityMutation } from "@/lib/api/mutations";
import { updateService } from "../../api/services.api";
import { serviceKeys } from "../../api/serviceKeys";
import type { Service, ServicePayload } from "../../types/service.types";

interface UpdateServiceParams {
  id: string;
  payload: ServicePayload;
}

export function useUpdateService() {
  return useEntityMutation<Service, Error, UpdateServiceParams>({
    mutationFn: ({ id, payload }) => updateService(id, payload),
    invalidateKeys: [serviceKeys.all],
  });
}
