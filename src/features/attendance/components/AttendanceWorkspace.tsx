"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, Fingerprint, RefreshCw, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBranchContext } from "@/hooks/useBranchContext";
import { hasPermission } from "@/lib/permissions";
import {
  useAdjustAttendance,
  useAttendanceDetail,
  useAttendanceProviderStatus,
  useAttendanceRegister,
  useBranchAttendanceConflicts,
  useIngestSimulatorEvents,
  useLeaveAppointmentConflicts,
  useRecordLeaveException,
  useResolveBranchAttendanceConflict,
  useResolveLeaveAppointmentConflict,
} from "../hooks/useAttendance";
import type { AttendanceRegisterStatus, AttendanceStatus } from "../api/attendance.api";
import StaffDeviceMappingTab from "./StaffDeviceMappingTab";

type Panel = "register" | "conflicts" | "providers" | "mappings";
const attendanceStatuses: AttendanceStatus[] = ["present", "late", "early_departure", "incomplete"];

function branchToday(timeZone?: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function displayStatus(status: AttendanceRegisterStatus) {
  return status === "missing_punch" ? "No punch recorded" :
    status === "not_started" ? "Not started" : status.replaceAll("_", " ");
}

function statusStyle(status: AttendanceRegisterStatus) {
  if (status === "missing_punch") return "border-amber-300 bg-amber-50 text-amber-800";
  if (status === "present") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (status === "late" || status === "early_departure") return "border-orange-300 bg-orange-50 text-orange-800";
  if (status === "not_started") return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-border bg-muted text-foreground";
}

export default function AttendanceWorkspace() {
  const { user } = useAuth();
  const { currentBranch, currentBranchId, isAllBranchesSelected } = useBranchContext();
  const canAdjust = hasPermission(user, "attendance.adjust");
  const canPunch = hasPermission(user, "attendance.punch");
  const [dateSelection, setDateSelection] = useState<{ branchId: string | null; date: string } | null>(null);
  const date = dateSelection?.branchId === currentBranchId
    ? dateSelection.date
    : branchToday(currentBranch?.timezone);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [panel, setPanel] = useState<Panel>("register");
  const [staffId, setStaffId] = useState<string | null>(null);
  const [adjustStatus, setAdjustStatus] = useState<AttendanceStatus>("present");
  const [adjustReason, setAdjustReason] = useState("");
  const [conflictReason, setConflictReason] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveDecision, setLeaveDecision] = useState<"worked" | "absent" | "half-day">("worked");
  const [eventEmployeeCode, setEventEmployeeCode] = useState("");
  const [eventDeviceId, setEventDeviceId] = useState("");
  const [eventId, setEventId] = useState("");

  const register = useAttendanceRegister(date, search, statusFilter);
  const detail = useAttendanceDetail(staffId, date);
  const branchConflicts = useBranchAttendanceConflicts();
  const appointmentConflicts = useLeaveAppointmentConflicts(date);
  const providerStatus = useAttendanceProviderStatus();
  const adjustMutation = useAdjustAttendance();
  const resolveBranchMutation = useResolveBranchAttendanceConflict();
  const resolveAppointmentMutation = useResolveLeaveAppointmentConflict();
  const leaveExceptionMutation = useRecordLeaveException();
  const simulatorMutation = useIngestSimulatorEvents();

  const rows = useMemo(() => register.data?.data || [], [register.data?.data]);
  const registerSummary = useMemo(() => ({
    total: rows.length,
    recorded: rows.filter((row) => row.record !== null).length,
    missing: rows.filter((row) => row.status === "missing_punch").length,
    unresolved: rows.filter((row) => row.record && !row.record.isReconciled).length,
  }), [rows]);

  if (!currentBranchId || isAllBranchesSelected) {
    return (
      <EmptyState
        icon={Fingerprint}
        title="Select a branch to view attendance"
        description="Attendance records are branch-scoped. Choose an authorized branch from the branch switcher to continue."
      />
    );
  }

  const submitAdjustment = () => {
    if (!staffId || adjustReason.trim().length < 3) return;
    adjustMutation.mutate(
      { staffId, date, status: adjustStatus, reason: adjustReason.trim() },
      {
        onSuccess: () => {
          setAdjustReason("");
          toast.success("Attendance reconciliation saved with its reason.");
        },
        onError: (error) => toast.error(error.message || "Attendance adjustment failed."),
      },
    );
  };

  const submitLeaveException = (leaveId: string) => {
    if (leaveReason.trim().length < 3) return;
    leaveExceptionMutation.mutate(
      { leaveId, date, decision: leaveDecision, reason: leaveReason.trim() },
      {
        onSuccess: () => {
          setLeaveReason("");
          toast.success("Date-specific leave exception recorded; approved leave remains unchanged.");
        },
        onError: (error) => toast.error(error.message || "Could not record leave exception."),
      },
    );
  };

  const submitSimulatorEvent = () => {
    if (!eventEmployeeCode.trim() || !eventDeviceId.trim()) return;
    simulatorMutation.mutate(
      {
        checkpoint: `manual-${Date.now()}`,
        streamIdentifier: "manual_import",
        events: [{
          employeeCode: eventEmployeeCode.trim(),
          deviceId: eventDeviceId.trim(),
          externalEventId: eventId.trim() || undefined,
          punchType: "in",
          punchAt: new Date().toISOString(),
          deviceSource: "simulator",
        }],
      },
      {
        onSuccess: () => {
          toast.success("Simulator event submitted.");
          setEventId("");
        },
        onError: (error) => toast.error(error.message || "Simulator ingestion failed."),
      },
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            {currentBranch?.name || "Selected branch"} · {register.data?.timezone || currentBranch?.timezone || "Branch timezone"}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs font-medium text-muted-foreground">
            Attendance date
            <Input type="date" value={date} onChange={(event) => setDateSelection({ branchId: currentBranchId, date: event.target.value })} />
          </label>
          <div className="text-xs text-muted-foreground">
            <span className="block font-medium">Branch operating hours</span>
            <span>
              {register.data?.operatingHours
                ? "Available from branch settings; no employee shifts or grace rules are inferred."
                : "Not configured"}
            </span>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          A chronological in-punch followed by an out-punch is required to record present. Incomplete or missing punches are not
          present; manual corrections require a reason and are audited. Branch opening hours do not determine individual late
          arrivals because employee shift schedules are not configured.
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 border-b pb-3" role="tablist" aria-label="Attendance sections">
        {([
          ["register", "Daily register"],
          ["conflicts", "Reconciliation"],
          ["providers", "Provider sync"],
          ["mappings", "Device ID Mappings"],
        ] as const).map(([key, label]) => (
          <Button key={key} variant={panel === key ? "default" : "outline"} onClick={() => setPanel(key)} role="tab" aria-selected={panel === key}>
            {label}
          </Button>
        ))}
      </div>

      {panel === "register" && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Staff", registerSummary.total],
                ["Recorded", registerSummary.recorded],
                ["No punch", registerSummary.missing],
                ["Needs review", registerSummary.unresolved],
              ].map(([label, count]) => (
                <Card key={label}><CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-semibold">{count}</p>
                </CardContent></Card>
              ))}
            </div>
            <Card>
              <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Staff attendance register</CardTitle>
                <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_180px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Search staff" value={search} onChange={(event) => setSearch(event.target.value)} />
                  </div>
                  <Select aria-label="Filter by attendance status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="all">All statuses</option>
                    <option value="missing_punch">No punch recorded</option>
                    {attendanceStatuses.map((status) => <option key={status} value={status}>{displayStatus(status)}</option>)}
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {register.isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading branch attendance…</p> :
                  register.isError ? <ErrorState className="my-4" description={register.error.message} retryAction={{ label: "Retry", onClick: () => void register.refetch(), isLoading: register.isRefetching }} /> :
                    rows.length === 0 ? <EmptyState className="my-4" icon={UserRound} title="No staff records" description="No active staff are assigned to this branch or match the selected filters." /> :
                      <div className="divide-y">
                        {rows.map((row) => (
                          <button
                            key={row.staff._id}
                            type="button"
                            onClick={() => setStaffId(row.staff._id)}
                            className={`flex w-full flex-col gap-2 px-5 py-4 text-left transition hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between ${staffId === row.staff._id ? "bg-muted/50" : ""}`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{row.staff.name}</span>
                              <span className="text-xs text-muted-foreground">{row.staff.staffCode} · {row.staff.designation}</span>
                            </span>
                            <span className="flex items-center gap-3">
                              <Badge variant="outline" className={`capitalize ${statusStyle(row.status)}`}>{displayStatus(row.status)}</Badge>
                              <span className="text-xs text-muted-foreground">{row.punches.length} punches</span>
                            </span>
                          </button>
                        ))}
                      </div>}
              </CardContent>
            </Card>
          </section>

          <section>
            {!staffId ? <EmptyState className="mt-0" icon={UserRound} title="Select a staff member" description="View daily punches, approved leave, adjustments, and reconciliation history." /> :
              detail.isLoading ? <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading staff attendance…</CardContent></Card> :
                detail.isError ? <ErrorState className="mt-0" description={detail.error.message} retryAction={{ label: "Retry", onClick: () => void detail.refetch(), isLoading: detail.isRefetching }} /> :
                  detail.data && <div className="space-y-4">
                    <Card>
                      <CardHeader><CardTitle className="text-base">{detail.data.staff.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{detail.data.staff.staffCode} · {displayStatus(detail.data.status)}</p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h3 className="mb-2 text-sm font-semibold">Punch history</h3>
                          {detail.data.punches.length === 0 ? <p className="text-sm text-amber-700">No punch evidence is recorded. This is not a confirmed absence.</p> :
                            <ul className="space-y-2">{detail.data.punches.map((punch) => <li key={punch._id} className="flex justify-between gap-2 text-sm">
                              <span className="capitalize">{punch.punchType} · {punch.provider}</span>
                              <time className="text-muted-foreground">{new Date(punch.punchAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: detail.data?.timezone })}</time>
                            </li>)}</ul>}
                        </div>
                        {detail.data.record?.adjustmentHistory?.length ? <div>
                          <h3 className="mb-2 text-sm font-semibold">Reconciliation history</h3>
                          {detail.data.record.adjustmentHistory.map((item, index) => <p key={`${item.changedAt}-${index}`} className="border-l-2 pl-3 py-1 text-xs">
                            {item.previousStatus || "unrecorded"} → {item.newStatus} · {item.reason}
                          </p>)}
                        </div> : null}
                        {detail.data.approvedLeaves.map((leave) => <div key={leave._id} className="rounded-lg border p-3">
                          <p className="text-sm font-medium">Approved leave · {leave.leaveCode} ({leave.leaveType})</p>
                          <p className="mb-2 text-xs text-muted-foreground">Leave approval is preserved. Record an exception for this date only.</p>
                          {detail.data.exceptions.some((item) => item.leaveId === leave._id) ? <Badge variant="outline">Date exception recorded</Badge> :
                            canAdjust && <div className="space-y-2">
                              <Select value={leaveDecision} onChange={(event) => setLeaveDecision(event.target.value as typeof leaveDecision)}>
                                <option value="worked">Worked</option><option value="absent">Did not work</option><option value="half-day">Half-day</option>
                              </Select>
                              <Textarea value={leaveReason} onChange={(event) => setLeaveReason(event.target.value)} placeholder="Required reason for this date-level exception" />
                              <Button size="sm" disabled={leaveReason.trim().length < 3 || leaveExceptionMutation.isPending} onClick={() => submitLeaveException(leave._id)}>Save date exception</Button>
                            </div>}
                        </div>)}
                        {canAdjust && <div className="border-t pt-4">
                          <h3 className="mb-2 text-sm font-semibold">Manual adjustment / missing-punch reconciliation</h3>
                          <p className="mb-3 text-xs text-muted-foreground">A reason is required and stored with the adjustment. No absence is inferred automatically.</p>
                          <div className="space-y-2">
                            <Select value={adjustStatus} onChange={(event) => setAdjustStatus(event.target.value as AttendanceStatus)}>
                              {attendanceStatuses.map((status) => <option key={status} value={status}>{displayStatus(status)}</option>)}
                            </Select>
                            <Textarea value={adjustReason} onChange={(event) => setAdjustReason(event.target.value)} placeholder="Explain the evidence and reason for this adjustment" />
                            <Button disabled={adjustReason.trim().length < 3 || adjustMutation.isPending} onClick={submitAdjustment}>
                              {adjustMutation.isPending ? "Saving…" : "Save adjustment"}
                            </Button>
                          </div>
                        </div>}
                      </CardContent>
                    </Card>
                  </div>}
          </section>
        </div>
      )}

      {panel === "conflicts" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Cross-branch attendance conflicts</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {branchConflicts.isLoading ? <p className="text-sm text-muted-foreground">Loading conflicts…</p> :
                branchConflicts.isError ? <ErrorState className="mt-0" description={branchConflicts.error.message} retryAction={{ label: "Retry", onClick: () => void branchConflicts.refetch() }} /> :
                  (branchConflicts.data || []).length === 0 ? <p className="text-sm text-muted-foreground">No pending cross-branch conflicts.</p> :
                    (branchConflicts.data || []).map((conflict) => <div key={conflict._id} className="rounded-lg border p-3">
                      <p className="font-medium">{typeof conflict.staffId === "string" ? conflict.staffId : conflict.staffId.name} · {conflict.date.slice(0, 10)}</p>
                      <p className="my-1 text-xs text-muted-foreground">{conflict.branchesInvolved.map(({ branchId: itemBranch }) => typeof itemBranch === "string" ? itemBranch : itemBranch.name).join(" / ")}</p>
                      {canAdjust && <div className="space-y-2">
                        <Textarea aria-label="Conflict resolution reason" value={conflictReason} onChange={(event) => setConflictReason(event.target.value)} placeholder="Reason to retain the original branch claim" />
                        <Button size="sm" disabled={conflictReason.trim().length < 3 || resolveBranchMutation.isPending} onClick={() => resolveBranchMutation.mutate(
                          { conflictId: conflict._id, reason: conflictReason.trim() },
                          { onSuccess: () => { setConflictReason(""); toast.success("Conflict resolved; original branch claim retained."); }, onError: (error) => toast.error(error.message) },
                        )}>Retain original claim</Button>
                      </div>}
                    </div>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Approved leave and appointment conflicts</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {appointmentConflicts.isLoading ? <p className="text-sm text-muted-foreground">Checking approved leave against appointments…</p> :
                appointmentConflicts.isError ? <ErrorState className="mt-0" description={appointmentConflicts.error.message} retryAction={{ label: "Retry", onClick: () => void appointmentConflicts.refetch() }} /> :
                  (appointmentConflicts.data?.data || []).length === 0 ? <p className="text-sm text-muted-foreground">No active appointment conflicts for this date.</p> :
                    (appointmentConflicts.data?.data || []).map((conflict) => <div key={`${conflict.leaveId}-${conflict.appointmentId}`} className="rounded-lg border p-3">
                      <p className="font-medium">{conflict.appointmentCode} · {conflict.leaveCode}</p>
                      <p className="my-1 text-xs text-muted-foreground">Appointment is not changed by this workflow. Resolution retains it and requires a reason.</p>
                      {conflict.status === "resolved" ? <Badge variant="outline">Retained · resolved</Badge> : canAdjust && <div className="space-y-2">
                        <Textarea aria-label="Appointment conflict reason" value={conflictReason} onChange={(event) => setConflictReason(event.target.value)} placeholder="Reason to retain this appointment alongside leave" />
                        <Button size="sm" disabled={conflictReason.trim().length < 3 || resolveAppointmentMutation.isPending} onClick={() => resolveAppointmentMutation.mutate(
                          { leaveId: conflict.leaveId, appointmentId: conflict.appointmentId, date, reason: conflictReason.trim() },
                          { onSuccess: () => { setConflictReason(""); toast.success("Appointment retained; leave and appointment were not changed."); }, onError: (error) => toast.error(error.message) },
                        )}>Retain appointment</Button>
                      </div>}
                    </div>)}
            </CardContent>
          </Card>
        </div>
      )}

      {panel === "providers" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="h-4 w-4" />Provider configuration and sync status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {providerStatus.isLoading ? <p className="text-sm text-muted-foreground">Loading provider status…</p> :
                providerStatus.isError ? <ErrorState className="mt-0" description={providerStatus.error.message} retryAction={{ label: "Retry", onClick: () => void providerStatus.refetch() }} /> :
                  <>
                    <p className="text-xs text-muted-foreground">Secrets and credential values are intentionally never returned to the frontend.</p>
                    {(providerStatus.data?.configurations || []).length === 0 ? <p className="text-sm text-muted-foreground">No provider configuration exists for this branch.</p> :
                      providerStatus.data?.configurations.map((configuration) => <div key={configuration.providerName} className="rounded-lg border p-3">
                        <div className="flex justify-between"><span className="font-medium">{configuration.providerName}</span><Badge variant="outline">{configuration.isActive ? "Active" : "Disabled"}</Badge></div>
                        <p className="mt-1 text-xs text-muted-foreground">{configuration.integrationMethod || "Method not configured"} · {configuration.syncStatus}</p>
                      </div>)}
                    {(providerStatus.data?.syncStates || []).map((sync) => <div key={sync.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex justify-between"><span>{sync.provider} · {sync.deviceId || "device"}</span><Badge variant="outline">{sync.outcome}</Badge></div>
                      <p className="mt-1 text-xs text-muted-foreground">{sync.processedCount}/{sync.eventCount} processed · checkpoint {sync.lastSuccessfulCheckpoint || "not completed"}</p>
                      {sync.hasError && <p className="mt-1 text-xs text-destructive">This sync attempt reported an error. Retry from the configured provider.</p>}
                    </div>)}
                    {providerStatus.data?.supportedProviders.includes("eTimeOffice") && <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">
                      eTimeOffice is not connected: official API documentation and authorized account access are required. No vendor behavior is assumed.
                    </p>}
                  </>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Simulator ingestion</CardTitle>
              <p className="text-sm text-muted-foreground">Exercises the authenticated backend ingestion route; this is not a real biometric-device connection.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {!canPunch ? <p className="text-sm text-muted-foreground">Your account does not have permission to submit provider punches.</p> :
                !providerStatus.data?.configurations.some((configuration) => configuration.providerName === "simulator" && configuration.isActive) ?
                  <p className="text-sm text-amber-800">An active simulator provider configuration and server-side device/staff mapping are required.</p> :
                    <>
                      <Input aria-label="Mapped employee code" value={eventEmployeeCode} onChange={(event) => setEventEmployeeCode(event.target.value)} placeholder="Mapped external employee code" />
                      <Input aria-label="Device ID" value={eventDeviceId} onChange={(event) => setEventDeviceId(event.target.value)} placeholder="Configured device ID" />
                      <Input aria-label="External event ID" value={eventId} onChange={(event) => setEventId(event.target.value)} placeholder="Stable event ID (optional)" />
                      <Button disabled={!eventEmployeeCode.trim() || !eventDeviceId.trim() || simulatorMutation.isPending} onClick={submitSimulatorEvent}>
                        {simulatorMutation.isPending ? <RefreshCw className="animate-spin" /> : <Fingerprint />} Submit simulator event
                      </Button>
                    </>}
            </CardContent>
          </Card>
        </div>
      )}

      {panel === "mappings" && <StaffDeviceMappingTab />}

      {!canAdjust && panel !== "providers" && <p className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="h-4 w-4" />Read-only access. Reconciliation actions require attendance.adjust.</p>}
    </div>
  );
}
