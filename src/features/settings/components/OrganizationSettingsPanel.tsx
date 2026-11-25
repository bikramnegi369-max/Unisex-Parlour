"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Building2, Globe, Sliders, RotateCcw, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { getErrorMessage } from "@/lib/api/errors";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasAnyPermission } from "@/lib/permissions";
import {
  organizationSettingsSchema,
  type OrganizationSettingsFormValues,
} from "../schemas/settings.schema";
import {
  useOrganizationSettings,
  useUpdateOrganizationSettings,
} from "../hooks/useSettings";
import {
  getCurrencyOptions,
  getTimezoneOptions,
  LOCALE_OPTIONS,
} from "../utils/regionalOptions";

export function OrganizationSettingsPanel() {
  const { user } = useAuth();
  const canEdit = hasAnyPermission(user, ["settings.update", "organizations.update"]);
  const { data, isLoading, isError, refetch } = useOrganizationSettings();
  const updateMutation = useUpdateOrganizationSettings();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<OrganizationSettingsFormValues>({
    resolver: zodResolver(organizationSettingsSchema),
  });

  useEffect(() => {
    if (data) {
      reset({
        organization: {
          name: data.organization.name || "",
          expenseApprovalThreshold: data.organization.expenseApprovalThreshold ?? 5000,
        },
        profile: {
          displayName: data.profile.displayName || "",
          email: data.profile.email || "",
          phone: data.profile.phone || "",
          address: data.profile.address || "",
          website: data.profile.website || "",
        },
        regional: {
          timezone: data.regional.timezone || "Asia/Kolkata",
          currency: data.regional.currency || "INR",
          locale: data.regional.locale || "en-IN",
          dateFormat: data.regional.dateFormat || "YYYY-MM-DD",
          timeFormat: data.regional.timeFormat || "HH:mm",
          firstDayOfWeek: data.regional.firstDayOfWeek ?? 1,
        },
        defaults: {
          appointmentBufferMinutes: data.defaults.appointmentBufferMinutes ?? 0,
          allowWalkIns: data.defaults.allowWalkIns ?? true,
          allowAdvanceBookings: data.defaults.allowAdvanceBookings ?? true,
          reminderDefaultOffsetMinutes: data.defaults.reminderDefaultOffsetMinutes ?? 60,
          attendanceGraceMinutes: data.defaults.attendanceGraceMinutes ?? 15,
          autoMarkAbsentAfterCutoff: data.defaults.autoMarkAbsentAfterCutoff ?? false,
          defaultWeeklyOffDays: data.defaults.defaultWeeklyOffDays ?? [0],
          defaultHalfDayEligible: data.defaults.defaultHalfDayEligible ?? true,
          exportRetentionHours: data.defaults.exportRetentionHours ?? 24,
        },
      });
    }
  }, [data, reset]);

  const onSubmit = async (values: OrganizationSettingsFormValues) => {
    try {
      await updateMutation.mutateAsync({
        organization: values.organization,
        profile: {
          displayName: values.profile.displayName || null,
          email: values.profile.email || null,
          phone: values.profile.phone || null,
          address: values.profile.address || null,
          website: values.profile.website || null,
        },
        regional: values.regional,
        defaults: values.defaults,
      });
      toast.success("Organization settings saved");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update organization settings"));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Unable to load organization settings"
        description="Please check your connection or permissions and try again."
      />
    );
  }

  const allowWalkIns = watch("defaults.allowWalkIns");
  const allowAdvanceBookings = watch("defaults.allowAdvanceBookings");
  const autoMarkAbsentAfterCutoff = watch("defaults.autoMarkAbsentAfterCutoff");
  const defaultHalfDayEligible = watch("defaults.defaultHalfDayEligible");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Organization Settings</h2>
          <p className="text-sm text-muted-foreground">
            Tenant-wide profile, regional formats, and default operational policies inherited by all branches.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && <Badge variant="warning">Unsaved changes</Badge>}
          {!canEdit && <Badge variant="muted">Read-only</Badge>}
        </div>
      </div>

      {/* Business Profile */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Building2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Business Profile</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="org-name" className="text-xs font-medium text-foreground">
              Organization Name <span className="text-destructive">*</span>
            </label>
            <Input id="org-name" {...register("organization.name")} disabled={!canEdit || updateMutation.isPending} />
            {errors.organization?.name && (
              <p className="text-xs text-destructive">{errors.organization.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="org-displayName" className="text-xs font-medium text-foreground">
              Display Name
            </label>
            <Input id="org-displayName" {...register("profile.displayName")} disabled={!canEdit || updateMutation.isPending} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="org-email" className="text-xs font-medium text-foreground">
              Business Email
            </label>
            <Input id="org-email" type="email" {...register("profile.email")} disabled={!canEdit || updateMutation.isPending} />
            {errors.profile?.email && (
              <p className="text-xs text-destructive">{errors.profile.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="org-phone" className="text-xs font-medium text-foreground">
              Phone
            </label>
            <Input id="org-phone" {...register("profile.phone")} disabled={!canEdit || updateMutation.isPending} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor="org-address" className="text-xs font-medium text-foreground">
              Registered Address
            </label>
            <Input id="org-address" {...register("profile.address")} disabled={!canEdit || updateMutation.isPending} />
          </div>
        </div>
      </Card>

      {/* Regional Preferences */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Globe className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Regional Preferences</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="org-timezone" className="text-xs font-medium text-foreground">
              Default Timezone
            </label>
            <select
              id="org-timezone"
              {...register("regional.timezone")}
              disabled={!canEdit || updateMutation.isPending}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {getTimezoneOptions(data.regional.timezone).map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="org-currency" className="text-xs font-medium text-foreground">
              Currency
            </label>
            <select
              id="org-currency"
              {...register("regional.currency")}
              disabled={!canEdit || updateMutation.isPending}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {getCurrencyOptions(data.regional.currency).map((curr) => (
                <option key={curr} value={curr}>
                  {curr}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="org-locale" className="text-xs font-medium text-foreground">
              Locale
            </label>
            <select
              id="org-locale"
              {...register("regional.locale")}
              disabled={!canEdit || updateMutation.isPending}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {LOCALE_OPTIONS.map((loc) => (
                <option key={loc.value} value={loc.value}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="org-dateFormat" className="text-xs font-medium text-foreground">
              Date Format
            </label>
            <select
              id="org-dateFormat"
              {...register("regional.dateFormat")}
              disabled={!canEdit || updateMutation.isPending}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD-MM-YYYY">DD-MM-YYYY</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="org-timeFormat" className="text-xs font-medium text-foreground">
              Time Format
            </label>
            <select
              id="org-timeFormat"
              {...register("regional.timeFormat")}
              disabled={!canEdit || updateMutation.isPending}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="HH:mm">24-hour (HH:mm)</option>
              <option value="hh:mm A">12-hour (hh:mm A)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Operational Defaults */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Sliders className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Operational Defaults</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="org-buffer" className="text-xs font-medium text-foreground">
              Appointment Buffer (mins)
            </label>
            <Input id="org-buffer" type="number" {...register("defaults.appointmentBufferMinutes")} disabled={!canEdit || updateMutation.isPending} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="org-grace" className="text-xs font-medium text-foreground">
              Attendance Grace (mins)
            </label>
            <Input id="org-grace" type="number" {...register("defaults.attendanceGraceMinutes")} disabled={!canEdit || updateMutation.isPending} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="org-expense-threshold" className="text-xs font-medium text-foreground">
              Expense Approval Threshold
            </label>
            <Input id="org-expense-threshold" type="number" {...register("organization.expenseApprovalThreshold")} disabled={!canEdit || updateMutation.isPending} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="org-reminder-offset" className="text-xs font-medium text-foreground">
              Reminder Lead Time (mins)
            </label>
            <Input id="org-reminder-offset" type="number" min={0} max={10080} {...register("defaults.reminderDefaultOffsetMinutes", { valueAsNumber: true })} disabled={!canEdit || updateMutation.isPending} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="org-export-retention" className="text-xs font-medium text-foreground">
              Export Retention (hours)
            </label>
            <Input id="org-export-retention" type="number" min={1} max={720} {...register("defaults.exportRetentionHours", { valueAsNumber: true })} disabled={!canEdit || updateMutation.isPending} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Default Weekly Off Days
            </label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { dow: 0, label: "Sun" },
                { dow: 1, label: "Mon" },
                { dow: 2, label: "Tue" },
                { dow: 3, label: "Wed" },
                { dow: 4, label: "Thu" },
                { dow: 5, label: "Fri" },
                { dow: 6, label: "Sat" },
              ].map(({ dow, label }) => {
                const currentDays = watch("defaults.defaultWeeklyOffDays") ?? [0];
                const active = currentDays.includes(dow);
                return (
                  <Button
                    key={dow}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    disabled={!canEdit || updateMutation.isPending}
                    onClick={() => {
                      const next = active
                        ? currentDays.filter((d: number) => d !== dow)
                        : [...currentDays, dow].sort();
                      setValue("defaults.defaultWeeklyOffDays", next, { shouldDirty: true });
                    }}
                    className="h-8 px-2.5 text-xs"
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Allow Walk-in Bookings</p>
              <p className="text-xs text-muted-foreground">Default walk-in availability across branches</p>
            </div>
            <Switch
              checked={Boolean(allowWalkIns)}
              onCheckedChange={(v) => setValue("defaults.allowWalkIns", v, { shouldDirty: true })}
              disabled={!canEdit || updateMutation.isPending}
              aria-label="Allow Walk-in Bookings"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Allow Advance Bookings</p>
              <p className="text-xs text-muted-foreground">Default advance scheduling across branches</p>
            </div>
            <Switch
              checked={Boolean(allowAdvanceBookings)}
              onCheckedChange={(v) => setValue("defaults.allowAdvanceBookings", v, { shouldDirty: true })}
              disabled={!canEdit || updateMutation.isPending}
              aria-label="Allow Advance Bookings"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Half-Day Leave Eligibility</p>
              <p className="text-xs text-muted-foreground">Default half-day support for leave requests</p>
            </div>
            <Switch
              checked={Boolean(defaultHalfDayEligible)}
              onCheckedChange={(v) => setValue("defaults.defaultHalfDayEligible", v, { shouldDirty: true })}
              disabled={!canEdit || updateMutation.isPending}
              aria-label="Half-Day Leave Eligibility"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Auto-Mark Absent After Cutoff</p>
              <p className="text-xs text-muted-foreground">Applies only to scheduled working days</p>
            </div>
            <Switch
              checked={Boolean(autoMarkAbsentAfterCutoff)}
              onCheckedChange={(v) => setValue("defaults.autoMarkAbsentAfterCutoff", v, { shouldDirty: true })}
              disabled={!canEdit || updateMutation.isPending}
              aria-label="Auto-Mark Absent After Cutoff"
            />
          </div>
        </div>
      </Card>

      {canEdit && (
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={!isDirty || updateMutation.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button type="submit" disabled={!isDirty || updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save Organization Settings"}
          </Button>
        </div>
      )}
    </form>
  );
}
