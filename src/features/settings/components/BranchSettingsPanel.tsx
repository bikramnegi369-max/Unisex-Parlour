"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Clock, GitBranch, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getErrorMessage } from "@/lib/api/errors";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useBranchSettings, useUpdateBranchSettings } from "../hooks/useSettings";
import type { CanonicalWeekday, DayOperatingHours } from "../types/settings.types";

const WEEKDAYS: Array<{ key: CanonicalWeekday; label: string; dow: number }> = [
  { key: "sunday", label: "Sunday", dow: 0 },
  { key: "monday", label: "Monday", dow: 1 },
  { key: "tuesday", label: "Tuesday", dow: 2 },
  { key: "wednesday", label: "Wednesday", dow: 3 },
  { key: "thursday", label: "Thursday", dow: 4 },
  { key: "friday", label: "Friday", dow: 5 },
  { key: "saturday", label: "Saturday", dow: 6 },
];

const DEFAULT_HOURS: Record<CanonicalWeekday, DayOperatingHours> = {
  sunday: { isOpen: false, openTime: null, closeTime: null },
  monday: { isOpen: true, openTime: "09:00", closeTime: "20:00" },
  tuesday: { isOpen: true, openTime: "09:00", closeTime: "20:00" },
  wednesday: { isOpen: true, openTime: "09:00", closeTime: "20:00" },
  thursday: { isOpen: true, openTime: "09:00", closeTime: "20:00" },
  friday: { isOpen: true, openTime: "09:00", closeTime: "20:00" },
  saturday: { isOpen: true, openTime: "09:00", closeTime: "20:00" },
};

export function BranchSettingsPanel() {
  const { user } = useAuth();
  const { currentBranchId, currentBranch, isAllBranchesSelected } = useBranchContext();
  const canEdit = hasPermission(user, "settings.update");
  const { data, isLoading, isError, refetch } = useBranchSettings(
    currentBranchId,
    !isAllBranchesSelected && Boolean(currentBranchId)
  );
  const updateMutation = useUpdateBranchSettings(currentBranchId);

  const [draftTimezone, setTimezone] = useState<string | null>(null);
  const [draftBuffer, setBufferMinutes] = useState<number | null>(null);
  const [draftHours, setHours] = useState<Record<CanonicalWeekday, DayOperatingHours> | null>(null);
  const [draftInheritWeeklyOff, setInheritWeeklyOff] = useState<boolean | null>(null);
  const [draftWeeklyOffDays, setWeeklyOffDays] = useState<number[] | null>(null);

  const timezone = draftTimezone ?? data?.branch.timezone ?? "Asia/Kolkata";
  const bufferMinutes = draftBuffer ?? data?.branch.bufferMinutes ?? 0;
  const hours = draftHours ?? data?.branch.operatingHours ?? DEFAULT_HOURS;
  const inheritWeeklyOff = draftInheritWeeklyOff ?? (data ? data.weeklyOffDays === null : true);
  const weeklyOffDays = draftWeeklyOffDays ?? (data?.weeklyOffDays ?? []);

  if (isAllBranchesSelected || !currentBranchId) {
    return (
      <EmptyState
        icon={GitBranch}
        title="Select a specific branch"
        description="Branch operational settings and operating hours are branch-scoped. Use the branch selector in the header to choose a branch."
      />
    );
  }

  if (isLoading) {
    return <Skeleton className="h-72 w-full rounded-xl" />;
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Unable to load branch settings"
        description="Could not retrieve branch configuration."
        retryAction={{
          label: "Retry",
          onClick: () => {
            void refetch();
          },
        }}
      />
    );
  }

  const toggleWeeklyOff = (dow: number) => {
    setWeeklyOffDays(
      weeklyOffDays.includes(dow)
        ? weeklyOffDays.filter((d: number) => d !== dow)
        : [...weeklyOffDays, dow].sort()
    );
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        branch: {
          timezone,
          bufferMinutes: Number(bufferMinutes),
          operatingHours: hours,
        },
        weeklyOffDays: inheritWeeklyOff ? null : weeklyOffDays,
      });
      toast.success(`Branch settings saved for ${currentBranch?.name || data.branch.name}`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update branch settings"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Branch Settings — {currentBranch?.name || data.branch.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure salon operating hours, branch timezone, and explicit weekly-off overrides.
          </p>
        </div>
        <Badge variant={data.branch.operatingHoursConfigured ? "success" : "warning"}>
          {data.branch.operatingHoursConfigured ? "Schedule Configured" : "Legacy Unconfigured"}
        </Badge>
      </div>

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="branch-tz" className="text-xs font-medium text-foreground">
              Branch Timezone
            </label>
            <Input
              id="branch-tz"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              disabled={!canEdit || updateMutation.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="branch-buffer" className="text-xs font-medium text-foreground">
              Appointment Buffer (mins)
            </label>
            <Input
              id="branch-buffer"
              type="number"
              min={0}
              max={240}
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(Number(e.target.value))}
              disabled={!canEdit || updateMutation.isPending}
            />
          </div>
        </div>
      </Card>

      {/* Operating Hours */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Clock className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">Salon Operating Hours</h3>
            <p className="text-xs text-muted-foreground">
              Determines when this branch accepts bookings (distinct from individual staff rosters).
            </p>
          </div>
        </div>
        <div className="space-y-2.5">
          {WEEKDAYS.map(({ key, label }) => {
            const day = hours[key] || { isOpen: false, openTime: null, closeTime: null };
            return (
              <div
                key={key}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3 min-w-36">
                  <Switch
                    checked={day.isOpen}
                    onCheckedChange={(checked) =>
                      setHours({
                        ...hours,
                        [key]: {
                          isOpen: checked,
                          openTime: checked ? hours[key]?.openTime || "09:00" : null,
                          closeTime: checked ? hours[key]?.closeTime || "20:00" : null,
                        },
                      })
                    }
                    disabled={!canEdit || updateMutation.isPending}
                    aria-label={`${label} open`}
                  />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                {day.isOpen ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={day.openTime || "09:00"}
                      onChange={(e) =>
                        setHours({
                          ...hours,
                          [key]: { ...hours[key], openTime: e.target.value },
                        })
                      }
                      disabled={!canEdit || updateMutation.isPending}
                      className="w-32"
                      aria-label={`${label} open time`}
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={day.closeTime || "20:00"}
                      onChange={(e) =>
                        setHours({
                          ...hours,
                          [key]: { ...hours[key], closeTime: e.target.value },
                        })
                      }
                      disabled={!canEdit || updateMutation.isPending}
                      className="w-32"
                      aria-label={`${label} close time`}
                    />
                  </div>
                ) : (
                  <Badge variant="muted">Closed</Badge>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Weekly Off Override */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Weekly Off Days</h3>
            <p className="text-xs text-muted-foreground">
              {inheritWeeklyOff
                ? "Inheriting organization default weekly offs."
                : weeklyOffDays.length === 0
                  ? "Explicitly configured: No weekly off days (open all week)."
                  : "Using branch-specific weekly off days."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Inherit Org Default</span>
            <Switch
              checked={inheritWeeklyOff}
              onCheckedChange={setInheritWeeklyOff}
              disabled={!canEdit || updateMutation.isPending}
              aria-label="Inherit organization weekly off default"
            />
          </div>
        </div>
        {!inheritWeeklyOff && (
          <div className="flex flex-wrap gap-2 pt-1">
            {WEEKDAYS.map(({ dow, label }) => {
              const selected = weeklyOffDays.includes(dow);
              return (
                <Button
                  key={dow}
                  type="button"
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  onClick={() => toggleWeeklyOff(dow)}
                  disabled={!canEdit || updateMutation.isPending}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        )}
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save Branch Settings"}
          </Button>
        </div>
      )}
    </div>
  );
}
