import { useEntityMutation } from "@/lib/api/mutations";
import { deleteService } from "../../api/services.api";
import { serviceKeys } from "../../api/serviceKeys";

export function useDeleteService() {
  return useEntityMutation<void, Error, string>({
    mutationFn: deleteService,
    invalidateKeys: [serviceKeys.all],
  });
}
