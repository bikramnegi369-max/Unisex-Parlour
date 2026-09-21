"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useAppointments } from "@/features/appointments/hooks/useAppointments";
import type { AppointmentStatus } from "@/features/appointments/types/appointment.types";
import { useDebounce } from "@/hooks/useDebounce";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { buildServiceAppointmentColumns } from "../../columns/serviceAppointmentColumns";
import { ServiceAppointmentStatsCards } from "./ServiceAppointmentStatsCards";
import { ServiceAppointmentMobileCard } from "./ServiceAppointmentMobileCard";
import { useServiceAppointmentsFilter } from "../../hooks/services/useServiceAppointmentsFilter";
import { Calendar, Search, X } from "lucide-react";

interface ServiceAppointmentsTabProps {
  serviceId: string;
  serviceName?: string;
  initialPageSize?: number;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

/**
 * ServiceAppointmentsTab Component
 *
 * Displays read-only appointment booking statistics and audit history for a specific salon service.
 *
 * Architecture & Design Patterns:
 * - Single Responsibility: Orchestrates queries and composable presentation components.
 * - Separation of Concerns: Domain calculations and pagination live in `useServiceAppointmentsFilter`.
 * - Column Definition Factory: Reusable table definition via `buildServiceAppointmentColumns`.
 * - Atomic Subcomponents: Reusable `ServiceAppointmentStatsCards` and `ServiceAppointmentMobileCard`.
 * - DRY & Controlled Pagination: Utilizes the system `Pagination` component with configurable page sizes.
 * - Responsive: Fully adaptive for 1024px tablet/sidebar layouts down to mobile screens.
 */
export function ServiceAppointmentsTab({
  serviceId,
  serviceName,
  initialPageSize = 10,
}: ServiceAppointmentsTabProps) {
  // Search & Filter state
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 250);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Server-side appointments query passing page, limit, search, status, and serviceId
  const queryParams = useMemo(() => {
    return {
      serviceId,
      page: currentPage,
      limit: pageSize,
      search: debouncedSearch || undefined,
      status:
        statusFilter === "all"
          ? undefined
          : (statusFilter as AppointmentStatus),
    };
  }, [serviceId, currentPage, pageSize, debouncedSearch, statusFilter]);

  const { data: appointmentsResponse, isLoading } =
    useAppointments(queryParams);

  const rawAppointments = appointmentsResponse?.data || [];
  const meta = appointmentsResponse?.meta;

  // Decoupled business logic hook
  const {
    stats,
    serviceAppointments,
    paginatedAppointments,
    totalItems,
    totalPages,
    currentPage: validatedCurrentPage,
  } = useServiceAppointmentsFilter({
    appointments: rawAppointments,
    serviceId,
    searchQuery: debouncedSearch,
    statusFilter,
    page: currentPage,
    pageSize,
    metaTotal: meta?.total,
    metaTotalPages: meta?.totalPages,
    metaPage: meta?.page,
    metaLimit: meta?.limit,
  });

  // Effective pagination values strictly synchronized with backend meta contract
  const effectivePage = meta?.page !== undefined ? Number(meta.page) || currentPage : validatedCurrentPage;
  const effectiveTotalPages = meta?.totalPages ?? totalPages;
  const effectiveTotalItems = meta?.total ?? totalItems;
  const effectivePageSize = meta?.limit !== undefined ? Number(meta.limit) || pageSize : pageSize;

  // Handlers for filter and pagination controls
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  }, []);

  const handleStatusChange = useCallback((newStatus: string) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchInput(e.target.value);
      setCurrentPage(1);
    },
    [],
  );

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    setCurrentPage(1);
  }, []);

  // Memoized column definitions
  const columns = useMemo(
    () => buildServiceAppointmentColumns(serviceId),
    [serviceId],
  );

  // Memoized mobile card renderer
  const renderMobileRow = useCallback(
    (appt: (typeof paginatedAppointments)[number]) => (
      <ServiceAppointmentMobileCard
        key={appt.id}
        appointment={appt}
        serviceId={serviceId}
      />
    ),
    [serviceId],
  );

  return (
    <div className="space-y-6 text-left w-full min-w-0">
      {/* KPI Metric Overview */}
      <ServiceAppointmentStatsCards stats={stats} />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border/80 p-3 rounded-2xl shadow-2xs w-full min-w-0">
        <div className="relative w-full sm:w-72 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by customer, staff, or ID..."
            value={searchInput}
            onChange={handleSearchChange}
            className="pl-9 pr-8 h-9 text-xs w-full"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Status:
          </span>
          <Select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="h-9 text-xs w-full sm:w-40"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </Select>
        </div>
      </div>

      {/* Appointments Data Table */}
      <div className="w-full min-w-0 overflow-hidden space-y-4">
        <DataTable
          columns={columns}
          data={paginatedAppointments}
          isLoading={isLoading}
          renderMobileRow={renderMobileRow}
          emptyState={
            <EmptyState
              icon={Calendar}
              title={
                serviceAppointments.length === 0
                  ? "No Bookings Found"
                  : "No Matching Appointments"
              }
              description={
                serviceAppointments.length === 0
                  ? `No appointments have been booked for ${serviceName || "this treatment"} yet.`
                  : "Try adjusting your search criteria or status filter."
              }
            />
          }
        />

        {/* Existing Design System Pagination with Page Size Control */}
        {!isLoading && effectiveTotalItems > 0 && (
          <div className="pt-2">
            <Pagination
              currentPage={effectivePage}
              totalPages={effectiveTotalPages}
              totalItems={effectiveTotalItems}
              onPageChange={handlePageChange}
              pageSize={effectivePageSize}
              pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
              onPageSizeChange={handlePageSizeChange}
              itemLabel="appointments"
            />
          </div>
        )}
      </div>
    </div>
  );
}
