"use client";

import React, { useState, useMemo } from "react";
import { format, addDays, subDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Scissors, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppointmentStatusBadge, BookingTypeBadge } from "./AppointmentStatusBadge";
import type { Appointment } from "../types/appointment.types";

interface AppointmentCalendarViewProps {
  appointments: Appointment[];
  isLoading: boolean;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onSelectAppointment: (appointment: Appointment) => void;
  isAllBranches: boolean;
}

export function AppointmentCalendarView({
  appointments,
  isLoading,
  selectedDate,
  onSelectDate,
  onSelectAppointment,
  isAllBranches,
}: AppointmentCalendarViewProps) {
  const [viewMode, setViewMode] = useState<"day" | "week">("day");

  // Calculate week days for week view
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const handlePrev = () => {
    if (viewMode === "day") {
      onSelectDate(subDays(selectedDate, 1));
    } else {
      onSelectDate(subDays(selectedDate, 7));
    }
  };

  const handleNext = () => {
    if (viewMode === "day") {
      onSelectDate(addDays(selectedDate, 1));
    } else {
      onSelectDate(addDays(selectedDate, 7));
    }
  };

  const handleToday = () => {
    onSelectDate(new Date());
  };

  // Group appointments by date
  const filteredAppointments = useMemo(() => {
    if (viewMode === "day") {
      const selectedStr = format(selectedDate, "yyyy-MM-dd");
      return appointments.filter((app) => app.date === selectedStr);
    } else {
      const startStr = format(weekDays[0], "yyyy-MM-dd");
      const endStr = format(weekDays[6], "yyyy-MM-dd");
      return appointments.filter((app) => app.date >= startStr && app.date <= endStr);
    }
  }, [appointments, selectedDate, viewMode, weekDays]);

  // Sort by startTime
  const sortedAppointments = useMemo(() => {
    return [...filteredAppointments].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [filteredAppointments]);

  return (
    <div className="space-y-4">
      {/* Calendar Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrev} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-foreground ml-2">
            {viewMode === "day"
              ? format(selectedDate, "EEEE, MMMM d, yyyy")
              : `${format(weekDays[0], "MMM d")} - ${format(weekDays[6], "MMM d, yyyy")}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-muted p-0.5 rounded-md flex items-center border border-border">
            <Button
              variant={viewMode === "day" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("day")}
              className="text-xs h-7 px-3"
            >
              Day
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className="text-xs h-7 px-3"
            >
              Week
            </Button>
          </div>
        </div>
      </div>

      {/* Week Selector Bar when in Week Mode */}
      {viewMode === "week" && (
        <div className="grid grid-cols-7 gap-1 bg-card p-2 rounded-lg border border-border">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const dayStr = format(day, "yyyy-MM-dd");
            const dayApptsCount = appointments.filter((a) => a.date === dayStr).length;

            return (
              <button
                key={day.toISOString()}
                onClick={() => onSelectDate(day)}
                className={`flex flex-col items-center p-2 rounded-md transition-colors text-xs ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-bold"
                    : isToday
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <span>{format(day, "EEE")}</span>
                <span className="text-sm mt-0.5">{format(day, "d")}</span>
                {dayApptsCount > 0 && (
                  <span
                    className={`mt-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? "bg-primary-foreground text-primary"
                        : "bg-primary/20 text-primary"
                    }`}
                  >
                    {dayApptsCount} appt{dayApptsCount > 1 ? "s" : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Appointment Cards Grid / Timetable */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-muted/40 animate-pulse rounded-lg border border-border" />
          ))}
        </div>
      ) : sortedAppointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-lg border border-border space-y-3">
          <CalendarIcon className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="text-sm font-semibold text-foreground">No appointments scheduled</h3>
          <p className="text-xs text-muted-foreground">
            There are no appointments on {format(selectedDate, "MMMM d, yyyy")}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedAppointments.map((appt) => (
            <div
              key={appt.id}
              onClick={() => onSelectAppointment(appt)}
              className="bg-card hover:bg-accent/40 cursor-pointer p-4 rounded-lg border border-border shadow-xs hover:shadow-md transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>{appt.startTime}</span>
                  {appt.endTime && <span className="text-muted-foreground"> - {appt.endTime}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <BookingTypeBadge bookingType={appt.bookingType} />
                  <AppointmentStatusBadge status={appt.status} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{appt.customer?.name || "Customer #" + appt.customerId.slice(-6)}</span>
                </div>
                {appt.customer?.phone && (
                  <div className="text-xs text-muted-foreground pl-5">{appt.customer.phone}</div>
                )}
              </div>

              <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t border-border/50">
                <div className="flex items-center gap-1.5">
                  <Scissors className="h-3.5 w-3.5 text-primary/70" />
                  <span className="font-medium text-foreground">
                    {appt.services?.map((s) => s.name).join(", ") || "Service"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-muted-foreground">
                    Staff: {appt.staff?.name || "Unassigned"}
                  </span>
                  {isAllBranches && appt.branch?.name && (
                    <span className="flex items-center gap-1 text-primary">
                      <MapPin className="h-3 w-3" />
                      {appt.branch.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
