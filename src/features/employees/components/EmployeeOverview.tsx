"use client";

import React from "react";
import type { Employee } from "../types/employee.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/formatters";
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
  const formatJoinedDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return formatDate(dateStr, "dd MMMM yyyy");
  };

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
              <Badge variant={employee.status === "active" ? "success" : "muted"} className="capitalize">
                {employee.status}
              </Badge>
              <Badge
                variant={isLinkedAccount ? "success" : "muted"}
                className={isLinkedAccount ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : ""}
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
                <Phone size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Phone Number
                </p>
                {employee.phone ? (
                  <a href={`tel:${employee.phone}`} className="text-sm font-semibold mt-1 block hover:underline text-foreground break-all">
                    {employee.phone}
                  </a>
                ) : (
                  <p className="text-sm font-medium mt-1 text-muted-foreground">—</p>
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
                <a href={`mailto:${employee.email}`} className="text-sm font-semibold mt-1 block hover:underline text-foreground break-all">
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
                <p className="text-sm font-semibold mt-1 text-foreground break-words">
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
                <p className="text-sm font-semibold mt-1 text-foreground break-words">
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
                <p className="text-sm font-semibold mt-1 text-foreground break-words">
                  {isLinkedAccount ? "Linked to system login" : "Unlinked profile"}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/5 flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <Clock size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Last Updated
                </p>
                <p className="text-sm font-semibold mt-1 text-foreground break-words">
                  {formatJoinedDate(employee.updatedAt)}
                </p>
              </div>
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
            <div className="rounded-xl border border-border/80 bg-gradient-to-br from-background to-muted/20 p-4 sm:p-5 space-y-2 shadow-2xs min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                    <Building2 size={18} />
                  </div>
                  <p className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-muted-foreground whitespace-normal break-words">Assigned Branches</p>
                </div>
                <Badge variant="outline" className="font-semibold text-[10px] sm:text-xs shrink-0">
                  {branchCount} {branchCount === 1 ? "Location" : "Locations"}
                </Badge>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground pt-1">{branchCount}</p>
              <p className="text-xs text-muted-foreground">Branch locations where this employee is authorized to work.</p>
            </div>

            <div className="rounded-xl border border-border/80 bg-gradient-to-br from-background to-muted/20 p-4 sm:p-5 space-y-2 shadow-2xs min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                    <Scissors size={18} />
                  </div>
                  <p className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-muted-foreground whitespace-normal break-words">Service Capabilities</p>
                </div>
                <Badge variant="outline" className="font-semibold text-[10px] sm:text-xs shrink-0">
                  {serviceCount} {serviceCount === 1 ? "Service" : "Services"}
                </Badge>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground pt-1">{serviceCount}</p>
              <p className="text-xs text-muted-foreground">Specialized services this staff member is trained to perform.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
