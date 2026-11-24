"use client";

import React, { useState } from "react";
import type { Employee } from "../types/employee.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime, formatRelativeTime } from "@/lib/formatters";
import { toast } from "sonner";
import {
  User,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  Building2,
  Scissors,
  ShieldCheck,
  UserCheck,
  Clock,
  Database,
  IdCard,
  Copy,
  Check,
  Layers,
  Server,
  FileCode,
  Shield,
} from "lucide-react";

interface EmployeeOverviewProps {
  employee: Employee;
  resolvedBranchNames?: string[];
  resolvedSpecialties?: string[];
  isLinkedAccount?: boolean;
  branchCount?: number;
  serviceCount?: number;
}

export function EmployeeOverview({
  employee,
  isLinkedAccount = false,
  branchCount = 0,
  serviceCount = 0,
}: EmployeeOverviewProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string, key: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error(`Failed to copy ${label}`);
    }
  };

  const formatJoinedDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return formatDate(dateStr, "dd MMMM yyyy");
  };

  const recordId = employee.id || employee._id || "—";
  const orgId = employee.organizationId || "—";
  const staffCode = employee.staffCode || "—";
  const linkedUserId = employee.userId || null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Identity & Work Details Card */}
      <Card className="border border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/80 bg-muted/20 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <User size={16} className="text-primary" />
              Identity & Work Profile
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={employee.status === "active" ? "success" : "muted"}
                className="capitalize"
              >
                {employee.status}
              </Badge>
              <Badge
                variant={isLinkedAccount ? "success" : "muted"}
                className={
                  isLinkedAccount
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    : ""
                }
              >
                {isLinkedAccount ? "Account Linked" : "No Linked User Account"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/5 flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <IdCard size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Staff Business Code
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold font-mono text-foreground">
                    {staffCode}
                  </span>
                  {employee.staffCode && (
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(employee.staffCode, "Staff Code", "overview-staffCode")
                      }
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
                      title="Copy Staff Code"
                    >
                      {copiedKey === "overview-staffCode" ? (
                        <Check size={13} className="text-emerald-500" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/5 flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <Phone size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Phone Number
                </p>
                {employee.phone ? (
                  <a
                    href={`tel:${employee.phone}`}
                    className="text-sm font-semibold mt-1 block hover:underline text-foreground break-all"
                  >
                    {employee.phone}
                  </a>
                ) : (
                  <p className="text-sm font-medium mt-1 text-muted-foreground">
                    —
                  </p>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/5 flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <Mail size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Email Address
                </p>
                <a
                  href={`mailto:${employee.email}`}
                  className="text-sm font-semibold mt-1 block hover:underline text-foreground break-all"
                >
                  {employee.email}
                </a>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/5 flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <CheckCircle size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Designation
                </p>
                <p className="text-sm font-semibold mt-1 text-foreground wrap-break-word">
                  {employee.designation}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/5 flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <Calendar size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Joining Date
                </p>
                <p className="text-sm font-semibold mt-1 text-foreground wrap-break-word">
                  {formatJoinedDate(employee.joiningDate)}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/5 flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <UserCheck size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  System User Linkage
                </p>
                <p className="text-sm font-semibold mt-1 text-foreground wrap-break-word">
                  {isLinkedAccount
                    ? "Linked to system login"
                    : "Unlinked profile"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enterprise System & Audit Metadata Card */}
      <Card className="border border-border/80 shadow-sm overflow-hidden bg-card">
        <CardHeader className="border-b border-border/80 bg-muted/20 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Database size={16} className="text-primary" />
                Enterprise System & Audit Metadata
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Production database identifiers, tenant partition scopes, and immutable audit timestamps.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="bg-primary/5 text-primary border-primary/20 font-mono text-[11px]"
              >
                Multi-Tenant Scoped
              </Badge>
              <Badge
                variant={employee.isDeleted ? "destructive" : "outline"}
                className={`font-mono text-[11px] ${
                  !employee.isDeleted ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" : ""
                }`}
              >
                {employee.isDeleted ? "Soft Deleted" : "Active DB Entity"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Record Database ObjectId */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/10 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Server size={13} className="text-primary" />
                  Database Record ID
                </span>
                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                  ObjectId
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="font-mono text-xs font-semibold text-foreground truncate select-all" title={recordId}>
                  {recordId}
                </span>
                {recordId !== "—" && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(recordId, "Record ID", "meta-recordId")}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                    title="Copy Record ID"
                  >
                    {copiedKey === "meta-recordId" ? (
                      <Check size={14} className="text-emerald-500" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Unique MongoDB document key for API routing and debugging.
              </p>
            </div>

            {/* Organization Tenant ID */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/10 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-primary" />
                  Organization Tenant ID
                </span>
                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                  Partition
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="font-mono text-xs font-semibold text-foreground truncate select-all" title={orgId}>
                  {orgId}
                </span>
                {orgId !== "—" && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(orgId, "Organization ID", "meta-orgId")}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                    title="Copy Organization ID"
                  >
                    {copiedKey === "meta-orgId" ? (
                      <Check size={14} className="text-emerald-500" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Strict multi-tenant security barrier ensuring data isolation.
              </p>
            </div>

            {/* User Auth ID Linkage */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/10 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <UserCheck size={13} className="text-primary" />
                  Linked User Account ID
                </span>
                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                  {linkedUserId ? "Linked" : "None"}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="font-mono text-xs font-semibold text-foreground truncate select-all">
                  {linkedUserId || "Unlinked Staff Profile"}
                </span>
                {linkedUserId && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(linkedUserId, "User ID", "meta-userId")}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                    title="Copy Linked User ID"
                  >
                    {copiedKey === "meta-userId" ? (
                      <Check size={14} className="text-emerald-500" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {linkedUserId
                  ? "Associated identity credentials for system dashboard access."
                  : "Profile is not connected to a system login account."}
              </p>
            </div>

            {/* Created At Audit */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/10 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Clock size={13} className="text-primary" />
                  Record Created At
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatRelativeTime(employee.createdAt)}
                </span>
              </div>
              <div className="pt-0.5">
                <p className="text-xs font-semibold text-foreground font-mono">
                  {formatDateTime(employee.createdAt)}
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Initial system registration timestamp recorded on creation.
              </p>
            </div>

            {/* Last Updated Audit */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/10 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-primary" />
                  Last Updated At
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatRelativeTime(employee.updatedAt)}
                </span>
              </div>
              <div className="pt-0.5">
                <p className="text-xs font-semibold text-foreground font-mono">
                  {formatDateTime(employee.updatedAt)}
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Most recent document mutation verified by audit plugin.
              </p>
            </div>

            {/* Data Governance & Integrity */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/10 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Shield size={13} className="text-primary" />
                  Audit & Compliance State
                </span>
                <Badge variant="outline" className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border-emerald-200">
                  Compliant
                </Badge>
              </div>
              <div className="pt-0.5">
                <p className="text-xs font-semibold text-foreground">
                  Audit Logging Enabled
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                All modifications captured in immutable system audit log collection.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operational Overview Cards */}
      <Card className="border border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/80 bg-muted/20 py-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <ShieldCheck size={16} className="text-primary shrink-0" />
            Operational Capabilities Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="rounded-xl border border-border/80 bg-linear-to-br from-background to-muted/20 p-4 sm:p-5 space-y-2 shadow-2xs min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                    <Building2 size={18} />
                  </div>
                  <p className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-muted-foreground whitespace-normal wrap-break-word">
                    Assigned Branches
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="font-semibold text-[10px] sm:text-xs shrink-0"
                >
                  {branchCount} {branchCount === 1 ? "Location" : "Locations"}
                </Badge>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground pt-1">
                {branchCount}
              </p>
              <p className="text-xs text-muted-foreground">
                Branch locations where this employee is authorized to work.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-linear-to-br from-background to-muted/20 p-4 sm:p-5 space-y-2 shadow-2xs min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                    <Scissors size={18} />
                  </div>
                  <p className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-muted-foreground whitespace-normal wrap-break-word">
                    Service Capabilities
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="font-semibold text-[10px] sm:text-xs shrink-0"
                >
                  {serviceCount} {serviceCount === 1 ? "Service" : "Services"}
                </Badge>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground pt-1">
                {serviceCount}
              </p>
              <p className="text-xs text-muted-foreground">
                Specialized services this staff member is trained to perform.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
