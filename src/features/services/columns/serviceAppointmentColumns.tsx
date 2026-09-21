import React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import type { Appointment } from "@/features/appointments/types/appointment.types";
import {
  AppointmentStatusBadge,
  BookingTypeBadge,
} from "@/features/appointments/components/AppointmentStatusBadge";
import { formatDate, formatCurrency } from "@/lib/formatters";

/**
 * Factory function to build strongly-typed TanStack Table column definitions
 * for service appointment history.
 *
 * Adheres to SOLID principles:
 * - Single Responsibility: Solely defines data table column presentations.
 * - Open/Closed: Easily extended with optional formatters or columns without modifying consumer components.
 */
export function buildServiceAppointmentColumns(
  serviceId: string
): ColumnDef<Appointment>[] {
  return [
    {
      accessorKey: "appointmentCode",
      header: "Appointment",
      cell: ({ row }) => {
        const appt = row.original;
        const codeDisplay = appt.appointmentCode || `#${appt.id.slice(-6)}`;
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
        const name =
          appt.customer?.name ||
          (appt.customerId ? `Customer #${appt.customerId.slice(-6)}` : "Guest");
        return (
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-foreground">{name}</div>
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
      accessorKey: "staff",
      header: "Assigned Staff",
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
            <div className="flex items-center gap-1.5 flex-wrap">
              <AppointmentStatusBadge
                status={appt.status}
                isUnassignedQueue={!appt.staffId}
              />
              <BookingTypeBadge bookingType={appt.bookingType} />
            </div>
          </div>
        );
      },
    },
    {
      id: "servicePrice",
      header: "Service Price",
      cell: ({ row }) => {
        const appt = row.original;
        const matchingService = appt.services?.find(
          (s) =>
            s.serviceId === serviceId ||
            (s as { _id?: string })._id === serviceId ||
            (s as { id?: string }).id === serviceId
        );
        const price = matchingService ? matchingService.price : 0;
        return (
          <div className="text-xs font-bold text-foreground">
            {price > 0 ? formatCurrency(price) : "—"}
          </div>
        );
      },
    },
  ];
}
