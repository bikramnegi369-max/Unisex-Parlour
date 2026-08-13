"use client";

import React, { useState, useMemo } from "react";
import { format, addDays, subDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Scissors, Clock, MapPin, UserX, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppointmentStatusBadge, BookingTypeBadge } from "./AppointmentStatusBadge";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { formatInBranchTimezone } from "@/lib/formatters";
import type { Appointment } from "../types/appointment.types";

interface AppointmentCalendarViewProps {
  appointments: Appointment[];
  isLoading: boolean;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onSelectAppointment: (appointment: Appointment) => void;
  isAllBranches: boolean;
}

// Visual viewport time slots from 08:00 to 20:00 (12 hours)
const TIME_SLOTS = Array.from({ length: 13 }, (_, i) => {
  const hour = i + 8;
  return `${hour.toString().padStart(2, "0")}:00`;
});

export function AppointmentCalendarView({
  appointments,
  isLoading,
  selectedDate,
  onSelectDate,
  onSelectAppointment,
  isAllBranches,
}: AppointmentCalendarViewProps) {
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string | "all">("all");

  // Fetch active branch employees for staff lanes
  const { data: employeesData } = useEmployees({ limit: 100 });
  const employees = employeesData?.data || [];

  // Week days calculation
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const handlePrev = () => {
    onSelectDate(viewMode === "day" ? subDays(selectedDate, 1) : subDays(selectedDate, 7));
  };

  const handleNext = () => {
    onSelectDate(viewMode === "day" ? addDays(selectedDate, 1) : addDays(selectedDate, 7));
  };

  const handleToday = () => {
    onSelectDate(new Date());
  };

  // Filter appointments for current view
  const currentViewAppointments = useMemo(() => {
    if (viewMode === "day") {
      const selectedStr = format(selectedDate, "yyyy-MM-dd");
      return appointments.filter((app) => app.date === selectedStr);
    } else {
      const startStr = format(weekDays[0], "yyyy-MM-dd");
      const endStr = format(weekDays[6], "yyyy-MM-dd");
      return appointments.filter((app) => app.date >= startStr && app.date <= endStr);
    }
  }, [appointments, selectedDate, viewMode, weekDays]);

  // Filtered by selected staff filter
  const filteredAppointments = useMemo(() => {
    if (selectedStaffFilter === "all") return currentViewAppointments;
    if (selectedStaffFilter === "unassigned") return currentViewAppointments.filter((a) => !a.staffId);
    return currentViewAppointments.filter((a) => a.staffId === selectedStaffFilter);
  }, [currentViewAppointments, selectedStaffFilter]);

  // Calculate visual top offset percentage and height based on startTime (HH:mm) and endTime / duration
  const getAppointmentPosition = (startTime: string, endTime?: string, services?: { duration: number }[]) => {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const startMinutesFrom8AM = (startHour - 8) * 60 + (startMin || 0);

    // Duration in minutes provided by backend services or start/end calculation
    let durationMins = 30; // default visual minimum
    if (endTime) {
      const [endHour, endMin] = endTime.split(":").map(Number);
      const calculatedMins = (endHour - startHour) * 60 + (endMin - startMin);
      if (calculatedMins > 0) durationMins = calculatedMins;
    } else if (services && services.length > 0) {
      durationMins = services.reduce((acc, s) => acc + (s.duration || 0), 0);
    }

    const topPx = Math.max(0, (startMinutesFrom8AM / 60) * 64); // 64px per hour slot
    const heightPx = Math.max(48, (durationMins / 60) * 64);

    return { topPx, heightPx };
  };

  const isTodaySelected = isSameDay(selectedDate, new Date());
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const showCurrentTimeLine = isTodaySelected && currentHour >= 8 && currentHour <= 20;
  const currentTimeTopPx = ((currentHour - 8) * 60 + currentMin) * (64 / 60);

  return (
    <div className="space-y-4">
      {/* Navigation & Controls Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
        {/* Date Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={handlePrev} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Jump-to-Date Selector */}
          <input
            type="date"
            value={format(selectedDate, "yyyy-MM-dd")}
            onChange={(e) => e.target.valueAsDate && onSelectDate(e.target.valueAsDate)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />

          <span className="text-xs font-bold text-foreground ml-1">
            {viewMode === "day"
              ? format(selectedDate, "EEEE, MMMM d, yyyy")
              : `${format(weekDays[0], "MMM d")} - ${format(weekDays[6], "MMM d, yyyy")}`}
          </span>
        </div>

        {/* Staff Filter & View Switcher */}
        <div className="flex items-center gap-2">
          {/* Staff Filter Dropdown */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground font-medium">Staff:</span>
            <select
              value={selectedStaffFilter}
              onChange={(e) => setSelectedStaffFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none"
            >
              <option value="all">All Staff Lanes</option>
              <option value="unassigned">Unassigned Only</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          {/* Day / Week View Mode Toggle */}
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

      {/* Week Day Header selector when in Week Mode */}
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
                      isSelected ? "bg-primary-foreground text-primary" : "bg-primary/20 text-primary"
                    }`}
                  >
                    {dayApptsCount} appts
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Resource Board Timetable Container */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 space-y-4 text-center">
            <div className="h-64 bg-muted/30 animate-pulse rounded-lg border border-border" />
          </div>
        ) : (
          <div className="overflow-x-auto relative">
            <div className="min-w-[800px] flex">
              {/* Sticky Left Time Column Axis */}
              <div className="w-20 shrink-0 border-r border-border bg-muted/20 z-10 sticky left-0">
                <div className="h-10 border-b border-border bg-muted/40 p-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-center">
                  Time
                </div>
                <div className="relative h-[832px]">
                  {TIME_SLOTS.map((time, idx) => (
                    <div
                      key={time}
                      className="absolute left-0 right-0 h-16 border-b border-border/40 text-[10px] font-semibold text-muted-foreground pr-2 flex items-start justify-end pt-1"
                      style={{ top: `${idx * 64}px` }}
                    >
                      {time}
                    </div>
                  ))}
                </div>
              </div>

              {/* Staff Resource Lanes Columns */}
              <div className="flex-1 flex relative">
                {/* Current Time Red Line */}
                {showCurrentTimeLine && (
                  <div
                    className="absolute left-0 right-0 border-b-2 border-destructive z-20 pointer-events-none flex items-center"
                    style={{ top: `${currentTimeTopPx + 40}px` }}
                  >
                    <div className="bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-r shadow-xs">
                      NOW
                    </div>
                  </div>
                )}

                {/* Lanes Array: Column 0 = Unassigned, Column 1..N = Active Staff */}
                {[
                  { id: null, name: "Unassigned Staff", designation: "General Queue" },
                  ...employees,
                ]
                  .filter((lane) => {
                    if (selectedStaffFilter === "all") return true;
                    if (selectedStaffFilter === "unassigned") return lane.id === null;
                    return lane.id === selectedStaffFilter;
                  })
                  .map((lane) => {
                    const laneAppointments = filteredAppointments.filter((a) =>
                      lane.id === null ? !a.staffId : a.staffId === lane.id
                    );

                    return (
                      <div
                        key={lane.id || "unassigned"}
                        className="flex-1 min-w-[200px] border-r border-border/60 last:border-r-0 relative"
                      >
                        {/* Lane Header */}
                        <div className="h-10 border-b border-border bg-muted/30 px-3 py-1.5 flex items-center justify-between">
                          <div className="truncate">
                            <span className="text-xs font-bold text-foreground block truncate">
                              {lane.name}
                            </span>
                            <span className="text-[9px] text-muted-foreground block truncate">
                              {lane.designation || (lane.id === null ? "Queue" : "Staff")}
                            </span>
                          </div>
                          <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-full">
                            {laneAppointments.length}
                          </span>
                        </div>

                        {/* Lane Body Grid Slots */}
                        <div className="relative h-[832px] bg-card/40">
                          {/* Horizontal Grid lines */}
                          {TIME_SLOTS.map((_, idx) => (
                            <div
                              key={idx}
                              className="absolute left-0 right-0 h-16 border-b border-border/30"
                              style={{ top: `${idx * 64}px` }}
                            />
                          ))}

                          {/* Render Appointment Blocks */}
                          {laneAppointments.map((appt) => {
                            const { topPx, heightPx } = getAppointmentPosition(
                              appt.startTime,
                              appt.endTime,
                              appt.services
                            );

                            return (
                              <div
                                key={appt.id}
                                onClick={() => onSelectAppointment(appt)}
                                style={{
                                  top: `${topPx}px`,
                                  height: `${heightPx}px`,
                                }}
                                className="absolute left-1 right-1 rounded-lg border p-2 text-xs shadow-xs hover:shadow-md transition-all cursor-pointer overflow-hidden z-10 bg-card hover:bg-accent/40 border-primary/40 space-y-1"
                              >
                                <div className="flex items-center justify-between gap-1 text-[10px] font-bold">
                                  <span className="text-primary truncate">
                                    {appt.startTime} {appt.endTime ? `- ${appt.endTime}` : ""}
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <BookingTypeBadge bookingType={appt.bookingType} className="text-[9px] px-1 py-0" />
                                    <AppointmentStatusBadge status={appt.status} className="text-[9px] px-1 py-0" />
                                  </div>
                                </div>

                                <div className="font-bold text-foreground truncate text-xs">
                                  {appt.customer?.name || "Customer #" + appt.customerId.slice(-6)}
                                </div>

                                <div className="text-[10px] text-muted-foreground truncate">
                                  {appt.services?.map((s) => s.name).join(", ") || "Services"}
                                </div>

                                {isAllBranches && appt.branch?.name && (
                                  <div className="text-[9px] text-primary flex items-center gap-0.5 truncate pt-0.5">
                                    <MapPin className="h-2.5 w-2.5" />
                                    {appt.branch.name}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
