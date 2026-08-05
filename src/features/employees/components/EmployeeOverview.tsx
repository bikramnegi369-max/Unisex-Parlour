"use client";

import React from "react";
import type { Employee } from "../types/employee.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/formatters";
import {
  User,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
} from "lucide-react";

interface EmployeeOverviewProps {
  employee: Employee;
  resolvedBranchNames?: string[];
  resolvedSpecialties?: string[];
}

export function EmployeeOverview({
  employee,
}: EmployeeOverviewProps) {
  const formatJoinedDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return formatDate(dateStr, "dd MMMM yyyy");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Identity & Work Details Card */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/85 bg-muted/5 py-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User size={16} className="text-primary" />
            Identity & Work Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            <div className="flex items-start gap-3 min-w-0">
              <Phone size={16} className="text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                  Phone Number
                </p>
                {employee.phone ? (
                  <a href={`tel:${employee.phone}`} className="text-sm font-medium mt-1.5 block hover:underline text-foreground break-words">
                    {employee.phone}
                  </a>
                ) : (
                  <p className="text-sm font-medium mt-1.5 text-muted-foreground">—</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 min-w-0">
              <Mail size={16} className="text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                  Email Address
                </p>
                <a href={`mailto:${employee.email}`} className="text-sm font-medium mt-1.5 block hover:underline text-foreground break-all">
                  {employee.email}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3 min-w-0">
              <CheckCircle size={16} className="text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                  Designation
                </p>
                <p className="text-sm font-medium mt-1.5 text-foreground">
                  {employee.designation}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 min-w-0">
              <Calendar size={16} className="text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                  Joined Date
                </p>
                <p className="text-sm font-medium mt-1.5 text-foreground">
                  {formatJoinedDate(employee.joiningDate)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 min-w-0">
              <Calendar size={16} className="text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                  Last Profile Update
                </p>
                <p className="text-sm font-medium mt-1.5 text-foreground">
                  {formatJoinedDate(employee.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
