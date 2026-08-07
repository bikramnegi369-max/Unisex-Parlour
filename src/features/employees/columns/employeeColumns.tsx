import React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import type { Employee } from "../types/employee.types";
import { Badge } from "@/components/ui/badge";
import { EntityActionMenu } from "@/components/entity/EntityActionMenu";
import { EMPLOYEES_CONFIG } from "../config/employees.config";

interface EmployeeColumnOptions {
  onView: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onReactivate: (employee: Employee) => void;
  getBranchName?: (id: string) => string;
  getServiceName?: (id: string) => string;
}

export const buildEmployeeColumns = ({
  onView,
  onEdit,
  onDelete,
  onReactivate,
}: EmployeeColumnOptions): ColumnDef<Employee>[] => [
  {
    accessorKey: "name",
    header: "Employee",
    cell: (info) => {
      const employee = info.row.original;
      const fullName = employee.name || "";
      const nameParts = fullName.trim().split(/\s+/);
      const initials = nameParts.map(part => part.charAt(0).toUpperCase()).slice(0, 2).join("");
      return (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
            {initials || "ST"}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{fullName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{employee.email}</p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "phone",
    header: "Contact",
    cell: (info) => {
      const phoneStr = (info.getValue() as string) || info.row.original.phone;
      return phoneStr ? (
        <a href={`tel:${phoneStr}`} className="font-medium text-foreground hover:underline">
          {phoneStr}
        </a>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "designation",
    header: "Designation",
    cell: (info) => {
      const designationStr = (info.getValue() as string) || info.row.original.designation;
      return (
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-semibold">
          {designationStr}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: (info) => {
      const status = (info.getValue() as string) || info.row.original.status || "active";
      return (
        <Badge variant={status === "active" ? "success" : "muted"}>
          <span className="capitalize">{status}</span>
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: (info) => {
      const employee = info.row.original;
      return (
        <EntityActionMenu
          onView={() => onView(employee)}
          onEdit={() => onEdit(employee)}
          onDelete={() => onDelete(employee)}
          onReactivate={() => onReactivate(employee)}
          status={employee.status}
          permissions={{
            edit: EMPLOYEES_CONFIG.permissions.edit,
            delete: EMPLOYEES_CONFIG.permissions.delete,
          }}
        />
      );
    },
  },
];
