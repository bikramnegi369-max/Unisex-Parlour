"use client";

import { useQuery } from "@tanstack/react-query";
import {
  staffAvailabilityApi,
  type GetStaffAvailabilityParams,
  type GetCalendarAvailabilityParams,
  type SlotAvailabilityBatchResponse,
  type CalendarAvailabilityResponse,
} from "../api/staffAvailability.api";

export const staffAvailabilityKeys = {
  all: ["staff-availability"] as const,
  slot: (params: Partial<GetStaffAvailabilityParams>) =>
    ["staff-availability", "slot", params] as const,
  calendarAll: ["calendar-staff-availability"] as const,
  calendar: (params: Partial<GetCalendarAvailabilityParams>) =>
    ["calendar-staff-availability", params] as const,
};

interface UseStaffAvailabilityOptions {
  enabled?: boolean;
}

/**
 * Hook to retrieve authoritative staff availability for a specific booking slot
 */
export function useStaffAvailability(
  params: GetStaffAvailabilityParams,
  options: UseStaffAvailabilityOptions = {},
) {
  const isEnabled =
    options.enabled !== undefined
      ? options.enabled
      : Boolean(params.date && params.startTime);

  return useQuery<SlotAvailabilityBatchResponse, Error>({
    queryKey: staffAvailabilityKeys.slot(params),
    queryFn: () => staffAvailabilityApi.getStaffAvailability(params),
    enabled: isEnabled,
    staleTime: 30 * 1000, // 30s cache before refetching live slot availability
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to retrieve staff calendar availability lanes (supporting both single-branch and All Branches)
 */
export function useCalendarStaffAvailability(
  params: GetCalendarAvailabilityParams,
  options: UseStaffAvailabilityOptions = {},
) {
  const isEnabled = options.enabled !== undefined ? options.enabled : true;

  return useQuery<CalendarAvailabilityResponse, Error>({
    queryKey: staffAvailabilityKeys.calendar(params),
    queryFn: () => staffAvailabilityApi.getCalendarAvailability(params),
    enabled: isEnabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000,
  });
}
