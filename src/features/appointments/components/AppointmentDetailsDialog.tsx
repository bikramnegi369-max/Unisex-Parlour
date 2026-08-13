"use client";

import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AppointmentStatusBadge, BookingTypeBadge } from "./AppointmentStatusBadge";
import { formatDate, formatCurrency } from "@/lib/formatters";
import { Calendar, Clock, User, Scissors, MapPin } from "lucide-react";
import type { Appointment } from "../types/appointment.types";

interface AppointmentDetailsDialogProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onReschedule: () => void;
  onAssignStaff: () => void;
  onChangeStatus: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canStatus: boolean;
  canDelete: boolean;
}

export function AppointmentDetailsDialog({
  appointment,
  isOpen,
  onClose,
  onReschedule,
  onAssignStaff,
  onChangeStatus,
  onDelete,
  canEdit,
  canStatus,
  canDelete,
}: AppointmentDetailsDialogProps) {
  if (!appointment) return null;

  const isTerminal = ["completed", "cancelled", "no_show"].includes(appointment.status);
  const totalPricing =
    appointment.pricing?.total ??
    appointment.services?.reduce((sum, s) => sum + s.price, 0) ??
    0;

  const dialogTitle = `Appointment #${appointment.id.slice(-6)}`;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={dialogTitle}>
      <div className="space-y-4 text-left">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="text-xs font-semibold text-muted-foreground">Status & Type</span>
          <div className="flex items-center gap-1.5">
            <BookingTypeBadge bookingType={appointment.bookingType} />
            <AppointmentStatusBadge status={appointment.status} />
          </div>
        </div>

        {/* Customer & Branch */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border border-border">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Customer
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <User className="h-3.5 w-3.5 text-primary" />
              {appointment.customer?.name || "Customer #" + appointment.customerId.slice(-6)}
            </div>
            {appointment.customer?.phone && (
              <div className="text-[11px] text-muted-foreground pl-5">{appointment.customer.phone}</div>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Branch & Timezone
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {appointment.branch?.name || appointment.branchId}
            </div>
            <div className="text-[11px] text-muted-foreground pl-5">
              {appointment.branch?.timezone || "Asia/Kolkata"}
            </div>
          </div>
        </div>

        {/* Schedule & Staff */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-card rounded-lg border border-border">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Date & Time
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              {formatDate(appointment.date)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-5">
              <Clock className="h-3 w-3" />
              {appointment.startTime} {appointment.endTime ? `- ${appointment.endTime}` : ""}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Assigned Staff
            </span>
            <div className="text-xs font-semibold text-foreground">
              {appointment.staff?.name || <span className="text-muted-foreground italic">Unassigned</span>}
            </div>
          </div>
        </div>

        {/* Services List */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Services ({appointment.services?.length || 0})
          </span>
          <div className="divide-y divide-border border border-border rounded-md bg-card">
            {appointment.services?.map((srv, idx) => (
              <div key={srv.serviceId || idx} className="p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Scissors className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <div className="font-semibold text-foreground">{srv.name}</div>
                    <div className="text-[10px] text-muted-foreground">{srv.duration} mins</div>
                  </div>
                </div>
                <div className="font-bold text-foreground">{formatCurrency(srv.price)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-1 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatCurrency(appointment.pricing?.subtotal ?? totalPricing)}</span>
          </div>
          {appointment.pricing?.tax ? (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Tax</span>
              <span>{formatCurrency(appointment.pricing.tax)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between font-bold text-foreground pt-1 border-t border-border/60">
            <span>Total Price</span>
            <span className="text-sm text-primary">{formatCurrency(totalPricing)}</span>
          </div>
        </div>

        {/* Notes & Reason */}
        {appointment.notes && (
          <div className="text-xs space-y-1 bg-card p-2.5 rounded-md border border-border">
            <span className="font-semibold text-foreground">Notes:</span>
            <p className="text-muted-foreground">{appointment.notes}</p>
          </div>
        )}

        {appointment.cancellationReason && (
          <div className="text-xs space-y-1 bg-destructive/10 p-2.5 rounded-md border border-destructive/20 text-destructive">
            <span className="font-semibold">Cancellation Reason:</span>
            <p>{appointment.cancellationReason}</p>
          </div>
        )}

        {/* Timestamps */}
        <div className="text-[11px] text-muted-foreground space-y-0.5 pt-2 border-t border-border">
          {appointment.completedAt && (
            <div>Completed at: {formatDate(appointment.completedAt, "dd MMM yyyy, hh:mm a")}</div>
          )}
          {appointment.cancelledAt && (
            <div>Cancelled at: {formatDate(appointment.cancelledAt, "dd MMM yyyy, hh:mm a")}</div>
          )}
          <div>Created: {formatDate(appointment.createdAt, "dd MMM yyyy, hh:mm a")}</div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
          <div className="flex items-center gap-1.5">
            {canDelete && (
              <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive text-xs">
                Delete
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canEdit && !isTerminal && (
              <>
                <Button variant="outline" size="sm" onClick={onReschedule} className="text-xs">
                  Reschedule
                </Button>
                <Button variant="outline" size="sm" onClick={onAssignStaff} className="text-xs">
                  Staff
                </Button>
              </>
            )}
            {canStatus && !isTerminal && (
              <Button variant="default" size="sm" onClick={onChangeStatus} className="text-xs">
                Change Status
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
