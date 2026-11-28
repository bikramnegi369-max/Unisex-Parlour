"use client";

import React from "react";
import Link from "next/link";
import { CalendarClock, ArrowRight, AlertTriangle } from "lucide-react";
import { DashboardOperationsData } from "../../types/dashboard.types";
import { cn } from "@/lib/utils";

interface TodayOperationsViewProps {
  data?: DashboardOperationsData;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function TodayOperationsView({
  data,
  isLoading,
  isError,
  onRetry,
}: TodayOperationsViewProps) {
  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-2xs animate-pulse space-y-4">
        <div className="h-6 w-48 bg-muted rounded-md" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted/60 rounded-xl" />
          ))}
        </div>
        <div className="h-40 bg-muted/40 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 rounded-2xl bg-card border border-rose-500/30 shadow-2xs flex flex-col items-center justify-center text-center space-y-3">
        <AlertTriangle size={24} className="text-rose-500" />
        <div className="text-sm font-semibold text-foreground">
          Failed to load live operations data
        </div>
        <button
          onClick={onRetry}
          className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const { summary, appointmentsTimeline, staffRoster } = data;

  const statusStyles: Record<string, string> = {
    scheduled:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    in_progress:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse",
    completed:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    cancelled:
      "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    no_show:
      "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  };

  return (
    <div className="flex flex-col p-4 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-2xs select-none">
      {/* Top Banner: Title & Link to full Appointments screen */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <CalendarClock size={18} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              Today&apos;s Operational Command
            </h2>
            <p className="text-xs text-muted-foreground">
              Live schedule, floor staffing, and arrival execution
            </p>
          </div>
        </div>

        <Link
          href="/appointments"
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline group"
        >
          <span>Appointments Register</span>
          <ArrowRight
            size={13}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      {/* Operations Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mb-6">
        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Bookings Today
          </span>
          <span className="text-xl font-extrabold text-foreground font-mono mt-0.5 block">
            {summary.todayAppointmentsCount}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block">
            Present Staff
          </span>
          <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5 block">
            {summary.presentStaffCount} / {summary.totalBranchStaff}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
          <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 block">
            Clocked In Now
          </span>
          <span className="text-xl font-extrabold text-purple-700 dark:text-purple-400 font-mono mt-0.5 block">
            {summary.clockedInNowCount}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
          <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 block">
            Available Floor Staff
          </span>
          <span className="text-xl font-extrabold text-blue-700 dark:text-blue-400 font-mono mt-0.5 block">
            {summary.availableStaffCount}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 block">
            Late Check-ins
          </span>
          <span className="text-xl font-extrabold text-amber-700 dark:text-amber-400 font-mono mt-0.5 block">
            {summary.lateStaffCount}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
          <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 block">
            Approved Leave
          </span>
          <span className="text-xl font-extrabold text-rose-700 dark:text-rose-400 font-mono mt-0.5 block">
            {summary.onLeaveStaffCount}
          </span>
        </div>
      </div>

      {/* Split View: Upcoming Appointments Timeline (Left) & Staff Roster (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Appointments Timeline (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-foreground uppercase tracking-wider">
            <span>Upcoming & Active Appointments</span>
            <span className="text-muted-foreground font-normal">
              Showing next {appointmentsTimeline.length}
            </span>
          </div>

          {appointmentsTimeline.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-border/80 text-center text-xs text-muted-foreground">
              No appointments scheduled for today
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {appointmentsTimeline.map((appt, index) => (
                <div
                  key={`${appt.id}-${index}`}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/60 transition-colors gap-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center justify-center h-10 w-12 rounded-lg bg-background border border-border shrink-0 font-mono text-xs font-bold text-foreground">
                      <span>{appt.startTime}</span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {(appt as { appointmentCode?: string }).appointmentCode && (
                          <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                            {(appt as { appointmentCode?: string }).appointmentCode}
                          </span>
                        )}
                        <span className="text-xs font-bold text-foreground">
                          {appt.customerName}
                        </span>
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded-md text-[10px] font-bold border",
                            statusStyles[appt.status] ||
                              "bg-muted text-muted-foreground",
                          )}
                        >
                          {appt.status.replace("_", " ").toUpperCase()}
                        </span>
                        {appt.bookingType === "walk_in" && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                            Walk-In
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {appt.services.map((s) => s.name).join(", ")}
                      </div>

                      <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                        Assigned:{" "}
                        <strong className="text-foreground">
                          {appt.staffName}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 tabular-nums">
                    <div className="text-xs font-mono font-bold text-foreground">
                      ₹
                      {(
                        (appt.pricing as { totalPayable?: number; total?: number } | undefined)
                          ?.totalPayable ??
                        appt.pricing?.total ??
                        0
                      ).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {appt.services.reduce((acc, s) => acc + s.duration, 0)}{" "}
                      mins
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Active Staff Roster (1 col) */}
        <div className="space-y-3 border-t lg:border-t-0 lg:border-l border-border/60 lg:pl-6 pt-4 lg:pt-0">
          <div className="flex items-center justify-between text-xs font-bold text-foreground uppercase tracking-wider">
            <span>Stylist Floor Availability</span>
            <span className="text-muted-foreground font-normal">Today</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {staffRoster.map((staff, index) => (
              <div
                key={`${staff.staffId}-${index}`}
                className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/60 text-xs"
              >
                <div>
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <span>{staff.staffName}</span>
                    {staff.isClockedIn && (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                        title="Clocked in"
                      />
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {staff.designation}
                  </div>
                </div>

                <div>
                  {staff.statusToday === "on_leave" ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                      On Leave
                    </span>
                  ) : staff.currentAppointment ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      Serving ({staff.currentAppointment.startTime})
                    </span>
                  ) : staff.isClockedIn ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Available
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                      Not Punched
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
