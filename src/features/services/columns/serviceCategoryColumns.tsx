import React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import type { ServiceCategory } from "../types/category.types";
import { Badge } from "@/components/ui/badge";
import { EntityActionMenu } from "@/components/entity/EntityActionMenu";
import { SERVICES_CONFIG } from "../config/services.config";

import { capitalizeWords } from "@/lib/formatters";

interface ServiceCategoryColumnOptions {
  onEdit: (category: ServiceCategory) => void;
  onDelete: (category: ServiceCategory) => void;
  onReactivate: (category: ServiceCategory) => void;
}

export const buildServiceCategoryColumns = ({
  onEdit,
  onDelete,
  onReactivate,
}: ServiceCategoryColumnOptions): ColumnDef<ServiceCategory>[] => [
  {
    accessorKey: "name",
    header: "Category Name",
    cell: (info) => {
      const category = info.row.original;
      const formattedName = capitalizeWords(category.name);
      return (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
            {formattedName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-foreground">{formattedName}</p>
            {category.description && (
              <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                {category.description}
              </p>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "displayOrder",
    header: "Display Order",
    cell: (info) => {
      const val = info.getValue() as number;
      return <span className="font-medium text-foreground">{val}</span>;
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
      const category = info.row.original;
      return (
        <EntityActionMenu
          onEdit={() => onEdit(category)}
          onDelete={() => onDelete(category)}
          onReactivate={() => onReactivate(category)}
          status={category.isActive ? "active" : "inactive"}
          permissions={{
            edit: SERVICES_CONFIG.permissions.edit,
            delete: SERVICES_CONFIG.permissions.delete,
          }}
        />
      );
    },
  },
];
