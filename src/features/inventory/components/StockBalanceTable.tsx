"use client";

import React, { useMemo } from "react";
import type { StockBalance, Product } from "../types/inventory.types";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { buildStockBalanceColumns } from "../columns/stockBalanceColumns";
import { StockBalanceMobileCard } from "./StockBalanceMobileCard";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Package } from "lucide-react";

interface StockBalanceTableProps {
  balances: StockBalance[];
  isLoading: boolean;
  canConsume: boolean;
  canAdjust: boolean;
  canTransfer: boolean;
  onConsume: (product: Product, onHand: number) => void;
  onAdjust: (product: Product, onHand: number) => void;
  onTransfer: (product: Product, onHand: number) => void;
  // Pagination
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  searchQuery?: string;
}

export function StockBalanceTable({
  balances,
  isLoading,
  canConsume,
  canAdjust,
  canTransfer,
  onConsume,
  onAdjust,
  onTransfer,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  searchQuery,
}: StockBalanceTableProps) {
  const columns = useMemo(
    () =>
      buildStockBalanceColumns({
        canConsume,
        canAdjust,
        canTransfer,
        onConsume,
        onAdjust,
        onTransfer,
      }),
    [canConsume, canAdjust, canTransfer, onConsume, onAdjust, onTransfer]
  );

  const renderMobileRow = (balance: StockBalance) => (
    <StockBalanceMobileCard
      key={balance.id}
      balance={balance}
      canConsume={canConsume}
      canAdjust={canAdjust}
      canTransfer={canTransfer}
      onConsume={onConsume}
      onAdjust={onAdjust}
      onTransfer={onTransfer}
    />
  );

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={balances}
        isLoading={isLoading}
        renderMobileRow={renderMobileRow}
        emptyState={
          <EmptyState
            title={searchQuery ? "No Matching Stock" : "No Stock Balances Recorded"}
            description={
              searchQuery
                ? `No product balances matched "${searchQuery}".`
                : "No stock movements or balances exist for this branch yet. Use 'Adjust Stock' to record initial stock inwards."
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
          itemLabel="stock items"
        />
      )}
    </div>
  );
}
