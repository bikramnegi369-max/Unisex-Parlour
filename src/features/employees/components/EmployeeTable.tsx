"use client";

import React, { useMemo } from "react";
import type { Employee } from "../types/employee.types";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { EmployeeMobileCard } from "./EmployeeMobileCard";
import { buildEmployeeColumns } from "../columns/employeeColumns";

interface EmployeeTableProps {
  employees: Employee[];
  onView: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onReactivate: (employee: Employee) => void;
  isLoading: boolean;
}

export default function EmployeeTable({
  employees,
  onView,
  onEdit,
  onDelete,
  onReactivate,
  isLoading,
}: EmployeeTableProps) {
  const { user } = useAuth();
  const { getBranchName } = useBranchContext();

  const canEdit = hasPermission(user, "employees.edit");
  const canDelete = hasPermission(user, "employees.delete");

  const columns = useMemo(
    () =>
      buildEmployeeColumns({
        onView,
        onEdit,
        onDelete,
        onReactivate,
        getBranchName,
      }),
    [onView, onEdit, onDelete, onReactivate, getBranchName]
  );

  const renderMobileRow = (employee: Employee) => (
    <EmployeeMobileCard
      key={employee.id}
      employee={employee}
      canEdit={canEdit}
      canDelete={canDelete}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
      onReactivate={onReactivate}
      getBranchName={getBranchName}
    />
  );

  return (
    <DataTable
      columns={columns}
      data={employees}
      isLoading={isLoading}
      renderMobileRow={renderMobileRow}
    />
  );
}
