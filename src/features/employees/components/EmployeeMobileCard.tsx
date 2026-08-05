"use client";

import React from "react";
import type { Employee } from "../types/employee.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Trash2, UserCheck } from "lucide-react";

interface EmployeeMobileCardProps {
  employee: Employee;
  canEdit: boolean;
  canDelete: boolean;
  onView: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onReactivate: (employee: Employee) => void;
  getBranchName: (id: string) => string;
}

export function EmployeeMobileCard({
  employee,
  canEdit,
  canDelete,
  onView,
  onEdit,
  onDelete,
  onReactivate,
  getBranchName,
}: EmployeeMobileCardProps) {
  const fullName = `${employee.firstName} ${employee.lastName}`.trim();
  
  return (
    <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
            {employee.firstName.charAt(0).toUpperCase()}
            {employee.lastName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-semibold text-foreground text-sm">{fullName}</h4>
              <Badge variant={employee.status === "active" ? "success" : "muted"}>
                <span className="capitalize">{employee.status}</span>
              </Badge>
            </div>
            <span className="text-[10px] bg-primary/5 text-primary border border-primary/10 px-1.5 py-0.5 rounded font-semibold mt-1 inline-block">
              {employee.role}
            </span>
          </div>
        </div>

        {/* Mobile Actions with touch targets */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            className="h-10 w-10 flex items-center justify-center cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onView(employee);
            }}
            aria-label={`View details of ${fullName}`}
          >
            <Eye size={15} />
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              className="h-10 w-10 flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(employee);
              }}
              aria-label={`Edit profile of ${fullName}`}
            >
              <Edit size={15} />
            </Button>
          )}
          {canDelete && employee.status === "active" && (
            <Button
              variant="destructive"
              className="h-10 w-10 bg-destructive/10 text-destructive border-transparent flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(employee);
              }}
              aria-label={`Deactivate profile of ${fullName}`}
            >
              <Trash2 size={15} />
            </Button>
          )}
          {canEdit && employee.status !== "active" && (
            <Button
              variant="outline"
              className="h-10 w-10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-500 dark:hover:bg-emerald-500/20 flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onReactivate(employee);
              }}
              aria-label={`Reactivate profile of ${fullName}`}
            >
              <UserCheck size={15} />
            </Button>
          )}
        </div>
      </div>

      <div className="text-xs space-y-1.5 pt-2.5 border-t border-border/50 text-muted-foreground">
        <div className="flex justify-between">
          <span>Phone:</span>
          {employee.phone ? (
            <a href={`tel:${employee.phone}`} className="font-semibold text-foreground hover:underline">
              {employee.phone}
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        <div className="flex justify-between">
          <span>Email:</span>
          <a href={`mailto:${employee.email}`} className="font-medium text-foreground hover:underline">
            {employee.email}
          </a>
        </div>
        <div className="flex justify-between items-start">
          <span>Branches:</span>
          <span className="font-semibold text-foreground text-right max-w-[70%] truncate">
            {employee.branchIds.map((id) => getBranchName(id)).filter(Boolean).join(", ") || "—"}
          </span>
        </div>
        {employee.specialties && employee.specialties.length > 0 && (
          <div className="flex justify-between items-start">
            <span>Specialties:</span>
            <span className="font-semibold text-foreground text-right max-w-[70%] truncate">
              {employee.specialties.length} service(s)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
