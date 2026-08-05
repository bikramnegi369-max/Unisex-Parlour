import React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import type { Employee } from "../types/employee.types";
import { Badge } from "@/components/ui/badge";
import { EntityActionMenu } from "@/components/entity/EntityActionMenu";

interface EmployeeColumnOptions {
  onView: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onReactivate: (employee: Employee) => void;
  getBranchName: (id: string) => string;
  getServiceName?: (id: string) => string;
}

export const buildEmployeeColumns = ({
  onView,
  onEdit,
  onDelete,
  onReactivate,
  getBranchName,
  getServiceName,
}: EmployeeColumnOptions): ColumnDef<Employee>[] => [
  {
    accessorKey: "name",
    header: "Employee",
    cell: (info) => {
      const employee = info.row.original;
      const fullName = `${employee.firstName} ${employee.lastName}`.trim();
      return (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
            {employee.firstName.charAt(0).toUpperCase()}
            {employee.lastName.charAt(0).toUpperCase()}
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
    accessorKey: "role",
    header: "Role",
    cell: (info) => {
      const roleStr = (info.getValue() as string) || info.row.original.role;
      return (
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-semibold">
          {roleStr}
        </Badge>
      );
    },
  },
  {
    accessorKey: "branchIds",
    header: "Branches",
    cell: (info) => {
      const branchIds = (info.getValue() as string[]) || info.row.original.branchIds || [];
      if (branchIds.length === 0) return <span className="text-muted-foreground">—</span>;
      
      const names = branchIds.map((id) => getBranchName(id)).filter(Boolean);
      
      if (names.length <= 2) {
        return (
          <div className="flex flex-wrap gap-1">
            {names.map((name) => (
              <Badge key={name} variant="outline" className="text-xs">
                {name}
              </Badge>
            ))}
          </div>
        );
      }
      
      return (
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs">
            {names[0]}
          </Badge>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            +{names.length - 1} more
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "specialties",
    header: "Specialties",
    cell: (info) => {
      const specialties = (info.getValue() as string[]) || info.row.original.specialties || [];
      if (specialties.length === 0) return <span className="text-muted-foreground">—</span>;
      
      const names = getServiceName 
        ? specialties.map((id) => getServiceName(id)).filter(Boolean)
        : specialties;
      
      if (names.length <= 2) {
        return (
          <div className="flex flex-wrap gap-1">
            {names.map((name) => (
              <Badge key={name} variant="outline" className="text-xs bg-muted text-muted-foreground">
                {name}
              </Badge>
            ))}
          </div>
        );
      }
      
      return (
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
            {names[0]}
          </Badge>
          <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
            +{names.length - 1} more
          </Badge>
        </div>
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
            edit: "employees.edit",
            delete: "employees.delete",
          }}
        />
      );
    },
  },
];
