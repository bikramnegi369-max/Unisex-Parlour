import { useQuery } from "@tanstack/react-query";
import {
  getAppointments,
  getAppointment,
} from "../api/appointments.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { PaginatedResponse } from "@/types/api.types";
import type { Appointment, AppointmentListQuery } from "../types/appointment.types";

import type { UseQueryOptions } from "@tanstack/react-query";

export function useAppointments(
  params: AppointmentListQuery = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<Appointment>>, "queryKey" | "queryFn">,
) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "appointments.view");

  const isEnabled =
    isAuthenticated &&
    hasViewPermission &&
    (currentBranchId !== null || isOrgWide) &&
    (options?.enabled !== false);

  const queryKey = getBranchQueryKey("appointments", [params]);

  return useQuery({
    queryKey,
    queryFn: () => getAppointments(params),
    ...options,
    enabled: isEnabled,
  });
}

export function useAppointment(id: string | undefined) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "appointments.view");

  const isEnabled = isAuthenticated && hasViewPermission && !!id && (currentBranchId !== null || isOrgWide);

  const queryKey = getBranchQueryKey("appointment", [id || ""]);

  return useQuery({
    queryKey,
    queryFn: () => getAppointment(id!),
    enabled: isEnabled,
  });
}
