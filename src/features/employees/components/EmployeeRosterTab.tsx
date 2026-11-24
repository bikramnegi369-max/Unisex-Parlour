"use client";

import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Clock,
  Plus,
  Trash2,
  Save,
  Building2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useStaffRoster,
  useUpdateStaffRoster,
  useStaffBranches,
} from "../hooks/useEmployees";
import type {
  DaySchedule,
  DateOverride,
  ShiftTime,
  StaffRoster,
} from "../api/employees.api";
import type { StaffBranch } from "../types/employee.types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

const DAYS_OF_WEEK = [
  { index: 1, name: "Monday" },
  { index: 2, name: "Tuesday" },
  { index: 3, name: "Wednesday" },
  { index: 4, name: "Thursday" },
  { index: 5, name: "Friday" },
  { index: 6, name: "Saturday" },
  { index: 0, name: "Sunday" },
];

const DEFAULT_WEEKLY_SCHEDULE: DaySchedule[] = [
  { dayOfWeek: 0, isWorkingDay: false, shifts: [] },
  {
    dayOfWeek: 1,
    isWorkingDay: true,
    shifts: [{ startTime: "09:00", endTime: "20:00" }],
  },
  {
    dayOfWeek: 2,
    isWorkingDay: true,
    shifts: [{ startTime: "09:00", endTime: "20:00" }],
  },
  {
    dayOfWeek: 3,
    isWorkingDay: true,
    shifts: [{ startTime: "09:00", endTime: "20:00" }],
  },
  {
    dayOfWeek: 4,
    isWorkingDay: true,
    shifts: [{ startTime: "09:00", endTime: "20:00" }],
  },
  {
    dayOfWeek: 5,
    isWorkingDay: true,
    shifts: [{ startTime: "09:00", endTime: "20:00" }],
  },
  {
    dayOfWeek: 6,
    isWorkingDay: true,
    shifts: [{ startTime: "09:00", endTime: "20:00" }],
  },
];

interface EmployeeRosterTabProps {
  employeeId: string;
}

// ---------------------------------------------------------------------------
// Inner Roster Form Component
// Using a key on rosterData?.updatedAt || effectiveBranchId completely resets
// form state when the active branch or remote data changes, avoiding setState
// inside useEffect and preventing cascading render cycles.
// ---------------------------------------------------------------------------
interface RosterFormEditorProps {
  employeeId: string;
  effectiveBranchId: string;
  rosterData?: StaffRoster | null;
  canEdit: boolean;
}

function RosterFormEditor({
  employeeId,
  effectiveBranchId,
  rosterData,
  canEdit,
}: RosterFormEditorProps) {
  const updateRosterMutation = useUpdateStaffRoster();

  // Local state initialized cleanly from props on mount/reset
  const [schedule, setSchedule] = useState<DaySchedule[]>(() =>
    rosterData?.weeklySchedule && rosterData.weeklySchedule.length > 0
      ? rosterData.weeklySchedule
      : DEFAULT_WEEKLY_SCHEDULE,
  );

  const [overrides, setOverrides] = useState<DateOverride[]>(
    () => rosterData?.overrides || [],
  );

  const [effectiveFrom] = useState<string>(() =>
    rosterData?.effectiveFrom
      ? format(new Date(rosterData.effectiveFrom), "yyyy-MM-dd")
      : "",
  );

  const [effectiveTo] = useState<string>(() =>
    rosterData?.effectiveTo
      ? format(new Date(rosterData.effectiveTo), "yyyy-MM-dd")
      : "",
  );

  // Override form state
  const [newOverrideDate, setNewOverrideDate] = useState("");
  const [newOverrideIsWorking, setNewOverrideIsWorking] = useState(false);
  const [newOverrideReason, setNewOverrideReason] = useState("");
  const [newOverrideStart, setNewOverrideStart] = useState("09:00");
  const [newOverrideEnd, setNewOverrideEnd] = useState("17:00");

  const handleToggleWorkingDay = (dayIndex: number, isWorking: boolean) => {
    setSchedule((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === dayIndex) {
          return {
            ...day,
            isWorkingDay: isWorking,
            shifts:
              isWorking && day.shifts.length === 0
                ? [{ startTime: "09:00", endTime: "20:00" }]
                : day.shifts,
          };
        }
        return day;
      }),
    );
  };

  const handleAddShift = (dayIndex: number) => {
    setSchedule((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === dayIndex) {
          return {
            ...day,
            shifts: [...day.shifts, { startTime: "14:00", endTime: "18:00" }],
          };
        }
        return day;
      }),
    );
  };

  const handleRemoveShift = (dayIndex: number, shiftIndex: number) => {
    setSchedule((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === dayIndex) {
          const nextShifts = day.shifts.filter((_, idx) => idx !== shiftIndex);
          return {
            ...day,
            shifts: nextShifts,
            isWorkingDay: nextShifts.length > 0,
          };
        }
        return day;
      }),
    );
  };

  const handleUpdateShiftTime = (
    dayIndex: number,
    shiftIndex: number,
    field: "startTime" | "endTime",
    val: string,
  ) => {
    setSchedule((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === dayIndex) {
          const nextShifts = [...day.shifts];
          nextShifts[shiftIndex] = {
            ...nextShifts[shiftIndex],
            [field]: val,
          };
          return { ...day, shifts: nextShifts };
        }
        return day;
      }),
    );
  };

  const handleAddOverride = () => {
    if (!newOverrideDate) {
      toast.error("Please specify a date for the override.");
      return;
    }

    const shifts: ShiftTime[] = newOverrideIsWorking
      ? [{ startTime: newOverrideStart, endTime: newOverrideEnd }]
      : [];

    const newOverride: DateOverride = {
      date: newOverrideDate,
      isWorkingDay: newOverrideIsWorking,
      reason: newOverrideReason.trim(),
      shifts,
    };

    setOverrides((prev) => [
      ...prev.filter((o) => o.date !== newOverrideDate),
      newOverride,
    ]);
    setNewOverrideDate("");
    setNewOverrideReason("");
    toast.success("Schedule override added.");
  };

  const handleRemoveOverride = (date: string) => {
    setOverrides((prev) => prev.filter((o) => o.date !== date));
  };

  const handleSaveRoster = async () => {
    if (!effectiveBranchId) {
      toast.error("Please select a branch to configure the roster.");
      return;
    }

    try {
      await updateRosterMutation.mutateAsync({
        staffId: employeeId,
        payload: {
          branchId: effectiveBranchId,
          weeklySchedule: schedule,
          overrides,
          effectiveFrom: effectiveFrom
            ? new Date(effectiveFrom).toISOString()
            : undefined,
          effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null,
        },
      });
      toast.success("Staff shift roster updated and synchronized.");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update staff roster";
      toast.error(msg);
    }
  };

  return (
    <>
      <div className="flex justify-end mb-2">
        {canEdit && (
          <Button
            onClick={handleSaveRoster}
            disabled={updateRosterMutation.isPending}
            className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            {updateRosterMutation.isPending ? "Saving..." : "Save Roster Changes"}
          </Button>
        )}
      </div>

      {/* Weekly Schedule Days */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-border bg-muted/40 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Weekly Recurring Working Shifts
          </h3>
          <span className="text-[11px] text-muted-foreground">
            Split shifts supported (e.g. morning + evening)
          </span>
        </div>

        <div className="divide-y divide-border">
          {DAYS_OF_WEEK.map(({ index: dayIndex, name }) => {
            const daySchedule = schedule.find(
              (d) => d.dayOfWeek === dayIndex,
            ) || {
              dayOfWeek: dayIndex,
              isWorkingDay: false,
              shifts: [],
            };

            return (
              <div
                key={dayIndex}
                className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                  daySchedule.isWorkingDay
                    ? "bg-background"
                    : "bg-muted/15 opacity-75"
                }`}
              >
                {/* Day Switcher */}
                <div className="flex items-center gap-3 w-36 shrink-0">
                  <Switch
                    checked={daySchedule.isWorkingDay}
                    onCheckedChange={(checked) =>
                      canEdit && handleToggleWorkingDay(dayIndex, checked)
                    }
                    disabled={!canEdit}
                  />
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      {name}
                    </span>
                    <span
                      className={`text-[10px] font-semibold ${
                        daySchedule.isWorkingDay
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {daySchedule.isWorkingDay ? "Working" : "Weekly Off"}
                    </span>
                  </div>
                </div>

                {/* Shift Intervals */}
                <div className="flex-1">
                  {daySchedule.isWorkingDay && (
                    <div className="space-y-2">
                      {daySchedule.shifts.map((shift, shiftIndex) => (
                        <div
                          key={shiftIndex}
                          className="flex items-center gap-2 flex-wrap"
                        >
                          <div className="flex items-center gap-1.5 bg-muted/30 border border-input rounded-lg px-2.5 py-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <input
                              type="time"
                              value={shift.startTime}
                              onChange={(e) =>
                                canEdit &&
                                handleUpdateShiftTime(
                                  dayIndex,
                                  shiftIndex,
                                  "startTime",
                                  e.target.value,
                                )
                              }
                              disabled={!canEdit}
                              className="text-xs bg-transparent border-0 font-medium focus:outline-none"
                            />
                            <span className="text-xs text-muted-foreground">
                              to
                            </span>
                            <input
                              type="time"
                              value={shift.endTime}
                              onChange={(e) =>
                                canEdit &&
                                handleUpdateShiftTime(
                                  dayIndex,
                                  shiftIndex,
                                  "endTime",
                                  e.target.value,
                                )
                              }
                              disabled={!canEdit}
                              className="text-xs bg-transparent border-0 font-medium focus:outline-none"
                            />
                          </div>

                          {daySchedule.shifts.length > 1 && canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRemoveShift(dayIndex, shiftIndex)
                              }
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}

                      {canEdit && daySchedule.shifts.length < 3 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddShift(dayIndex)}
                          className="h-6 px-2 text-[10px] gap-1 text-muted-foreground"
                        >
                          <Plus className="h-2.5 w-2.5" /> Add Split Shift
                        </Button>
                      )}
                    </div>
                  )}

                  {!daySchedule.isWorkingDay && (
                    <span className="text-xs text-muted-foreground italic">
                      Scheduled Day Off. No appointments will be bookable on this
                      day.
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date Specific Overrides */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-border bg-muted/40 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Date-Specific Schedule Overrides
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Set temporary customized shift hours or mark specific days off
              (e.g., custom holiday or special overtime shifts).
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Add Override Form */}
          {canEdit && (
            <div className="bg-muted/20 border border-border/80 p-4 rounded-xl flex flex-col md:flex-row md:items-end gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Date
                </label>
                <input
                  type="date"
                  value={newOverrideDate}
                  onChange={(e) => setNewOverrideDate(e.target.value)}
                  className="h-8 px-2.5 text-xs bg-background border border-input rounded-lg font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Shift Type
                </label>
                <select
                  value={newOverrideIsWorking ? "working" : "off"}
                  onChange={(e) =>
                    setNewOverrideIsWorking(e.target.value === "working")
                  }
                  className="h-8 px-2.5 text-xs bg-background border border-input rounded-lg font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="off">Special Off Day</option>
                  <option value="working">Custom Working Shift</option>
                </select>
              </div>

              {newOverrideIsWorking && (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={newOverrideStart}
                      onChange={(e) => setNewOverrideStart(e.target.value)}
                      className="h-8 px-2 text-xs bg-background border border-input rounded-lg font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={newOverrideEnd}
                      onChange={(e) => setNewOverrideEnd(e.target.value)}
                      className="h-8 px-2 text-xs bg-background border border-input rounded-lg font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1 flex-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Salon maintenance day off"
                  value={newOverrideReason}
                  onChange={(e) => setNewOverrideReason(e.target.value)}
                  className="h-8 px-2.5 text-xs bg-background border border-input rounded-lg font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full"
                />
              </div>

              <Button
                type="button"
                onClick={handleAddOverride}
                className="h-8 text-xs gap-1 font-semibold"
              >
                <Plus className="h-3.5 w-3.5" /> Add Override
              </Button>
            </div>
          )}

          {/* Overrides Table */}
          {overrides.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-4">
              No date-specific overrides configured. Recurring weekly
              schedule is active for all dates.
            </p>
          ) : (
            <div className="divide-y divide-border/60 border border-border/80 rounded-xl overflow-hidden">
              {overrides.map((override) => (
                <div
                  key={override.date}
                  className="px-4 py-3 flex items-center justify-between text-xs bg-background hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-foreground font-mono">
                      {override.date}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        override.isWorkingDay
                          ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-700 border-rose-500/30"
                      }
                    >
                      {override.isWorkingDay
                        ? "Custom Shift"
                        : "Special Off"}
                    </Badge>
                    {override.isWorkingDay &&
                      override.shifts.length > 0 && (
                        <span className="text-muted-foreground font-medium">
                          {override.shifts
                            .map((s) => `${s.startTime} - ${s.endTime}`)
                            .join(", ")}
                        </span>
                      )}
                    {override.reason && (
                      <span className="text-muted-foreground italic">
                        ({override.reason})
                      </span>
                    )}
                  </div>

                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveOverride(override.date)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function EmployeeRosterTab({ employeeId }: EmployeeRosterTabProps) {
  const { user } = useAuth();
  const canEdit = hasPermission(user, "employees.update");

  const { data: staffBranches } = useStaffBranches(employeeId);
  const activeBranches = useMemo(
    () => (staffBranches || []).filter((b: StaffBranch) => b.isActive),
    [staffBranches],
  );

  const defaultBranchId = useMemo(() => {
    if (activeBranches.length === 0) return "";
    const primary = activeBranches.find((b: StaffBranch) => b.isPrimary);
    return primary?.branchId?._id || activeBranches[0]?.branchId?._id || "";
  }, [activeBranches]);

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  // Use the explicitly selected branch or fall back to the calculated default
  const effectiveBranchId = selectedBranchId || defaultBranchId;

  const { data: rosterData, isLoading } = useStaffRoster(
    employeeId,
    effectiveBranchId,
  );

  if (activeBranches.length === 0) {
    return (
      <div className="p-8 text-center bg-card border border-border rounded-2xl">
        <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-base font-semibold text-foreground">
          No Active Branch Assignments
        </h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          This staff member is not currently assigned to any branches. Assign at
          least one branch before managing their shift schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Branch Switcher */}
      <div className="bg-card border border-border p-5 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">
              Staff Shift Roster & Weekly Schedule
            </h2>
            {!rosterData && (
              <Badge
                variant="outline"
                className="text-amber-600 bg-amber-500/10 border-amber-500/30 text-xs"
              >
                Default: Branch Hours
              </Badge>
            )}
            {rosterData && (
              <Badge
                variant="outline"
                className="text-emerald-600 bg-emerald-500/10 border-emerald-500/30 text-xs"
              >
                Custom Roster Configured
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Configure working hours, weekly offs, split shifts, and temporary
            date overrides for this staff member.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Branch:
            </span>
            <select
              value={effectiveBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-9 px-3 text-xs bg-background border border-input rounded-lg font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {activeBranches.map((b: StaffBranch) => (
                <option key={b.branchId?._id} value={b.branchId?._id}>
                  {b.branchId?.name} {b.isPrimary ? "(Primary)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Operational State Legend */}
      <div className="bg-muted/40 border border-border/80 px-4 py-3 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
        <span className="font-semibold text-muted-foreground">
          Status Legend:
        </span>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-muted border border-border" />{" "}
            Not Scheduled
          </span>
          <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />{" "}
            Scheduled & Available
          </span>
          <span className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Booked
          </span>
          <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> On
            Approved Leave
          </span>
          <span className="inline-flex items-center gap-1.5 text-orange-700 dark:text-orange-300 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />{" "}
            Review Required
          </span>
        </div>
      </div>

      {/* Loading indicator when fetching roster for effective branch */}
      {isLoading ? (
        <div className="p-12 text-center bg-card border border-border rounded-2xl flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
          <p className="text-sm font-medium text-foreground">
            Loading Staff Shift Roster...
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Fetching working hours and date overrides for the selected branch.
          </p>
        </div>
      ) : (
        <RosterFormEditor
          key={`${effectiveBranchId}-${rosterData?.updatedAt || "new"}`}
          employeeId={employeeId}
          effectiveBranchId={effectiveBranchId}
          rosterData={rosterData}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}
