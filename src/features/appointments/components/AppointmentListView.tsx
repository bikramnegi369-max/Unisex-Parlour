"use client";

import React, { useMemo } from "react";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AppointmentStatusBadge,
  BookingTypeBadge,
} from "./AppointmentStatusBadge";
import { AppointmentReminderStatus } from "./AppointmentReminderStatus";
import { Button } from "@/components/ui/button";
import { Calendar, RefreshCw, Trash2, Eye, UserCheck } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/formatters";
import type { Appointment } from "../types/appointment.types";
import {
  getAppointmentColumns,
  getCustomerDisplayName,
  getAppointmentCodeDisplay,
  getServiceSummary,
} from "../columns/appointment.columns";

interface AppointmentListViewProps {
  appointments: Appointment[];
  isLoading: boolean;
  onSelectAppointment: (appointment: Appointment) => void;
  onReschedule: (appointment: Appointment) => void;
  onAssignStaff: (appointment: Appointment) => void;
  onChangeStatus: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
  isAllBranches: boolean;
  canEdit: boolean;
  canStatus: boolean;
  canDelete: boolean;
}

export function AppointmentListView({
  appointments,
  isLoading,
  onSelectAppointment,
  onReschedule,
  onAssignStaff,
  onChangeStatus,
  onDelete,
  isAllBranches,
  canEdit,
  canStatus,
  canDelete,
}: AppointmentListViewProps) {
  const columns = useMemo(
    () =>
      getAppointmentColumns({
        onSelectAppointment,
        onReschedule,
        onAssignStaff,
        onChangeStatus,
        onDelete,
        isAllBranches,
        canEdit,
        canStatus,
        canDelete,
      }),
    [
      onSelectAppointment,
      onReschedule,
      onAssignStaff,
      onChangeStatus,
      onDelete,
      isAllBranches,
      canEdit,
      canStatus,
      canDelete,
    ],
  );

  const renderMobileRow = (appt: Appointment) => {
    const isTerminal = ["completed", "cancelled", "no_show"].includes(
      appt.status,
    );
    const total =
      appt.pricing?.total ??
      appt.services?.reduce((acc, s) => acc + s.price, 0) ??
      0;

    let statusCardStyles =
      "bg-card border-border/80 border-l-4 border-l-primary/40";
    switch (appt.status) {
      case "in_progress":
        statusCardStyles =
          "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30 border-l-4 border-l-amber-500";
        break;
      case "completed":
        statusCardStyles =
          "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/30 border-l-4 border-l-emerald-500";
        break;
      case "scheduled":
        statusCardStyles =
          "bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/30 border-l-4 border-l-blue-500";
        break;
      case "cancelled":
        statusCardStyles =
          "bg-rose-500/5 dark:bg-rose-500/10 border-border/70 border-l-4 border-l-rose-500/70 opacity-75";
        break;
      case "no_show":
        statusCardStyles =
          "bg-slate-500/5 dark:bg-slate-500/10 border-border/70 border-l-4 border-l-slate-400 opacity-75";
        break;
    }

    return (
      <div
        key={appt.id}
        className={`p-3.5 border rounded-xl space-y-3 shadow-xs transition-colors ${statusCardStyles}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                {getAppointmentCodeDisplay(appt)}
              </span>
              <AppointmentStatusBadge status={appt.status} />
              <BookingTypeBadge bookingType={appt.bookingType} />
            </div>
            <div className="font-bold text-foreground text-sm mt-1">
              {getCustomerDisplayName(appt)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-foreground">
              {formatCurrency(total)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {formatDate(appt.date)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
          <div>
            <span className="text-[10px] text-muted-foreground block uppercase font-medium">
              Time & Staff
            </span>
            <span className="font-medium text-foreground">
              {appt.startTime} • {appt.staff?.name || "Unassigned"}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block uppercase font-medium">
              Services
            </span>
            <span className="font-medium text-foreground truncate block">
              {getServiceSummary(appt)}
            </span>
          </div>
        </div>

        {appt.reminder?.enabled && (
          <div className="pt-1">
            <AppointmentReminderStatus reminder={appt.reminder} compact />
          </div>
        )}

        <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => onSelectAppointment(appt)}
          >
            <Eye className="h-3 w-3" /> View
          </Button>

          {canEdit && !isTerminal && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => onReschedule(appt)}
              >
                <Calendar className="h-3 w-3 text-blue-600" /> Reschedule
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => onAssignStaff(appt)}
              >
                <UserCheck className="h-3 w-3 text-purple-600" /> Staff
              </Button>
            </>
          )}

          {canStatus && !isTerminal && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => onChangeStatus(appt)}
            >
              <RefreshCw className="h-3 w-3 text-amber-600" /> Status
            </Button>
          )}

          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(appt)}
            >
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <DataTable
      columns={columns}
      data={appointments}
      isLoading={isLoading}
      renderMobileRow={renderMobileRow}
      emptyState={
        <EmptyState
          icon={Calendar}
          title="No Appointments Found"
          description="There are no appointments matching your current search or filter criteria."
        />
      }
    />
  );
}
