"use client";

import React, { useMemo } from "react";
import type { Customer } from "../types/customer.types";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { CustomerMobileCard } from "./CustomerMobileCard";
import { buildCustomerColumns } from "../columns/customerColumns";
import { CUSTOMERS_CONFIG } from "../config/customers.config";

interface CustomerTableProps {
  customers: Customer[];
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onReactivate: (customer: Customer) => void;
  isLoading: boolean;
  isAllBranches: boolean;
}

export default function CustomerTable({
  customers,
  onView,
  onEdit,
  onDelete,
  onReactivate,
  isLoading,
  isAllBranches,
}: CustomerTableProps) {
  const { user } = useAuth();
  const { getBranchName } = useBranchContext();

  const canEdit = hasPermission(user, CUSTOMERS_CONFIG.permissions.edit);
  const canDelete = hasPermission(user, CUSTOMERS_CONFIG.permissions.delete);

  const columns = useMemo(
    () =>
      buildCustomerColumns({
        onView,
        onEdit,
        onDelete,
        onReactivate,
        getHomeBranchName: getBranchName,
        isAllBranches,
      }),
    [onView, onEdit, onDelete, onReactivate, getBranchName, isAllBranches]
  );

  const renderMobileRow = (customer: Customer) => (
    <CustomerMobileCard
      key={customer.id}
      customer={customer}
      canEdit={canEdit}
      canDelete={canDelete}
      isAllBranches={isAllBranches}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
      onReactivate={onReactivate}
      getHomeBranchName={getBranchName}
    />
  );

  return (
    <DataTable
      columns={columns}
      data={customers}
      isLoading={isLoading}
      renderMobileRow={renderMobileRow}
    />
  );
}

