import React from "react";
import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus, BookingType } from "../types/appointment.types";

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
  isUnassignedQueue?: boolean;
  className?: string;
}

export function AppointmentStatusBadge({
  status,
  isUnassignedQueue,
  className,
}: AppointmentStatusBadgeProps) {
  // If the appointment is unassigned and not in a terminal state (cancelled/completed/no_show),
  // it is physically in the lounge waiting queue rather than actively being served.
  if (
    isUnassignedQueue &&
    status !== "completed" &&
    status !== "cancelled" &&
    status !== "no_show"
  ) {
    return (
      <Badge
        variant="outline"
        className={`border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-medium ${className || ""}`}
      >
        Waiting in Queue
      </Badge>
    );
  }

  switch (status) {
    case "scheduled":
      return (
        <Badge variant="outline" className={`border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400 ${className || ""}`}>
          Scheduled
        </Badge>
      );
    case "in_progress":
      return (
        <Badge variant="outline" className={`border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 animate-pulse ${className || ""}`}>
          In Progress
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="outline" className={`border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ${className || ""}`}>
          Completed
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className={`border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 ${className || ""}`}>
          Cancelled
        </Badge>
      );
    case "no_show":
      return (
        <Badge variant="outline" className={`border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-400 ${className || ""}`}>
          No Show
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

interface BookingTypeBadgeProps {
  bookingType: BookingType;
  className?: string;
}

export function BookingTypeBadge({ bookingType, className }: BookingTypeBadgeProps) {
  if (bookingType === "walk_in") {
    return (
      <Badge variant="outline" className={`border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400 ${className || ""}`}>
        Walk-In
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={`border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400 ${className || ""}`}>
      Advance
    </Badge>
  );
}
