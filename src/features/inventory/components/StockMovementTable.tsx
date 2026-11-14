"use client";

import React, { useMemo } from "react";
import type { StockMovement } from "../types/inventory.types";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { buildStockMovementColumns } from "../columns/stockMovementColumns";
import { StockMovementMobileCard } from "./StockMovementMobileCard";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";

interface StockMovementTableProps {
  movements: StockMovement[];
  isLoading: boolean;
  // Pagination
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  searchQuery?: string;
}

export function StockMovementTable({
  movements,
  isLoading,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  searchQuery,
}: StockMovementTableProps) {
  const columns = useMemo(() => buildStockMovementColumns(), []);

  const renderMobileRow = (movement: StockMovement) => (
    <StockMovementMobileCard key={movement.id} movement={movement} />
  );

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={movements}
        isLoading={isLoading}
        renderMobileRow={renderMobileRow}
        emptyState={
          <EmptyState
            title={searchQuery ? "No Matching Movements" : "No Movements Recorded"}
            description={
              searchQuery
                ? `No stock audit records matched "${searchQuery}".`
                : "No movements have been logged for this branch yet. Adjustments, sales, and consumptions will be tracked here in an immutable audit trail."
            }
          />
        }
      />

      {totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          itemLabel="audit movements"
        />
      )}
    </div>
  );
}
