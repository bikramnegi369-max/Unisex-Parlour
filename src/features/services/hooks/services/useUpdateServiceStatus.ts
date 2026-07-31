import { useEntityMutation } from "@/lib/api/mutations";
import { updateServiceStatus } from "../../api/services.api";
import { serviceKeys } from "../../api/serviceKeys";
import type { Service } from "../../types/service.types";

interface UpdateServiceStatusParams {
  id: string;
  isActive: boolean;
}

export function useUpdateServiceStatus() {
  return useEntityMutation<Service, Error, UpdateServiceStatusParams>({
    mutationFn: ({ id, isActive }) => updateServiceStatus(id, isActive),
    invalidateKeys: [serviceKeys.all],
  });
}
