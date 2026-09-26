"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useEmployees, useMultipleStaffServices } from "@/features/employees/hooks/useEmployees";
import type { Employee } from "@/features/employees/types/employee.types";
import { getEmployeeBranchNames } from "@/features/employees/utils/employeeBranchUtils";
import { useBranches } from "@/features/branches/hooks/useBranches";
import { EMPLOYEES_CONFIG } from "@/features/employees/config/employees.config";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Users,
  Search,
  X,
  ExternalLink,
  Phone,
  Mail,
  UserCheck,
  Building2,
} from "lucide-react";

interface ServiceCertifiedStaffTabProps {
  serviceId: string;
}

export function ServiceCertifiedStaffTab({ serviceId }: ServiceCertifiedStaffTabProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees({
    limit: 100,
  });

  const { branches } = useBranches();

  const getBranchName = useMemo(() => {
    const branchMap = new Map((branches || []).map((b) => [b.id, b.name]));
    return (id: string) => branchMap.get(id) || id;
  }, [branches]);

  const employees: Employee[] = useMemo(
    () => employeesData?.data || [],
    [employeesData?.data]
  );

  const employeeIds = useMemo(
    () => employees.map((emp) => emp.id).filter(Boolean),
    [employees]
  );

  const { staffServicesMap, isLoading: isLoadingStaffServices } =
    useMultipleStaffServices(employeeIds);

  const certifiedStaff = useMemo(() => {
    if (!serviceId) return [];
    return employees.filter((emp) => {
      const assigned = staffServicesMap[emp.id] || [];
      return assigned.includes(serviceId);
    });
  }, [employees, staffServicesMap, serviceId]);

  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return certifiedStaff;
    const q = searchQuery.toLowerCase().trim();
    return certifiedStaff.filter(
      (emp) =>
        emp.name?.toLowerCase().includes(q) ||
        emp.designation?.toLowerCase().includes(q) ||
        emp.staffCode?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.phone?.toLowerCase().includes(q)
    );
  }, [certifiedStaff, searchQuery]);

  const isLoading = isLoadingEmployees || isLoadingStaffServices;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 border-b border-border/80 pb-4">
          <div className="h-6 w-48 bg-muted animate-pulse rounded-md" />
          <div className="h-9 w-64 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-border/70 bg-card space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded-md" />
                  <div className="h-3 w-20 bg-muted animate-pulse rounded-md" />
                </div>
              </div>
              <div className="h-8 bg-muted animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (certifiedStaff.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No Certified Staff Linked"
        description="No staff members are currently certified to perform this treatment. You can assign this service capability to staff members from their employee profile."
        action={{
          label: "Manage Employees",
          onClick: () => {
            window.location.href = EMPLOYEES_CONFIG.routes.employees.list;
          },
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header controls & summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-foreground">Certified Staff</h3>
              <Badge variant="outline" className="font-bold text-xs bg-primary/5 text-primary border-primary/20">
                {certifiedStaff.length} {certifiedStaff.length === 1 ? "Provider" : "Providers"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Staff members qualified to deliver this service.
            </p>
          </div>
        </div>

        {/* Filter input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search certified staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs h-9 pl-9 pr-8"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Staff Grid */}
      {filteredStaff.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-border rounded-2xl">
          <p className="text-xs text-muted-foreground">
            No certified staff match &quot;{searchQuery}&quot;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 min-w-0">
          {filteredStaff.map((staff) => {
            const fullName = staff.name || "Unknown Staff";
            const nameParts = fullName.trim().split(/\s+/);
            const initials = nameParts
              .map((part) => part.charAt(0).toUpperCase())
              .slice(0, 2)
              .join("");
            const isActive = staff.status === "active";
            const branchNames = getEmployeeBranchNames(staff, getBranchName);

            return (
              <div
                key={staff.id}
                className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4 min-w-0 overflow-hidden"
              >
                <div className="space-y-3 min-w-0">
                  <div className="flex items-start justify-between gap-2.5 min-w-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        {staff.avatarUrl ? (
                          <Image
                            src={staff.avatarUrl}
                            alt={fullName}
                            width={44}
                            height={44}
                            unoptimized
                            className="h-11 w-11 rounded-full object-cover ring-2 ring-primary/20 shadow-xs"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold ring-2 ring-primary/20">
                            {initials || "ST"}
                          </div>
                        )}
                        <span
                          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-card ${
                            isActive ? "bg-emerald-500" : "bg-muted-foreground/50"
                          }`}
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5 text-left">
                        <p className="font-bold text-sm text-foreground truncate" title={fullName}>
                          {fullName}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold text-primary">
                            {staff.designation || "Stylist"}
                          </span>
                          {staff.staffCode && (
                            <>
                              <span className="text-muted-foreground text-[10px]">•</span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {staff.staffCode}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={isActive ? "success" : "muted"}
                      className="capitalize text-[10px] shrink-0"
                    >
                      {staff.status}
                    </Badge>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1 pt-1 text-left text-xs text-muted-foreground border-t border-border/40 min-w-0">
                    {staff.phone && (
                      <div className="flex items-center gap-2 truncate" title={staff.phone}>
                        <Phone className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                        <span className="truncate">{staff.phone}</span>
                      </div>
                    )}
                    {staff.email && (
                      <div className="flex items-center gap-2 truncate" title={staff.email}>
                        <Mail className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                        <span className="truncate">{staff.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Branches */}
                  {branchNames.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 text-left">
                      <Building2 className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                      {branchNames.map((bName) => (
                        <Badge
                          key={bName}
                          variant="outline"
                          className="text-[10px] font-medium bg-muted/40 text-foreground border-border/70 max-w-full truncate"
                          title={bName}
                        >
                          {bName}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer link to staff profile */}
                <div className="pt-2 border-t border-border/60 flex justify-end">
                  <Link
                    href={EMPLOYEES_CONFIG.routes.employees.detail(staff.id)}
                    className="inline-flex items-center justify-center rounded-lg text-xs font-semibold gap-1.5 h-8 px-2.5 text-muted-foreground hover:text-primary hover:bg-muted transition-colors cursor-pointer"
                  >
                    View Profile
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ServiceCertifiedStaffTab;
