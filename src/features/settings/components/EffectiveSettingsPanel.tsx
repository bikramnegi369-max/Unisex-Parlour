"use client";

import React from "react";
import { Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useEffectiveSettings } from "../hooks/useSettings";
import type { ResolvedSettingValue } from "../types/settings.types";

const SOURCE_BADGE: Record<
  ResolvedSettingValue<unknown>["source"],
  { label: string; variant: "default" | "secondary" | "muted" }
> = {
  branch_override: { label: "Branch Override", variant: "default" },
  organization: { label: "Organization", variant: "secondary" },
  system_default: { label: "System Default", variant: "muted" },
};

function SettingRow({
  label,
  resolved,
  formatValue,
}: {
  label: string;
  resolved: ResolvedSettingValue<unknown>;
  formatValue?: (val: unknown) => string;
}) {
  const badge = SOURCE_BADGE[resolved.source];
  const display = formatValue ? formatValue(resolved.value) : String(resolved.value);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 border-b border-border last:border-b-0">
      <span className="text-sm text-foreground font-medium">{label}</span>
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-mono text-foreground">{display}</span>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
    </div>
  );
}

export function EffectiveSettingsPanel() {
  const { currentBranchId, currentBranch } = useBranchContext();
  const { data, isLoading, isError, refetch } = useEffectiveSettings(currentBranchId);

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Unable to resolve effective settings"
        description="Could not fetch authoritative effective settings from the server."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Effective Settings {currentBranch ? `— ${currentBranch.name}` : "(Organization Scope)"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Authoritative runtime values resolved by the backend (Branch Override → Organization → System Default).
        </p>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-2">Regional & Scheduling</h3>
        <SettingRow label="Timezone" resolved={data.regional.timezone} />
        <SettingRow label="Currency" resolved={data.regional.currency} />
        <SettingRow label="Date Format" resolved={data.regional.dateFormat} />
        <SettingRow label="Time Format" resolved={data.regional.timeFormat} />
        <SettingRow label="Appointment Buffer (mins)" resolved={data.appointments.bufferMinutes} />
        <SettingRow label="Allow Walk-Ins" resolved={data.appointments.allowWalkIns} formatValue={(v) => (v ? "Enabled" : "Disabled")} />
        <SettingRow label="Allow Advance Bookings" resolved={data.appointments.allowAdvanceBookings} formatValue={(v) => (v ? "Enabled" : "Disabled")} />
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-2">Attendance & Leaves</h3>
        <SettingRow label="Attendance Grace (mins)" resolved={data.attendance.graceMinutes} />
        <SettingRow label="Auto-Mark Absent After Cutoff" resolved={data.attendance.autoMarkAbsentAfterCutoff} formatValue={(v) => (v ? "Enabled" : "Disabled")} />
        <SettingRow
          label="Weekly Off Days"
          resolved={data.leaves.weeklyOffDays}
          formatValue={(v) => {
            const arr = Array.isArray(v) ? v : [];
            return arr.length === 0 ? "None (Open All Week)" : arr.join(", ");
          }}
        />
        <SettingRow label="Half-Day Leave Eligible" resolved={data.leaves.allowHalfDay} formatValue={(v) => (v ? "Enabled" : "Disabled")} />
      </Card>
    </div>
  );
}
