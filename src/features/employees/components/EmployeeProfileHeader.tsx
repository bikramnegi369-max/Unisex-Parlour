"use client";

import React from "react";
import type { Employee } from "../types/employee.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, Phone, Mail, UserCheck } from "lucide-react";

interface EmployeeProfileHeaderProps {
  employee: Employee;
  branchNames: string;
  canEdit: boolean;
  canDelete: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
}

export function EmployeeProfileHeader({
  employee,
  branchNames,
  canEdit,
  canDelete,
  onBack,
  onEdit,
  onDeactivate,
  onReactivate,
}: EmployeeProfileHeaderProps) {
  const fullName = `${employee.firstName} ${employee.lastName}`.trim();
  const isActive = employee.status === "active";

  return (
    <div className="space-y-6">
      {/* Header with back trigger and primary actions */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to Directory
        </Button>
        
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              onClick={onEdit}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <Edit size={14} />
              Edit Profile
            </Button>
          )}
          {canDelete && isActive && (
            <Button
              variant="destructive"
              onClick={onDeactivate}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={14} />
              Deactivate
            </Button>
          )}
          {canEdit && !isActive && (
            <Button
              variant="outline"
              onClick={onReactivate}
              className="flex items-center gap-1.5 cursor-pointer border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-500 dark:hover:bg-emerald-500/20"
            >
              <UserCheck size={14} />
              Reactivate
            </Button>
          )}
        </div>
      </div>

      {/* Identity Summary Card */}
      <div className="p-6 bg-card border border-border/80 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold shrink-0">
            {employee.firstName.charAt(0).toUpperCase()}
            {employee.lastName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-foreground">{fullName}</h2>
              <Badge variant={isActive ? "success" : "muted"}>
                <span className="capitalize">{employee.status}</span>
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground mt-1.5">
              Role: <span className="font-semibold text-primary">{employee.role}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Branches: <span className="font-medium text-foreground">{branchNames || "—"}</span>
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {employee.phone && (
            <a
              href={`tel:${employee.phone}`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
            >
              <Phone size={14} className="mr-2" />
              Call
            </a>
          )}
          {employee.email && (
            <a
              href={`mailto:${employee.email}`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
            >
              <Mail size={14} className="mr-2" />
              Email
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
