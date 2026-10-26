import React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import type { Service } from "../types/service.types";
import { Badge } from "@/components/ui/badge";
import { EntityActionMenu } from "@/components/entity/EntityActionMenu";
import { SERVICES_CONFIG } from "../config/services.config";
import { formatCurrency, capitalizeWords } from "@/lib/formatters";

interface ServiceColumnOptions {
  onView: (service: Service) => void;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
  onReactivate: (service: Service) => void;
  getCategoryName: (categoryId: string) => string;
}

export const buildServiceColumns = ({
  onView,
  onEdit,
  onDelete,
  onReactivate,
  getCategoryName,
}: ServiceColumnOptions): ColumnDef<Service>[] => [
  {
    accessorKey: "name",
    header: "Service",
    cell: (info) => {
      const service = info.row.original;
      const formattedName = capitalizeWords(service.name);
      return (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
            {formattedName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-foreground">{formattedName}</p>
            {service.code && (
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                {service.code}
              </p>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "categoryId",
    header: "Category",
    cell: (info) => {
      const val = info.getValue();
      const id = typeof val === "string" ? val : (val as { _id: string })?._id || "";
      return (
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10">
          {capitalizeWords(getCategoryName(id))}
        </Badge>
      );
    },
  },
  {
    accessorKey: "gender",
    header: "Gender",
    cell: (info) => {
      const val = (info.getValue() as string) || "unisex";
      const label =
        val === "male" ? "Male" : val === "female" ? "Female" : "Unisex";
      const variantClass =
        val === "female"
          ? "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20"
          : val === "male"
            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
            : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      return (
        <Badge variant="outline" className={variantClass}>
          {label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "duration",
    header: "Duration",
    cell: (info) => {
      const val = info.getValue() as number;
      return <span className="font-medium text-foreground">{val} mins</span>;
    },
  },
  {
    accessorKey: "pricing.basePrice",
    header: "Price",
    cell: (info) => {
      const service = info.row.original;
      const price = service.pricing?.basePrice ?? 0;
      return <span className="font-semibold text-foreground">{formatCurrency(price)}</span>;
    },
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: (info) => {
      const isActive = info.getValue() as boolean;
      return (
        <Badge variant={isActive ? "success" : "muted"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: (info) => {
      const service = info.row.original;
      return (
        <EntityActionMenu
          onView={() => onView(service)}
          onEdit={() => onEdit(service)}
          onDelete={() => onDelete(service)}
          onReactivate={() => onReactivate(service)}
          status={service.isActive ? "active" : "inactive"}
          permissions={{
            edit: SERVICES_CONFIG.permissions.edit,
            delete: SERVICES_CONFIG.permissions.delete,
          }}
        />
      );
    },
  },
];
