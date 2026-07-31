import { useEntityMutation } from "@/lib/api/mutations";
import { reactivateService } from "../../api/services.api";
import { serviceKeys } from "../../api/serviceKeys";
import type { Service } from "../../types/service.types";

export function useReactivateService() {
  return useEntityMutation<Service, Error, string>({
    mutationFn: reactivateService,
    invalidateKeys: [serviceKeys.all],
  });
}
