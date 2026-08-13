"use client";

import React, { useState } from "react";
import { format } from "date-fns";
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
import { ErrorState } from "@/components/ui/error-state";
import { Calendar, List, Plus, UserPlus, AlertCircle } from "lucide-react";
import type { Appointment, AppointmentStatus, BookingType } from "@/features/appointments/types/appointment.types";

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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "all">("all");
  const [bookingTypeFilter, setBookingTypeFilter] = useState<BookingType | "all">("all");

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createBookingType, setCreateBookingType] = useState<"advance" | "walk_in">("advance");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isAssignStaffOpen, setIsAssignStaffOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Queries & Mutations
  const queryFilters = {
    status: statusFilter === "all" ? undefined : statusFilter,
    bookingType: bookingTypeFilter === "all" ? undefined : bookingTypeFilter,
    date: viewMode === "calendar" ? format(selectedDate, "yyyy-MM-dd") : undefined,
  };

  const { data: appointmentsData, isLoading, isError, error, refetch } = useAppointments(queryFilters);
  const appointments = appointmentsData?.data || [];

  const createMutation = useCreateAppointment();
  const rescheduleMutation = useRescheduleAppointment();
  const assignStaffMutation = useAssignAppointmentStaff();
  const updateStatusMutation = useUpdateAppointmentStatus();
  const deleteMutation = useDeleteAppointment();

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
            <span className="font-semibold">All Branches Selected:</span> You are viewing consolidated appointments across all authorized branches. Modifications require explicit branch selection.
          </div>
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | "all")}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>

          {/* Booking Type Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground font-semibold">Type:</span>
            <select
              value={bookingTypeFilter}
              onChange={(e) => setBookingTypeFilter(e.target.value as BookingType | "all")}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="advance">Advance</option>
              <option value="walk_in">Walk-In</option>
            </select>
          </div>
        </div>

        {/* View Switcher (Calendar vs List) */}
        <div className="bg-muted p-0.5 rounded-md flex items-center border border-border">
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

      {/* Main View Area */}
      {isError ? (
        <ErrorState
          title="Failed to load appointments"
          description={(error as Error)?.message || "An unexpected error occurred while fetching appointments."}
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
          onSelectDate={setSelectedDate}
          onSelectAppointment={handleOpenDetails}
          isAllBranches={isAllBranchesSelected}
        />
      ) : (
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
