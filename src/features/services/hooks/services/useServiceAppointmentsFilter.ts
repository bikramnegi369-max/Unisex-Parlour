"use client";

import { useMemo } from "react";
import type { Appointment } from "@/features/appointments/types/appointment.types";
import type { ServiceAppointmentStats } from "../../types/service.types";

interface UseServiceAppointmentsFilterParams {
  appointments: Appointment[];
  serviceId: string;
  searchQuery: string;
  statusFilter: string;
  page: number;
  pageSize: number;
  metaTotal?: number;
  metaTotalPages?: number;
  metaPage?: string | number;
  metaLimit?: string | number;
}

interface UseServiceAppointmentsFilterResult {
  stats: ServiceAppointmentStats;
  serviceAppointments: Appointment[];
  filteredAppointments: Appointment[];
  paginatedAppointments: Appointment[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Custom hook encapsulating service-specific appointment filtering, statistics calculation,
 * and dual client/server pagination logic.
 *
 * Adheres to SOLID & Clean Architecture:
 * - Single Responsibility: Pure domain business logic, divorced from React UI markup.
 * - Single Source of Truth: Integrates with backend metadata when available, with graceful client fallback.
 * - Testable & Reusable: Can be unit-tested in isolation without mounting complex DOM trees.
 */
export function useServiceAppointmentsFilter({
  appointments,
  serviceId,
  searchQuery,
  statusFilter,
  page,
  pageSize,
  metaTotal,
  metaTotalPages,
  metaPage,
}: UseServiceAppointmentsFilterParams): UseServiceAppointmentsFilterResult {
  const isServerPaginated = metaTotal !== undefined && metaTotalPages !== undefined;

  // 1. Filter appointments for this service (when backend is already filtered via serviceId param, appointments is already scoped)
  const serviceAppointments = useMemo(() => {
    if (!serviceId) return [];
    if (isServerPaginated) {
      // Backend query already included serviceId, return backend records directly
      return appointments;
    }
    return appointments.filter((appt) => {
      // Direct serviceIds array check
      if (Array.isArray(appt.serviceIds) && appt.serviceIds.includes(serviceId)) {
        return true;
      }
      // Snapshot services collection check
      if (
        Array.isArray(appt.services) &&
        appt.services.some(
          (s) =>
            s.serviceId === serviceId ||
            (s as { _id?: string })._id === serviceId ||
            (s as { id?: string }).id === serviceId
        )
      ) {
        return true;
      }
      return false;
    });
  }, [appointments, serviceId, isServerPaginated]);

  // 2. Compute aggregate KPI metrics across all appointments for this service
  const stats: ServiceAppointmentStats = useMemo(() => {
    const total = isServerPaginated && metaTotal !== undefined ? metaTotal : serviceAppointments.length;
    const completed = serviceAppointments.filter(
      (a) => a.status === "completed"
    ).length;
    const upcoming = serviceAppointments.filter(
      (a) => a.status === "scheduled" || a.status === "in_progress"
    ).length;

    const totalRevenue = serviceAppointments.reduce((sum, a) => {
      if (a.status === "completed") {
        const matchingService = a.services?.find(
          (s) =>
            s.serviceId === serviceId ||
            (s as { _id?: string })._id === serviceId ||
            (s as { id?: string }).id === serviceId
        );
        return sum + (matchingService ? matchingService.price : 0);
      }
      return sum;
    }, 0);

    return { total, completed, upcoming, totalRevenue };
  }, [serviceAppointments, serviceId, isServerPaginated, metaTotal]);

  // 3. Filter by search query and appointment status (only needed client-side if not server-filtered)
  const filteredAppointments = useMemo(() => {
    if (isServerPaginated) {
      // Backend query already handles search and status parameters passed in queryParams
      return appointments;
    }
    return serviceAppointments.filter((appt) => {
      // Status filter
      if (statusFilter !== "all" && appt.status !== statusFilter) {
        return false;
      }

      // Search query filter (customer name, phone, appointment code, staff)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const code = (appt.appointmentCode || appt.id).toLowerCase();
        const customerName = (appt.customer?.name || "").toLowerCase();
        const customerPhone = (appt.customer?.phone || "").toLowerCase();
        const staffName = (appt.staff?.name || "").toLowerCase();

        return (
          code.includes(query) ||
          customerName.includes(query) ||
          customerPhone.includes(query) ||
          staffName.includes(query)
        );
      }

      return true;
    });
  }, [serviceAppointments, appointments, statusFilter, searchQuery, isServerPaginated]);

  // 4. Calculate pagination metrics (strictly honors backend meta: total, page, limit, totalPages)
  const totalItems = isServerPaginated ? metaTotal : filteredAppointments.length;
  const totalPages = isServerPaginated ? metaTotalPages : Math.max(1, Math.ceil(totalItems / pageSize));
  
  // Normalize page from backend meta (handles string or number) with fallback to requested page
  const backendPageNumber = metaPage !== undefined ? Number(metaPage) : undefined;
  const safeCurrentPage = isServerPaginated && backendPageNumber && !Number.isNaN(backendPageNumber)
    ? backendPageNumber
    : Math.min(Math.max(1, page), Math.max(1, totalPages));

  // 5. Slice appointments for the current page only if not already paginated by backend
  const paginatedAppointments = useMemo(() => {
    if (isServerPaginated) {
      // Backend has already sliced the data for this page (e.g. limit 10 returns 10 items)
      return appointments;
    }
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredAppointments.slice(startIndex, startIndex + pageSize);
  }, [isServerPaginated, appointments, filteredAppointments, safeCurrentPage, pageSize]);

  return {
    stats,
    serviceAppointments,
    filteredAppointments,
    paginatedAppointments,
    totalItems,
    totalPages,
    currentPage: safeCurrentPage,
  };
}
