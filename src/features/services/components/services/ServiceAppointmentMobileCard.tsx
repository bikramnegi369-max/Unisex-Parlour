import React from "react";
import type { Appointment } from "@/features/appointments/types/appointment.types";
import {
  AppointmentStatusBadge,
  BookingTypeBadge,
} from "@/features/appointments/components/AppointmentStatusBadge";
import { formatDate, formatCurrency } from "@/lib/formatters";

interface ServiceAppointmentMobileCardProps {
  appointment: Appointment;
  serviceId: string;
}

/**
 * Pure presentation component rendering responsive card view for mobile/compact viewports.
 *
 * Adheres to SRP: Encapsulates responsive mobile card design and prevents table overflow on small screens.
 */
export const ServiceAppointmentMobileCard = React.memo(
  function ServiceAppointmentMobileCard({
    appointment: appt,
    serviceId,
  }: ServiceAppointmentMobileCardProps) {
    const matchingService = appt.services?.find(
      (s) =>
        s.serviceId === serviceId ||
        (s as { _id?: string })._id === serviceId ||
        (s as { id?: string }).id === serviceId
    );
    const price = matchingService ? matchingService.price : 0;
    const customerName =
      appt.customer?.name ||
      (appt.customerId ? `Customer #${appt.customerId.slice(-6)}` : "Guest");

    return (
      <div
        key={appt.id}
        className="p-3.5 bg-card border border-border/80 rounded-xl space-y-3 shadow-2xs min-w-0"
      >
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                {appt.appointmentCode || `#${appt.id.slice(-6)}`}
              </span>
              <AppointmentStatusBadge status={appt.status} />
              <BookingTypeBadge bookingType={appt.bookingType} />
            </div>
            <div className="font-bold text-foreground text-sm mt-1 truncate">
              {customerName}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs font-bold text-foreground">
              {formatCurrency(price)}
            </div>
            <div className="text-[11px] text-muted-foreground whitespace-nowrap">
              {formatDate(appt.date)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50 min-w-0">
          <div className="min-w-0">
            <span className="text-[10px] text-muted-foreground block uppercase font-medium">
              Time
            </span>
            <span className="font-medium text-foreground truncate block">
              {appt.startTime} {appt.endTime ? `- ${appt.endTime}` : ""}
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-muted-foreground block uppercase font-medium">
              Staff
            </span>
            <span className="font-medium text-foreground truncate block">
              {appt.staff?.name || "Unassigned"}
            </span>
          </div>
        </div>
      </div>
    );
  }
);
