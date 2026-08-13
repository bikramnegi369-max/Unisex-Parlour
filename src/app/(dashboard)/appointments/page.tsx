"use client";

import React, { useState, useMemo } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBranchContext } from "@/hooks/useBranchContext";
import { hasPermission } from "@/lib/permissions";
import {
  useAppointments,
  useCreateAppointment,
  useRescheduleAppointment,
  useAssignAppointmentStaff,
  useUpdateAppointmentStatus,
  useDeleteAppointment,
} from "@/features/appointments/hooks/useAppointments";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { AppointmentCalendarView } from "@/features/appointments/components/AppointmentCalendarView";
import { AppointmentListView } from "@/features/appointments/components/AppointmentListView";
import { CreateAppointmentDialog } from "@/features/appointments/components/CreateAppointmentDialog";
import { AppointmentDetailsDialog } from "@/features/appointments/components/AppointmentDetailsDialog";
import { RescheduleAppointmentDialog } from "@/features/appointments/components/RescheduleAppointmentDialog";
import { AssignStaffDialog } from "@/features/appointments/components/AssignStaffDialog";
import { AppointmentStatusDialog } from "@/features/appointments/components/AppointmentStatusDialog";
import { DeleteAppointmentDialog } from "@/features/appointments/components/DeleteAppointmentDialog";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/error-state";
import {
  Calendar,
  List,
  Plus,
  UserPlus,
  AlertCircle,
  RotateCcw,
  Search,
} from "lucide-react";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import type {
  Appointment,
  AppointmentStatus,
  BookingType,
} from "@/features/appointments/types/appointment.types";

export default function AppointmentsPage() {
  const { user } = useAuth();
  const { isAllBranchesSelected } = useBranchContext();

  // Permission Checks
  const canView = hasPermission(user, "appointments.view");
  const canCreate = hasPermission(user, "appointments.create");
  const canEdit = hasPermission(user, "appointments.edit");
  const canStatus = hasPermission(user, "appointments.update_status");
  const canDelete = hasPermission(user, "appointments.delete");

  // Page State Orchestration
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [calendarViewMode, setCalendarViewMode] = useState<"day" | "week">(
    "day",
  );
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "all">(
    "all",
  );
  const [bookingTypeFilter, setBookingTypeFilter] = useState<
    BookingType | "all"
  >("all");
  const [staffFilter, setStaffFilter] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createBookingType, setCreateBookingType] = useState<
    "advance" | "walk_in"
  >("advance");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isAssignStaffOpen, setIsAssignStaffOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Fetch employees for filter dropdown
  const { data: employeesData } = useEmployees({ limit: 100 });
  const employees = employeesData?.data || [];

  // Week range for calendar Week View (Monday-based)
  const weekStart = useMemo(
    () => startOfWeek(selectedDate, { weekStartsOn: 1 }),
    [selectedDate],
  );
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  // Synchronized Query Filters
  // - Calendar Day View: fetch only the selected date
  // - Calendar Week View: fetch the complete Monday–Sunday range
  // - List View: use explicit date range inputs and page/limit pagination
  const queryFilters = useMemo(() => {
    const isCalendarWeek =
      viewMode === "calendar" && calendarViewMode === "week";

    return {
      search: searchQuery.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      bookingType: bookingTypeFilter === "all" ? undefined : bookingTypeFilter,
      staffId: staffFilter === "all" ? undefined : staffFilter,
      date:
        viewMode === "calendar" && calendarViewMode === "day"
          ? format(selectedDate, "yyyy-MM-dd")
          : undefined,
      startDate: isCalendarWeek
        ? format(weekStart, "yyyy-MM-dd")
        : startDate || undefined,
      endDate: isCalendarWeek
        ? format(weekEnd, "yyyy-MM-dd")
        : endDate || undefined,
      page: viewMode === "list" ? page : undefined,
      limit: viewMode === "list" ? limit : undefined,
    };
  }, [
    viewMode,
    calendarViewMode,
    selectedDate,
    weekStart,
    weekEnd,
    searchQuery,
    statusFilter,
    bookingTypeFilter,
    staffFilter,
    startDate,
    endDate,
    page,
    limit,
  ]);

  const {
    data: appointmentsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useAppointments(queryFilters);
  const appointments = appointmentsData?.data || [];
  const meta = appointmentsData?.meta;

  const createMutation = useCreateAppointment();
  const rescheduleMutation = useRescheduleAppointment();
  const assignStaffMutation = useAssignAppointmentStaff();
  const updateStatusMutation = useUpdateAppointmentStatus();
  const deleteMutation = useDeleteAppointment();

  const handleResetFilters = () => {
    setStatusFilter("all");
    setBookingTypeFilter("all");
    setStaffFilter("all");
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setSelectedDate(new Date());
    setPage(1);
  };

  if (!canView) {
    return (
      <ErrorState
        title="Access Denied"
        description="You do not have permission to view appointments."
      />
    );
  }

  const handleOpenCreate = (type: "advance" | "walk_in") => {
    setCreateBookingType(type);
    setIsCreateOpen(true);
  };

  const handleOpenDetails = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setIsDetailsOpen(true);
  };

  const handleOpenReschedule = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setIsRescheduleOpen(true);
  };

  const handleOpenAssignStaff = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setIsAssignStaffOpen(true);
  };

  const handleOpenStatus = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setIsStatusOpen(true);
  };

  const handleOpenDelete = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setIsDeleteOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <PageHeaderBanner
        title="Appointments Scheduling"
        description="Manage salon appointments, staff allocations, scheduling, and walk-in bookings."
        actions={
          canCreate && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenCreate("walk_in")}
                className="gap-1.5 text-xs bg-background/80"
              >
                <UserPlus className="h-4 w-4 text-purple-600" />
                Walk-In Booking
              </Button>
              <Button
                size="sm"
                onClick={() => handleOpenCreate("advance")}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-4 w-4" />
                Book Appointment
              </Button>
            </div>
          )
        }
      />

      {/* All Branches Read-Only / Mutation Warning Banner */}
      {isAllBranchesSelected && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <div>
            <span className="font-semibold">All Branches Selected:</span> You
            are viewing consolidated appointments across all authorized
            branches. Modifications require explicit branch selection.
          </div>
        </div>
      )}

      {/* Multi-Field Filter Controls Bar */}
      <div className="space-y-3 bg-card p-3 rounded-lg border border-border">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search customer, phone, notes..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="h-8 text-xs pl-8"
            />
          </div>

          {/* View Switcher (Calendar vs List) */}
          <div className="bg-muted p-0.5 rounded-md flex items-center border border-border shrink-0 self-end md:self-auto">
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className="text-xs h-7 gap-1 px-3"
            >
              <Calendar className="h-3.5 w-3.5" />
              Calendar
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="text-xs h-7 gap-1 px-3"
            >
              <List className="h-3.5 w-3.5" />
              List
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-semibold">Status:</span>
            <div className="w-32">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as AppointmentStatus | "all");
                  setPage(1);
                }}
                className="h-8 text-xs py-0"
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

          {/* Booking Type Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-semibold">Type:</span>
            <div className="w-30">
              <Select
                value={bookingTypeFilter}
                onChange={(e) => {
                  setBookingTypeFilter(e.target.value as BookingType | "all");
                  setPage(1);
                }}
                className="h-8 text-xs py-0"
              >
                <option value="all">All Types</option>
                <option value="advance">Advance</option>
                <option value="walk_in">Walk-In</option>
              </Select>
            </div>
          </div>

          {/* Staff Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-semibold">Staff:</span>
            <div className="w-36">
              <Select
                value={staffFilter}
                onChange={(e) => {
                  setStaffFilter(e.target.value);
                  setPage(1);
                }}
                className="h-8 text-xs py-0"
              >
                <option value="all">All Staff</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Date Range Inputs in List Mode */}
          {viewMode === "list" && (
            <>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground font-semibold">
                  From:
                </span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 text-xs w-32"
                />
              </div>

              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground font-semibold">To:</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 text-xs w-32"
                />
              </div>
            </>
          )}

          {/* Reset Filters Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="text-xs h-8 gap-1 ml-auto text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>

      {/* Main View Area */}
      {isError ? (
        <ErrorState
          title="Failed to load appointments"
          description={
            (error as Error)?.message ||
            "An unexpected error occurred while fetching appointments."
          }
          retryAction={{
            label: "Retry",
            onClick: () => refetch(),
          }}
        />
      ) : viewMode === "calendar" ? (
        <AppointmentCalendarView
          appointments={appointments}
          isLoading={isLoading}
          selectedDate={selectedDate}
          viewMode={calendarViewMode}
          onViewModeChange={setCalendarViewMode}
          onSelectDate={setSelectedDate}
          onSelectAppointment={handleOpenDetails}
          isAllBranches={isAllBranchesSelected}
        />
      ) : (
        <div className="space-y-4">
          <AppointmentListView
            appointments={appointments}
            isLoading={isLoading}
            onSelectAppointment={handleOpenDetails}
            onReschedule={handleOpenReschedule}
            onAssignStaff={handleOpenAssignStaff}
            onChangeStatus={handleOpenStatus}
            onDelete={handleOpenDelete}
            isAllBranches={isAllBranchesSelected}
            canEdit={canEdit}
            canStatus={canStatus}
            canDelete={canDelete}
          />

          {meta && meta.totalPages > 1 && (
            <Pagination
              currentPage={Number(meta.page) || page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              onPageChange={(p) => setPage(p)}
              pageSize={Number(meta.limit) || limit}
              onPageSizeChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
              itemLabel="appointments"
            />
          )}
        </div>
      )}

      {/* Dialog Modals */}
      <CreateAppointmentDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={async (payload) => {
          await createMutation.mutateAsync(payload);
        }}
        isLoading={createMutation.isPending}
        defaultBookingType={createBookingType}
      />

      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onReschedule={() => {
          setIsDetailsOpen(false);
          setIsRescheduleOpen(true);
        }}
        onAssignStaff={() => {
          setIsDetailsOpen(false);
          setIsAssignStaffOpen(true);
        }}
        onChangeStatus={() => {
          setIsDetailsOpen(false);
          setIsStatusOpen(true);
        }}
        onDelete={() => {
          setIsDetailsOpen(false);
          setIsDeleteOpen(true);
        }}
        canEdit={canEdit}
        canStatus={canStatus}
        canDelete={canDelete}
      />

      <RescheduleAppointmentDialog
        appointment={selectedAppointment}
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        onSubmit={async (id, payload) => {
          await rescheduleMutation.mutateAsync({ id, payload });
        }}
        isLoading={rescheduleMutation.isPending}
      />

      <AssignStaffDialog
        appointment={selectedAppointment}
        isOpen={isAssignStaffOpen}
        onClose={() => setIsAssignStaffOpen(false)}
        onSubmit={async (id, payload) => {
          await assignStaffMutation.mutateAsync({ id, payload });
        }}
        isLoading={assignStaffMutation.isPending}
      />

      <AppointmentStatusDialog
        appointment={selectedAppointment}
        isOpen={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        onSubmit={async (id, payload) => {
          await updateStatusMutation.mutateAsync({ id, payload });
        }}
        isLoading={updateStatusMutation.isPending}
      />

      <DeleteAppointmentDialog
        appointment={selectedAppointment}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={async (id, branchId) => {
          await deleteMutation.mutateAsync({ id, branchId });
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
