"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/DataTable";
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
      accessorKey: "date",
      header: "Date & Time",
      cell: ({ row }) => {
        const appt = row.original;
        return (
          <div className="space-y-0.5">
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
                >
                  <Calendar className="h-3.5 w-3.5 text-blue-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onAssignStaff(appt)}
                  title="Assign Staff"
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
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable columns={columns} data={appointments} isLoading={isLoading} />
  );
}
