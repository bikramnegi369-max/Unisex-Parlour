"use client";

import React from "react";
import type { Employee } from "../types/employee.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, Phone, Mail, UserCheck, Calendar } from "lucide-react";
import { formatDate } from "@/lib/formatters";

interface EmployeeProfileHeaderProps {
  employee: Employee;
  branchNames?: string;
  canEdit: boolean;
  canDelete: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
}

export function EmployeeProfileHeader({
  employee,
  canEdit,
  canDelete,
  onBack,
  onEdit,
  onDeactivate,
  onReactivate,
}: EmployeeProfileHeaderProps) {
  const fullName = employee.name || "";
  const isActive = employee.status === "active";
  const nameParts = fullName.trim().split(/\s+/);
  const initials = nameParts.map((part) => part.charAt(0).toUpperCase()).slice(0, 2).join("");

  return (
    <div className="space-y-6">
      {/* Header top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground font-medium"
        >
          <ArrowLeft size={16} />
          Back to Directory
        </Button>

        <div className="flex items-center gap-2.5">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="flex items-center gap-1.5 cursor-pointer font-semibold shadow-xs"
            >
              <Edit size={14} />
              Edit Profile
            </Button>
          )}
          {canDelete && isActive && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDeactivate}
              className="flex items-center gap-1.5 cursor-pointer font-semibold shadow-xs"
            >
              <Trash2 size={14} />
              Deactivate
            </Button>
          )}
          {canEdit && !isActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReactivate}
              className="flex items-center gap-1.5 cursor-pointer border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 font-semibold shadow-xs"
            >
              <UserCheck size={14} />
              Reactivate Employee
            </Button>
          )}
        </div>
      </div>

      {/* Identity Summary Card */}
      <div className="p-6 bg-gradient-to-r from-card via-card to-primary/[0.03] border border-border/80 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-5 min-w-0">
          <div className="relative shrink-0">
            {employee.avatarUrl ? (
              <img
                src={employee.avatarUrl}
                alt={fullName}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/20 shadow-md"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold ring-2 ring-primary/20 shadow-inner">
                {initials || "EM"}
              </div>
            )}
            <span
              className={`absolute bottom-0 right-0 h-4 w-4 rounded-full ring-2 ring-card ${
                isActive ? "bg-emerald-500" : "bg-muted-foreground/50"
              }`}
            />
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{fullName}</h1>
              <Badge variant={isActive ? "success" : "muted"} className="capitalize px-2.5 py-0.5 text-xs font-semibold">
                {employee.status}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-0.5">
              <span className="font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                {employee.designation}
              </span>
              {employee.joiningDate && (
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-muted-foreground/70" />
                  Joined {formatDate(employee.joiningDate, "MMM yyyy")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {employee.phone && (
            <a
              href={`tel:${employee.phone}`}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-background/80 hover:bg-muted px-4 text-xs font-semibold shadow-xs transition-colors"
            >
              <Phone size={14} className="mr-2 text-primary" />
              Call Direct
            </a>
          )}
          {employee.email && (
            <a
              href={`mailto:${employee.email}`}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-background/80 hover:bg-muted px-4 text-xs font-semibold shadow-xs transition-colors"
            >
              <Mail size={14} className="mr-2 text-primary" />
              Send Email
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
