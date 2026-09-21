"use client";

import React, { useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
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
import type { Employee } from "@/features/employees/types/employee.types";
import { useDebounce } from "@/hooks/useDebounce";
import { AppointmentCalendarView } from "@/features/appointments/components/AppointmentCalendarView";
import { AppointmentListView } from "@/features/appointments/components/AppointmentListView";
import { CreateAppointmentDialog } from "@/features/appointments/components/CreateAppointmentDialog";
import { AppointmentDetailsDialog } from "@/features/appointments/components/AppointmentDetailsDialog";
import { RescheduleAppointmentDialog } from "@/features/appointments/components/RescheduleAppointmentDialog";
import { AssignStaffDialog } from "@/features/appointments/components/AssignStaffDialog";
import { AppointmentStatusDialog } from "@/features/appointments/components/AppointmentStatusDialog";
import { DeleteAppointmentDialog } from "@/features/appointments/components/DeleteAppointmentDialog";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { SyncButton } from "@/components/ui/sync-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/error-state";
import { toast } from "sonner";
import {
  Calendar,
  List,
  Plus,
  UserPlus,
  AlertCircle,
  RotateCcw,
  Search,
  CalendarDays,
  X,
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
  const debouncedSearch = useDebounce(searchQuery.trim(), 400);
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

  const { currentBranchId } = useBranchContext();

  // Fetch employees for filter dropdown - strictly scoped to active branch unless All Branches is selected
  const employeeParams = useMemo(() => {
    return {
      limit: 100,
      branchId:
        !isAllBranchesSelected && currentBranchId && currentBranchId !== "all"
          ? currentBranchId
          : undefined,
    };
  }, [isAllBranchesSelected, currentBranchId]);

  const { data: employeesData } = useEmployees(employeeParams);
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
      search: debouncedSearch || undefined,
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
    debouncedSearch,
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
    isRefetching,
    isError,
    error,
    refetch,
  } = useAppointments(queryFilters);
  const rawAppointments = appointmentsData?.data || [];
  const meta = appointmentsData?.meta;

  // Comprehensive client-side filter pipeline:
  // Guarantees reactive filtering across status, booking type, staff, and search query
  // regardless of date-scoping or backend query nuances.
  const filteredAppointments = useMemo(() => {
    return rawAppointments.filter((appt) => {
      // 1. Status Filter
      if (statusFilter !== "all" && appt.status !== statusFilter) {
        return false;
      }

      // 2. Booking Type Filter
      if (
        bookingTypeFilter !== "all" &&
        appt.bookingType !== bookingTypeFilter
      ) {
        return false;
      }

      // 3. Staff Filter
      if (staffFilter !== "all") {
        if (staffFilter === "unassigned") {
          if (appt.staffId) return false;
        } else if (appt.staffId !== staffFilter) {
          return false;
        }
      }

      // 4. Search Query Filter (Customer Name, Phone, Code, Services)
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const customerName = (appt.customer?.name || "").toLowerCase();
        const customerPhone = (appt.customer?.phone || "").toLowerCase();
        const code = (appt.appointmentCode || "").toLowerCase();
        const id = appt.id.toLowerCase();
        const services = (appt.services || [])
          .map((s) => s?.name?.toLowerCase() || "")
          .join(" ");

        const matches =
          customerName.includes(q) ||
          customerPhone.includes(q) ||
          code.includes(q) ||
          id.includes(q) ||
          services.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [
    rawAppointments,
    statusFilter,
    bookingTypeFilter,
    staffFilter,
    debouncedSearch,
  ]);

  const appointments = filteredAppointments;

  const handleSync = async () => {
    try {
      await refetch();
      toast.success("Appointments synchronized successfully.");
    } catch {
      toast.error("Failed to synchronize appointments.");
    }
  };

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
          <div className="flex items-center gap-2 flex-wrap">
            <SyncButton
              isSyncing={isRefetching}
              onSync={handleSync}
              label="Refresh Schedule"
              className="w-full sm:w-auto"
            />
            {canCreate && (
              <>
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
              </>
            )}
          </div>
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
          {/* Search Input with Clear Button */}
          <div className="relative flex-1 max-w-sm">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search customer, phone, notes..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="h-8 text-xs pl-8 pr-7"
              aria-label="Search appointments"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground focus:outline-none"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
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
                {employees.map((employee: Employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Date Range Controls in List Mode */}
          {viewMode === "list" && (
            <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/80">
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold px-1">
                <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="hidden sm:inline">Range:</span>
              </div>

              {/* From Date Input */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground font-medium text-[11px]">
                  From:
                </span>
                <Input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-7 text-xs w-36.25 px-2 bg-background [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:ml-auto [&::-webkit-calendar-picker-indicator]:p-0 [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                />
              </div>

              {/* To Date Input */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground font-medium text-[11px]">
                  To:
                </span>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-7 text-xs w-36.25 px-2 bg-background [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:ml-auto [&::-webkit-calendar-picker-indicator]:p-0 [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                />
              </div>

              {/* Quick Preset: Today */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const todayStr = format(new Date(), "yyyy-MM-dd");
                  setStartDate(todayStr);
                  setEndDate(todayStr);
                  setPage(1);
                }}
                className="h-7 text-[11px] px-2 bg-background hover:bg-muted"
                title="Filter for Today"
              >
                Today
              </Button>

              {/* Quick Preset: This Week */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const weekStartStr = format(
                    startOfWeek(now, { weekStartsOn: 1 }),
                    "yyyy-MM-dd",
                  );
                  const weekEndStr = format(
                    endOfWeek(now, { weekStartsOn: 1 }),
                    "yyyy-MM-dd",
                  );
                  setStartDate(weekStartStr);
                  setEndDate(weekEndStr);
                  setPage(1);
                }}
                className="h-7 text-[11px] px-2 bg-background hover:bg-muted"
                title="Filter for Current Week"
              >
                This Week
              </Button>

              {/* Clear Dates Button */}
              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setPage(1);
                  }}
                  className="h-7 text-[11px] px-1.5 text-muted-foreground hover:text-foreground gap-1"
                  title="Clear Date Range"
                >
                  <X className="h-3 w-3" />
                  Clear
                </Button>
              )}
            </div>
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
          canEdit={canEdit}
          staffFilter={staffFilter}
          onStaffFilterChange={setStaffFilter}
          onDropAppointment={async (apptId, newDate, newStartTime, newStaffId) => {
            const targetAppt = rawAppointments.find((a) => a.id === apptId);
            if (!targetAppt) return;

            const timeChanged = targetAppt.startTime !== newStartTime || targetAppt.date !== newDate;
            const staffChanged = (targetAppt.staffId || null) !== (newStaffId || null);

            try {
              if (timeChanged) {
                await rescheduleMutation.mutateAsync({
                  id: apptId,
                  payload: {
                    branchId: targetAppt.branchId,
                    date: newDate,
                    startTime: newStartTime,
                    reason: "Rescheduled via calendar drag & drop",
                  },
                });
              }
              if (staffChanged) {
                if (newStaffId) {
                  await assignStaffMutation.mutateAsync({
                    id: apptId,
                    payload: {
                      branchId: targetAppt.branchId,
                      staffId: newStaffId,
                    },
                  });
                }
              }
              if (!timeChanged && !staffChanged) {
                toast.info("Appointment was dropped at its current time and staff.");
              }
            } catch (err: unknown) {
              const msg = (err as Error)?.message || "Failed to update appointment position";
              toast.error(msg);
            }
          }}
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
