"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AppointmentStatusBadge,
  BookingTypeBadge,
} from "./AppointmentStatusBadge";
import { AppointmentReminderStatus } from "./AppointmentReminderStatus";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Calendar,
  UserCheck,
  RefreshCw,
  Trash2,
  MapPin,
  Scissors,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/formatters";
import type { Appointment } from "../types/appointment.types";

// ---------------------------------------------------------------------------
// Safe display helpers — the UI must NEVER crash on malformed/partial data.
// ---------------------------------------------------------------------------
function getCustomerDisplayName(appt: Appointment): string {
  if (appt.customer?.name) return appt.customer.name;
  if (appt.customerId && appt.customerId.length > 0) {
    return `Customer #${appt.customerId.slice(-6)}`;
  }
  return "Unknown customer";
}

function getServiceSummary(appt: Appointment): string {
  const names = (appt.services || [])
    .map((s) => s?.name)
    .filter((n): n is string => Boolean(n));
  return names.length > 0 ? names.join(", ") : "—";
}

function getAppointmentCodeDisplay(appt: Appointment): string {
  return appt.appointmentCode || `#${appt.id.slice(-6)}`;
}

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
  const columns: ColumnDef<Appointment>[] = [
    {
      accessorKey: "appointmentCode",
      header: "Appointment ID",
      cell: ({ row }) => {
        const appt = row.original;
        const codeDisplay = getAppointmentCodeDisplay(appt);
        return (
          <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 whitespace-nowrap">
            {codeDisplay}
          </span>
        );
      },
    },
    {
      accessorKey: "date",
      header: "Date & Time",
      cell: ({ row }) => {
        const appt = row.original;
        return (
          <div className="space-y-0.5 whitespace-nowrap">
            <div className="text-xs font-semibold text-foreground">
              {formatDate(appt.date)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {appt.startTime} {appt.endTime ? `- ${appt.endTime}` : ""}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => {
        const appt = row.original;
        return (
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-foreground">
              {getCustomerDisplayName(appt)}
            </div>
            {appt.customer?.phone && (
              <div className="text-[11px] text-muted-foreground">
                {appt.customer.phone}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "services",
      header: "Services",
      cell: ({ row }) => {
        const appt = row.original;
        const serviceNames = getServiceSummary(appt);
        return (
          <div
            className="text-xs text-foreground max-w-[200px] truncate"
            title={serviceNames}
          >
            {serviceNames}
          </div>
        );
      },
    },
    {
      accessorKey: "staff",
      header: "Staff",
      cell: ({ row }) => {
        const appt = row.original;
        return (
          <div className="text-xs font-medium text-foreground">
            {appt.staff?.name || (
              <span className="text-muted-foreground italic">Unassigned</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const appt = row.original;
        return (
          <div className="flex flex-col gap-1 items-start">
            <div className="flex items-center gap-1.5">
              <AppointmentStatusBadge status={appt.status} />
              <BookingTypeBadge bookingType={appt.bookingType} />
            </div>
            {appt.reminder?.enabled && (
              <AppointmentReminderStatus reminder={appt.reminder} compact />
            )}
          </div>
        );
      },
    },
    ...(isAllBranches
      ? [
          {
            accessorKey: "branch",
            header: "Branch",
            cell: ({ row }: { row: { original: Appointment } }) => {
              const appt = row.original;
              return (
                <div className="flex items-center gap-1 text-xs text-primary font-medium">
                  <MapPin className="h-3 w-3" />
                  {appt.branch?.name || appt.branchId}
                </div>
              );
            },
          },
        ]
      : []),
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => {
        const appt = row.original;
        const total =
          appt.pricing?.total ??
          appt.services?.reduce((acc, s) => acc + s.price, 0) ??
          0;
        return (
          <div className="text-xs font-bold text-foreground">
            {formatCurrency(total)}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const appt = row.original;
        const isTerminal = ["completed", "cancelled", "no_show"].includes(
          appt.status,
        );

        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onSelectAppointment(appt)}
              title="View Details"
              aria-label="View Details"
            >
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>

            {canEdit && !isTerminal && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onReschedule(appt)}
                  title="Reschedule"
                  aria-label="Reschedule Appointment"
                >
                  <Calendar className="h-3.5 w-3.5 text-blue-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onAssignStaff(appt)}
                  title="Assign Staff"
                  aria-label="Assign Staff"
                >
                  <UserCheck className="h-3.5 w-3.5 text-purple-600" />
                </Button>
              </>
            )}

            {canStatus && !isTerminal && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onChangeStatus(appt)}
                title="Change Status"
                aria-label="Change Status"
              >
                <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
              </Button>
            )}

            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => onDelete(appt)}
                title="Administrative Soft-Delete"
                aria-label="Administrative Soft-Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const renderMobileRow = (appt: Appointment) => {
    const isTerminal = ["completed", "cancelled", "no_show"].includes(appt.status);
    const total =
      appt.pricing?.total ??
      appt.services?.reduce((acc, s) => acc + s.price, 0) ??
      0;

    return (
      <div
        key={appt.id}
        className="p-3.5 bg-card border border-border/80 rounded-xl space-y-3 shadow-xs"
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
