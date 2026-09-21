"use client";

import React, { useState, useMemo, useEffect } from "react";
import { format, addDays, subDays, startOfWeek, isSameDay } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  AlertTriangle,
  Scissors,
  GripVertical,
  Move,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  AppointmentStatusBadge,
  BookingTypeBadge,
} from "./AppointmentStatusBadge";
import { AppointmentReminderStatus } from "./AppointmentReminderStatus";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { useBranchContext } from "@/hooks/useBranchContext";
import { formatCurrency } from "@/lib/formatters";
import type { Appointment } from "../types/appointment.types";

interface AppointmentCalendarViewProps {
  appointments: Appointment[];
  isLoading: boolean;
  selectedDate: Date;
  viewMode: "day" | "week";
  onViewModeChange: (mode: "day" | "week") => void;
  onSelectDate: (date: Date) => void;
  onSelectAppointment: (appointment: Appointment) => void;
  isAllBranches: boolean;
  canEdit?: boolean;
  staffFilter?: string | "all";
  onStaffFilterChange?: (staffId: string | "all") => void;
  onDropAppointment?: (
    appointmentId: string,
    targetDate: string,
    targetStartTime: string,
    targetStaffId: string | null,
  ) => Promise<void> | void;
}

// Visual viewport time slots from 08:00 to 20:00 (12 hours)
const VIEWPORT_START_HOUR = 8;
const VIEWPORT_END_HOUR = 20;

const TIME_SLOTS = Array.from(
  { length: VIEWPORT_END_HOUR - VIEWPORT_START_HOUR + 1 },
  (_, i) => {
    const hour = i + VIEWPORT_START_HOUR;
    return `${hour.toString().padStart(2, "0")}:00`;
  },
);

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
  return names.length > 0 ? names.join(", ") : "Services";
}

function getStaffDisplayName(appt: Appointment): string {
  if (appt.staff?.name) return appt.staff.name;
  if (appt.staffId) return `Staff #${appt.staffId.slice(-6)}`;
  return "Unassigned";
}

// ---------------------------------------------------------------------------
// Time parsing helpers
// ---------------------------------------------------------------------------
function parseTimeToMinutes(time: string | undefined): number | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// ---------------------------------------------------------------------------
// Collision-aware appointment layout
// ---------------------------------------------------------------------------
interface PositionedAppointment {
  appt: Appointment;
  topPx: number;
  heightPx: number;
  leftPct: number;
  widthPct: number;
  isOutsideViewport: boolean;
  isClippedTop: boolean;
  isClippedBottom: boolean;
}

function layoutAppointments(
  appointments: Appointment[],
  hourPx: number = 120,
  branchTimezone: string = "Asia/Kolkata",
): PositionedAppointment[] {
  const viewportHeightPx = (VIEWPORT_END_HOUR - VIEWPORT_START_HOUR) * hourPx;
  // Sort by startTime ascending, then by totalDuration descending
  const sorted = [...appointments].sort((a, b) => {
    const aStart = parseTimeToMinutes(a.startTime) ?? 0;
    const bStart = parseTimeToMinutes(b.startTime) ?? 0;
    if (aStart !== bStart) return aStart - bStart;
    const aDur = a.totalDuration ?? 0;
    const bDur = b.totalDuration ?? 0;
    return bDur - aDur;
  });

  const positioned: PositionedAppointment[] = [];
  const parsed: {
    appt: Appointment;
    effectiveStart: number;
    effectiveEnd: number;
    durationMins: number;
    column: number;
    totalColumnsInCluster: number;
  }[] = [];

  for (const appt of sorted) {
    const startMin = parseTimeToMinutes(appt.startTime);
    const endMin = parseTimeToMinutes(appt.endTime);

    // Determine duration: prefer endTime - startTime, then totalDuration, then services sum
    let durationMins = 30; // safe default
    if (startMin !== null && endMin !== null && endMin > startMin) {
      durationMins = endMin - startMin;
    } else if (appt.totalDuration && appt.totalDuration > 0) {
      durationMins = appt.totalDuration;
    } else if (appt.services && appt.services.length > 0) {
      const sum = appt.services.reduce((acc, s) => acc + (s?.duration || 0), 0);
      if (sum > 0) durationMins = sum;
    }

    // Group into visual events with calculated time intervals
    const effectiveStart = startMin ?? 0;
    let effectiveEnd = effectiveStart + durationMins;

    // Early-completion handling:
    // If appointment is completed early and completedAt is available, compute the actual
    // completion time in the branch's timezone. Truncate effectiveEnd so that subsequent
    // bookings scheduled after actual completion do not collide or split lane columns needlessly.
    if (appt.status === "completed" && appt.completedAt) {
      try {
        const compDate = new Date(appt.completedAt);
        if (!isNaN(compDate.getTime())) {
          const compParts = new Intl.DateTimeFormat("en-US", {
            timeZone: branchTimezone,
            hour: "numeric",
            minute: "numeric",
            hour12: false,
          }).formatToParts(compDate);
          const compH = parseInt(
            compParts.find((p) => p.type === "hour")?.value || "0",
            10,
          );
          const compM = parseInt(
            compParts.find((p) => p.type === "minute")?.value || "0",
            10,
          );
          const compMinutes = compH * 60 + compM;

          // If it completed earlier than scheduled endTime and after start time, collapse to actual end
          if (compMinutes > effectiveStart && compMinutes < effectiveEnd) {
            effectiveEnd = compMinutes;
            durationMins = effectiveEnd - effectiveStart;
          }
        }
      } catch {
        // Fallback safely to scheduled duration
      }
    }

    parsed.push({
      appt,
      effectiveStart,
      effectiveEnd,
      durationMins,
      column: 0,
      totalColumnsInCluster: 1,
    });
  }

  // Two-pass interval clustering:
  // Pass 1: Partition appointments into connected overlapping clusters.
  // Within each cluster, assign the lowest available column index.
  type ClusterItem = (typeof parsed)[0];
  const clusters: ClusterItem[][] = [];
  let currentCluster: ClusterItem[] = [];
  let clusterEndMin = -1;

  for (const item of parsed) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterEndMin = item.effectiveEnd;
    } else if (item.effectiveStart < clusterEndMin) {
      // Overlaps with current cluster
      currentCluster.push(item);
      clusterEndMin = Math.max(clusterEndMin, item.effectiveEnd);
    } else {
      // Starts a new cluster
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEndMin = item.effectiveEnd;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Pass 2: For each cluster, allocate columns via graph coloring / greedy slotting
  // and set totalColumnsInCluster to the max column index + 1 of the cluster.
  for (const cluster of clusters) {
    const activeColumns: { endMin: number; column: number }[] = [];

    for (const item of cluster) {
      // Find lowest column index not conflicting with active items
      let column = 0;
      while (
        activeColumns.some(
          (c) => c.column === column && c.endMin > item.effectiveStart,
        )
      ) {
        column++;
      }

      // Expire finished columns
      for (let i = activeColumns.length - 1; i >= 0; i--) {
        if (activeColumns[i].endMin <= item.effectiveStart) {
          activeColumns.splice(i, 1);
        }
      }

      activeColumns.push({ endMin: item.effectiveEnd, column });
      item.column = column;
    }

    const clusterMaxCols = Math.max(1, ...cluster.map((c) => c.column + 1));
    for (const item of cluster) {
      item.totalColumnsInCluster = clusterMaxCols;
    }
  }

  // Pass 3: Compute final pixel positions and percentage dimensions
  for (const item of parsed) {
    const {
      appt,
      effectiveStart,
      effectiveEnd,
      durationMins,
      column,
      totalColumnsInCluster,
    } = item;

    const startFromViewport = effectiveStart - VIEWPORT_START_HOUR * 60;
    const topPx = Math.max(0, (startFromViewport / 60) * hourPx);
    // Ensure generous minimum block height of 68px so cards never squish details
    const heightPx = Math.max(68, (durationMins / 60) * hourPx);

    // Clamp height to viewport for rendering, but track clipping
    const isClippedTop = startFromViewport < 0;
    const isClippedBottom = effectiveEnd > VIEWPORT_END_HOUR * 60;
    const clampedHeightPx = Math.min(heightPx, viewportHeightPx - topPx);

    // Position each appointment into its dedicated side-by-side column.
    // Each appointment occupies its own distinct column within the lane:
    const leftPct = (column / totalColumnsInCluster) * 100;
    const widthPct = 100 / totalColumnsInCluster;

    positioned.push({
      appt,
      topPx,
      heightPx: Math.max(68, clampedHeightPx),
      leftPct,
      widthPct,
      isOutsideViewport:
        effectiveStart >= VIEWPORT_END_HOUR * 60 ||
        effectiveEnd <= VIEWPORT_START_HOUR * 60,
      isClippedTop,
      isClippedBottom,
    });
  }

  return positioned;
}

export function AppointmentCalendarView({
  appointments,
  isLoading,
  selectedDate,
  viewMode,
  onViewModeChange,
  onSelectDate,
  onSelectAppointment,
  isAllBranches,
  canEdit = true,
  staffFilter,
  onStaffFilterChange,
  onDropAppointment,
}: AppointmentCalendarViewProps) {
  const [internalStaffFilter, setInternalStaffFilter] = useState<
    string | "all"
  >("all");
  const activeStaffFilter =
    staffFilter !== undefined ? staffFilter : internalStaffFilter;

  const handleStaffFilterChange = (newStaffId: string | "all") => {
    if (onStaffFilterChange) {
      onStaffFilterChange(newStaffId);
    } else {
      setInternalStaffFilter(newStaffId);
    }
  };

  const { currentBranch, currentBranchId } = useBranchContext();
  const [hourScale, setHourScale] = useState<number>(120); // 120px gives ideal full visibility for text, codes, and badges
  const viewportHeightPx =
    (VIEWPORT_END_HOUR - VIEWPORT_START_HOUR) * hourScale;

  // ---------------------------------------------------------------------------
  // Grabbable Canvas (Mouse Drag / Pan-Scroll across both X & Y axes)
  // ---------------------------------------------------------------------------
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = React.useRef<{
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
  }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Ignore right clicks
    if (e.button !== 0) return;
    // Do NOT pan if user clicked an interactive child (appointment card, button, input, select)
    const target = e.target as HTMLElement;
    if (
      target.closest('[data-no-pan="true"]') ||
      target.closest('button, input, select, a, [role="button"]')
    ) {
      return;
    }

    if (!scrollContainerRef.current) return;
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: scrollContainerRef.current.scrollLeft,
      scrollTop: scrollContainerRef.current.scrollTop,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || !scrollContainerRef.current) return;
    e.preventDefault();
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    scrollContainerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
    scrollContainerRef.current.scrollTop = panStartRef.current.scrollTop - dy;
  };

  const handleMouseUpOrLeave = () => {
    if (isPanning) {
      setIsPanning(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Drag-and-Drop State (Card movement across lanes and time slots)
  // ---------------------------------------------------------------------------
  const [draggingApptId, setDraggingApptId] = useState<string | null>(null);
  const [dragOverLaneId, setDragOverLaneId] = useState<
    string | null | "unassigned"
  >(null);
  const [dragHoverTime, setDragHoverTime] = useState<string | null>(null);
  const [dragHoverTopPx, setDragHoverTopPx] = useState<number | null>(null);

  // Branch timezone for the current view
  const branchTimezone = currentBranch?.timezone || "Asia/Kolkata";

  // Fetch active branch employees for staff lanes - scoped to current branch unless isAllBranches
  const employeeParams = useMemo(() => {
    return {
      limit: 100,
      branchId:
        !isAllBranches && currentBranchId && currentBranchId !== "all"
          ? currentBranchId
          : undefined,
    };
  }, [isAllBranches, currentBranchId]);

  const { data: employeesData } = useEmployees(employeeParams);
  const employees = useMemo(
    () => employeesData?.data || [],
    [employeesData?.data],
  );

  // Week days calculation
  const weekStart = useMemo(
    () => startOfWeek(selectedDate, { weekStartsOn: 1 }),
    [selectedDate],
  );
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const handlePrev = () => {
    onSelectDate(
      viewMode === "day" ? subDays(selectedDate, 1) : subDays(selectedDate, 7),
    );
  };

  const handleNext = () => {
    onSelectDate(
      viewMode === "day" ? addDays(selectedDate, 1) : addDays(selectedDate, 7),
    );
  };

  const handleToday = () => {
    onSelectDate(new Date());
  };

  // Filter appointments for current view:
  // In both Day View and Week View modes, the resource board displays the staff lanes
  // for the exact selectedDate. (In Week View, the entire week Monday-Sunday is fetched
  // by the parent API query, but only the active selectedDate is displayed in the staff lanes).
  const currentViewAppointments = useMemo(() => {
    const selectedStr = format(selectedDate, "yyyy-MM-dd");
    return appointments.filter((app) => app.date === selectedStr);
  }, [appointments, selectedDate]);

  // Filtered by active staff filter
  const filteredAppointments = useMemo(() => {
    if (activeStaffFilter === "all") return currentViewAppointments;
    if (activeStaffFilter === "unassigned") {
      return currentViewAppointments.filter((a) => !a.staffId);
    }
    return currentViewAppointments.filter(
      (a) => a.staffId === activeStaffFilter,
    );
  }, [currentViewAppointments, activeStaffFilter]);

  // -------------------------------------------------------------------------
  // Branch-timezone current-time indicator
  // -------------------------------------------------------------------------
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const branchNowParts = useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: branchTimezone,
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      }).formatToParts(now);
      const hourPart = parts.find((p) => p.type === "hour")?.value || "0";
      const minutePart = parts.find((p) => p.type === "minute")?.value || "0";
      return {
        hour: parseInt(hourPart, 10),
        minute: parseInt(minutePart, 10),
      };
    } catch {
      return { hour: now.getHours(), minute: now.getMinutes() };
    }
  }, [now, branchTimezone]);

  // Branch-local today string for "is today" checks
  const branchTodayStr = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: branchTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now);
    } catch {
      return format(now, "yyyy-MM-dd");
    }
  }, [now, branchTimezone]);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const isTodaySelected = selectedDateStr === branchTodayStr;
  const currentBranchMinutes = branchNowParts.hour * 60 + branchNowParts.minute;
  const showCurrentTimeLine =
    isTodaySelected &&
    currentBranchMinutes >= VIEWPORT_START_HOUR * 60 &&
    currentBranchMinutes <= VIEWPORT_END_HOUR * 60;
  const currentTimeTopPx =
    ((currentBranchMinutes - VIEWPORT_START_HOUR * 60) / 60) * hourScale;

  // -------------------------------------------------------------------------
  // All Branches resource lanes
  // -------------------------------------------------------------------------
  // When All Branches is selected, we cannot reliably resolve which staff
  // belong to which branch from the current branch's employee list alone.
  // Strategy:
  //   - Use the current branch's employees as the primary lane set.
  //   - Additionally, derive lanes from appointments themselves (staffId + staff.name)
  //     so cross-branch appointments never disappear.
  //   - Appointments whose staffId is not in the employee list still get a lane
  //     derived from their staff summary, with a branch indicator.
  const derivedStaffLanes = useMemo(() => {
    const laneMap = new Map<
      string,
      { id: string; name: string; branchName?: string }
    >();
    for (const appt of currentViewAppointments) {
      if (!appt.staffId) continue;
      // If a specific branch is selected, do not derive lanes from appointments belonging to other branches
      if (
        !isAllBranches &&
        currentBranchId &&
        appt.branchId &&
        appt.branchId !== currentBranchId
      ) {
        continue;
      }
      if (laneMap.has(appt.staffId)) continue;
      laneMap.set(appt.staffId, {
        id: appt.staffId,
        name: appt.staff?.name || `Staff #${appt.staffId.slice(-6)}`,
        branchName: appt.branch?.name,
      });
    }
    return Array.from(laneMap.values());
  }, [currentViewAppointments, isAllBranches, currentBranchId]);

  // Merge employee lanes with derived lanes (dedupe by id)
  const resourceLanes = useMemo(() => {
    const merged = new Map<
      string,
      { id: string; name: string; designation?: string; branchName?: string }
    >();
    for (const emp of employees) {
      merged.set(emp.id, {
        id: emp.id,
        name: emp.name,
        designation: emp.designation,
      });
    }
    for (const lane of derivedStaffLanes) {
      if (!merged.has(lane.id)) {
        merged.set(lane.id, {
          id: lane.id,
          name: lane.name,
          branchName: lane.branchName,
        });
      }
    }
    return [
      {
        id: null,
        name: "Unassigned Staff",
        designation: "General Queue",
        branchName: undefined,
      },
      ...Array.from(merged.values()),
    ];
  }, [employees, derivedStaffLanes]);

  // Filter lanes by active staff filter
  const visibleLanes = useMemo(() => {
    return resourceLanes.filter((lane) => {
      if (activeStaffFilter === "all") return true;
      if (activeStaffFilter === "unassigned") return lane.id === null;
      return lane.id === activeStaffFilter;
    });
  }, [resourceLanes, activeStaffFilter]);

  return (
    <div className="space-y-4">
      {/* Navigation & Controls Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
        {/* Date Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrev}
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Input
            type="date"
            value={format(selectedDate, "yyyy-MM-dd")}
            onChange={(e) =>
              e.target.valueAsDate && onSelectDate(e.target.valueAsDate)
            }
            className="h-8 text-xs w-36.25 px-2 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:ml-auto [&::-webkit-calendar-picker-indicator]:p-0"
          />

          <span className="text-xs font-bold text-foreground ml-1">
            {viewMode === "day"
              ? format(selectedDate, "EEEE, MMMM d, yyyy")
              : `${format(weekDays[0], "MMM d")} - ${format(weekDays[6], "MMM d, yyyy")}`}
          </span>

          {/* Branch timezone indicator */}
          <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border/60">
            {branchTimezone}
          </span>
        </div>

        {/* Staff Filter & View Switcher */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full lg:w-auto justify-start sm:justify-end">
          {/* Staff Filter Dropdown */}
          <div className="flex items-center gap-1.5 text-xs flex-1 sm:flex-initial min-w-45">
            <span className="text-muted-foreground font-medium shrink-0">
              Staff:
            </span>
            <div className="w-full sm:w-44">
              <Select
                value={activeStaffFilter}
                onChange={(e) => handleStaffFilterChange(e.target.value)}
                className="h-8 text-xs py-0 w-full"
              >
                <option value="all">All Staff Lanes</option>
                <option value="unassigned">Unassigned Only</option>
                {resourceLanes
                  .filter((l) => l.id !== null)
                  .map((l) => (
                    <option key={l.id} value={l.id!}>
                      {l.name}
                      {l.branchName ? ` (${l.branchName})` : ""}
                    </option>
                  ))}
              </Select>
            </div>
          </div>

          {/* Zoom / Scale Selector */}
          <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md border border-border shrink-0">
            <Button
              type="button"
              variant={hourScale === 100 ? "default" : "ghost"}
              size="sm"
              onClick={() => setHourScale(100)}
              className="text-[11px] h-7 px-2"
              title="Compact Timeline"
            >
              Compact
            </Button>
            <Button
              type="button"
              variant={hourScale === 130 ? "default" : "ghost"}
              size="sm"
              onClick={() => setHourScale(130)}
              className="text-[11px] h-7 px-2"
              title="Standard Full Visibility Timeline"
            >
              Standard
            </Button>
            <Button
              type="button"
              variant={hourScale === 160 ? "default" : "ghost"}
              size="sm"
              onClick={() => setHourScale(160)}
              className="text-[11px] h-7 px-2"
              title="Expanded Spacious Timeline"
            >
              Expanded
            </Button>
          </div>

          {/* Day / Week View Mode Toggle */}
          <div className="bg-muted p-0.5 rounded-md flex items-center border border-border shrink-0">
            <Button
              variant={viewMode === "day" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("day")}
              className="text-xs h-7 px-3"
            >
              Day
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("week")}
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
            const dayStr = format(day, "yyyy-MM-dd");
            const isToday = dayStr === branchTodayStr;
            const dayApptsCount = appointments.filter(
              (a) => a.date === dayStr,
            ).length;

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
          <div
            ref={scrollContainerRef}
            data-testid="calendar-timetable-scroll"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className={`overflow-auto max-h-[calc(100vh-280px)] min-h-125 relative select-none ${
              isPanning ? "cursor-grabbing" : "cursor-grab"
            }`}
            title="Click and drag horizontally to pan across staff lanes, or scroll vertically for time"
          >
            <div className="min-w-200 flex">
              {/* Sticky Left Time Column Axis */}
              <div
                data-no-pan="true"
                className="w-20 shrink-0 border-r border-border bg-card z-30 sticky left-0 shadow-sm cursor-default select-none"
              >
                <div className="h-10 border-b border-border bg-muted p-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-center sticky top-0 z-40 shadow-xs">
                  Time
                </div>
                <div
                  className="relative bg-card"
                  style={{ height: `${viewportHeightPx}px` }}
                >
                  {TIME_SLOTS.map((time, idx) => (
                    <div
                      key={time}
                      className="absolute left-0 right-0 border-b border-border/40 text-[10px] font-semibold text-muted-foreground pr-2 flex items-start justify-end pt-1 select-none"
                      style={{
                        height: `${hourScale}px`,
                        top: `${idx * hourScale}px`,
                      }}
                    >
                      {time}
                    </div>
                  ))}
                </div>
              </div>

              {/* Staff Resource Lanes Columns */}
              <div className="flex-1 flex relative">
                {visibleLanes.map((lane) => {
                  const laneAppointments = filteredAppointments.filter((a) =>
                    lane.id === null ? !a.staffId : a.staffId === lane.id,
                  );
                  const positioned = layoutAppointments(
                    laneAppointments,
                    hourScale,
                    branchTimezone,
                  );

                  // Calculate max concurrency in this lane so lane dynamically expands so each concurrent column gets full length width (at least 270px per column)
                  const maxConcurrentCols = Math.max(
                    1,
                    ...positioned.map((p) => Math.round(100 / p.widthPct)),
                  );
                  // Ensure every side-by-side appointment card receives full length width (270px+ each) and is never squished or truncated
                  const laneMinWidthPx = Math.max(270, maxConcurrentCols * 270);
                  const laneMinWidthStyle = { minWidth: `${laneMinWidthPx}px` };
                  const isCurrentLaneDragOver =
                    dragOverLaneId === lane.id ||
                    (dragOverLaneId === "unassigned" && lane.id === null);

                  return (
                    <div
                      key={lane.id || "unassigned"}
                      data-testid={`lane-${lane.id || "unassigned"}`}
                      style={laneMinWidthStyle}
                      className={`flex-1 border-r border-border/60 last:border-r-0 relative transition-colors ${
                        isCurrentLaneDragOver
                          ? "bg-primary/5 ring-2 ring-primary/40"
                          : ""
                      }`}
                    >
                      {/* Lane Header (Sticky Top so lane identity is always visible while scrolling vertically) */}
                      <div className="h-10 border-b border-border bg-muted/95 backdrop-blur-xs px-3 py-1.5 flex items-center justify-between pointer-events-none select-none sticky top-0 z-20 shadow-xs">
                        <div className="truncate">
                          <span className="text-xs font-bold text-foreground block truncate">
                            {lane.name}
                          </span>
                          <span className="text-[9px] text-muted-foreground block truncate">
                            {lane.branchName
                              ? `Branch: ${lane.branchName}`
                              : lane.designation ||
                                (lane.id === null ? "Queue" : "Staff")}
                          </span>
                        </div>
                        <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-full">
                          {laneAppointments.length}
                        </span>
                      </div>

                      {/* Lane Body Grid Slots with Drop Target Support */}
                      <div
                        data-testid={`lane-body-${lane.id || "unassigned"}`}
                        className="relative bg-card/40 transition-colors"
                        style={{ height: `${viewportHeightPx}px` }}
                        onDragOver={(e) => {
                          if (!canEdit) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";

                          const rect = e.currentTarget.getBoundingClientRect();
                          const clientY =
                            typeof e.clientY === "number" &&
                            !Number.isNaN(e.clientY)
                              ? e.clientY
                              : rect.top;
                          const offsetY = Math.max(0, clientY - rect.top);
                          // Calculate minutes from VIEWPORT_START_HOUR
                          const minsFromStart = (offsetY / hourScale) * 60;
                          // Snap to 15-minute intervals
                          const snappedMins =
                            Math.round(minsFromStart / 15) * 15;
                          const totalMinutes =
                            VIEWPORT_START_HOUR * 60 + snappedMins;
                          // Clamp between 08:00 and 19:45
                          const clampedMins = Math.min(
                            VIEWPORT_END_HOUR * 60 - 15,
                            Math.max(VIEWPORT_START_HOUR * 60, totalMinutes),
                          );

                          const h = Math.floor(clampedMins / 60);
                          const m = clampedMins % 60;
                          const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
                          const topPx =
                            ((clampedMins - VIEWPORT_START_HOUR * 60) / 60) *
                            hourScale;

                          setDragOverLaneId(
                            lane.id === null ? "unassigned" : lane.id,
                          );
                          setDragHoverTime(timeStr);
                          setDragHoverTopPx(topPx);
                        }}
                        onDragLeave={(e) => {
                          // Only clear if leaving the lane body itself
                          if (
                            !e.currentTarget.contains(e.relatedTarget as Node)
                          ) {
                            setDragOverLaneId(null);
                            setDragHoverTime(null);
                            setDragHoverTopPx(null);
                          }
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          const rawData =
                            e.dataTransfer.getData("application/json");
                          setDragOverLaneId(null);
                          setDragHoverTime(null);
                          setDragHoverTopPx(null);
                          setDraggingApptId(null);

                          if (!rawData || !onDropAppointment) return;
                          try {
                            const parsed = JSON.parse(rawData);
                            const apptId = parsed.appointmentId as string;
                            if (!apptId) return;

                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            const clientY =
                              typeof e.clientY === "number" &&
                              !Number.isNaN(e.clientY)
                                ? e.clientY
                                : rect.top;
                            const offsetY = Math.max(0, clientY - rect.top);
                            const minsFromStart = (offsetY / hourScale) * 60;
                            const snappedMins =
                              Math.round(minsFromStart / 15) * 15;
                            const totalMinutes =
                              VIEWPORT_START_HOUR * 60 + snappedMins;
                            const clampedMins = Math.min(
                              VIEWPORT_END_HOUR * 60 - 15,
                              Math.max(VIEWPORT_START_HOUR * 60, totalMinutes),
                            );

                            const h = Math.floor(clampedMins / 60);
                            const m = clampedMins % 60;
                            const targetTime = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
                            const targetDate = format(
                              selectedDate,
                              "yyyy-MM-dd",
                            );
                            const targetStaffId = lane.id;

                            await onDropAppointment(
                              apptId,
                              targetDate,
                              targetTime,
                              targetStaffId,
                            );
                          } catch {
                            // Ignore invalid drops
                          }
                        }}
                      >
                        {/* Drag hover drop indicator line */}
                        {isCurrentLaneDragOver && dragHoverTopPx !== null && (
                          <div
                            className="absolute left-0 right-0 border-b-2 border-primary z-30 pointer-events-none flex items-center shadow-md animate-pulse"
                            style={{ top: `${dragHoverTopPx}px` }}
                          >
                            <div className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-r shadow-md flex items-center gap-1">
                              <Move className="h-3 w-3" />
                              <span>{dragHoverTime}</span>
                            </div>
                          </div>
                        )}

                        {/* Current Time Red Line (branch timezone) */}
                        {showCurrentTimeLine && (
                          <div
                            className="absolute left-0 right-0 border-b-2 border-destructive z-20 pointer-events-none flex items-center"
                            style={{ top: `${currentTimeTopPx}px` }}
                          >
                            <div className="bg-destructive text-destructive-foreground text-[9px] font-bold px-1 py-0.2 rounded-r shadow-xs">
                              NOW
                            </div>
                          </div>
                        )}
                        {/* Horizontal Grid lines */}
                        {TIME_SLOTS.map((_, idx) => (
                          <div
                            key={idx}
                            className="absolute left-0 right-0 border-b border-border/30 pointer-events-none"
                            style={{
                              height: `${hourScale}px`,
                              top: `${idx * hourScale}px`,
                            }}
                          />
                        ))}

                        {/* Render Appointment Blocks (collision-aware & draggable) */}
                        {positioned.map(
                          ({
                            appt,
                            topPx,
                            heightPx,
                            leftPct,
                            widthPct,
                            isOutsideViewport,
                            isClippedTop,
                            isClippedBottom,
                          }) => {
                            const isCompleted = appt.status === "completed";
                            const isCancelled =
                              appt.status === "cancelled" ||
                              appt.status === "no_show";
                            const isActive =
                              appt.status === "in_progress" ||
                              appt.status === "scheduled";
                            const isBeingDragged = draggingApptId === appt.id;

                            if (isOutsideViewport) {
                              // Render a compact "outside viewport" indicator at the top/bottom edge
                              const edgeTop =
                                appt.startTime &&
                                parseTimeToMinutes(appt.startTime)! <
                                  VIEWPORT_START_HOUR * 60;
                              return (
                                <div
                                  key={appt.id}
                                  data-no-pan="true"
                                  onClick={() => onSelectAppointment(appt)}
                                  style={{
                                    top: edgeTop ? 0 : viewportHeightPx - 28,
                                    left: `${leftPct}%`,
                                    width: `${widthPct}%`,
                                  }}
                                  className="absolute h-7 rounded-md border border-dashed border-amber-400/60 bg-amber-500/10 px-1.5 text-[9px] text-amber-700 dark:text-amber-300 flex items-center gap-1 cursor-pointer hover:bg-amber-500/20 transition-colors z-10 overflow-hidden"
                                  title={`${getCustomerDisplayName(appt)} — ${appt.startTime || "?"} (outside visible hours)`}
                                >
                                  <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">
                                    {getCustomerDisplayName(appt)} ·{" "}
                                    {appt.startTime || "?"}
                                  </span>
                                </div>
                              );
                            }

                            // Card styling based on status and layering:
                            const cardZIndex = isActive
                              ? "z-10 hover:z-30"
                              : "z-5 hover:z-30";
                            const cardBgBorder = isCompleted
                              ? "bg-card border-emerald-500/50 hover:border-emerald-500 hover:shadow-md"
                              : isCancelled
                                ? "bg-muted border-border/80 opacity-70 hover:opacity-100 hover:border-border hover:shadow-md"
                                : "bg-card border-primary/50 hover:border-primary shadow-xs hover:shadow-md";

                            const isDraggable =
                              canEdit &&
                              !isPanning &&
                              !isCompleted &&
                              !isCancelled;

                            return (
                              <div
                                key={appt.id}
                                role="button"
                                tabIndex={0}
                                data-no-pan="true"
                                draggable={isDraggable}
                                onDragStart={(e) => {
                                  if (!isDraggable) return;
                                  setDraggingApptId(appt.id);
                                  e.dataTransfer.effectAllowed = "move";
                                  e.dataTransfer.setData(
                                    "application/json",
                                    JSON.stringify({
                                      appointmentId: appt.id,
                                      originalStartTime: appt.startTime,
                                      originalStaffId: appt.staffId,
                                    }),
                                  );
                                }}
                                onDragEnd={() => {
                                  setDraggingApptId(null);
                                  setDragOverLaneId(null);
                                  setDragHoverTime(null);
                                  setDragHoverTopPx(null);
                                }}
                                aria-label={`Appointment for ${getCustomerDisplayName(appt)} at ${appt.startTime}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectAppointment(appt);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onSelectAppointment(appt);
                                  }
                                }}
                                style={{
                                  top: `${topPx}px`,
                                  height: `${heightPx}px`,
                                  left: `${leftPct}%`,
                                  width: `${widthPct}%`,
                                }}
                                className={`absolute rounded-lg border p-1.5 text-xs transition-all select-none overflow-hidden flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-primary ${cardZIndex} ${cardBgBorder} ${
                                  isBeingDragged
                                    ? "opacity-40 scale-95 ring-2 ring-primary"
                                    : ""
                                } ${isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
                              >
                                {/* Clipping indicators */}
                                {isClippedTop && (
                                  <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400/70 rounded-t-lg" />
                                )}
                                {isClippedBottom && (
                                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400/70 rounded-b-lg" />
                                )}

                                <div className="space-y-1">
                                  {/* Top Row: Time + Status Badges */}
                                  <div className="flex items-center justify-between gap-1 text-[10px] font-bold">
                                    <div className="flex items-center gap-1 text-primary truncate">
                                      {isDraggable && (
                                        <GripVertical className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                                      )}
                                      <span className="truncate">
                                        {appt.startTime}
                                        {appt.endTime
                                          ? ` - ${appt.endTime}`
                                          : ""}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                                      {appt.reminder?.enabled && (
                                        <AppointmentReminderStatus
                                          reminder={appt.reminder}
                                          compact
                                        />
                                      )}
                                      <BookingTypeBadge
                                        bookingType={appt.bookingType}
                                        className="text-[9px] px-1 py-0"
                                      />
                                      <AppointmentStatusBadge
                                        status={appt.status}
                                        isUnassignedQueue={!appt.staffId}
                                        className="text-[9px] px-1 py-0"
                                      />
                                    </div>
                                  </div>

                                  {/* Middle Row: Customer Name & Code */}
                                  <div className="font-bold text-foreground truncate text-xs flex items-center justify-between gap-1">
                                    <span className="truncate">
                                      {getCustomerDisplayName(appt)}
                                    </span>
                                    <span className="font-mono text-[9px] font-semibold text-primary bg-primary/10 px-1 py-0.5 rounded shrink-0 border border-primary/20">
                                      {appt.appointmentCode ||
                                        `#${appt.id.slice(-6)}`}
                                    </span>
                                  </div>

                                  {/* Services Summary */}
                                  <div className="text-[10px] text-muted-foreground truncate font-medium">
                                    <Scissors className="inline h-2.5 w-2.5 mr-0.5 text-muted-foreground/70" />
                                    {getServiceSummary(appt)}
                                  </div>
                                </div>

                                {/* Bottom Row: Staff & Price */}
                                <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1 mt-1 border-t border-border/40 gap-1">
                                  <span className="truncate">
                                    Staff:{" "}
                                    <strong className="text-foreground font-semibold">
                                      {getStaffDisplayName(appt)}
                                    </strong>
                                  </span>
                                  {(appt.pricing?.total ?? 0) > 0 && (
                                    <span className="font-semibold text-foreground shrink-0">
                                      {formatCurrency(appt.pricing?.total ?? 0)}
                                    </span>
                                  )}
                                </div>

                                {isAllBranches && appt.branch?.name && (
                                  <div className="text-[9px] text-primary flex items-center gap-0.5 truncate pt-0.5">
                                    <MapPin className="h-2.5 w-2.5" />
                                    {appt.branch.name}
                                  </div>
                                )}
                              </div>
                            );
                          },
                        )}

                        {/* Empty lane state */}
                        {laneAppointments.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground/50 pointer-events-none select-none">
                            No appointments
                          </div>
                        )}
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
