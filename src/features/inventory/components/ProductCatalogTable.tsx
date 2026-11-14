"use client";

import React, { useMemo } from "react";
import type { Product } from "../types/inventory.types";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { buildProductCatalogColumns } from "../columns/productCatalogColumns";
import { ProductCatalogMobileCard } from "./ProductCatalogMobileCard";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";

interface ProductCatalogTableProps {
  products: Product[];
  isLoading: boolean;
  canAdjust: boolean;
  onEdit: (product: Product) => void;
  onAddToSale?: (product: Product) => void;
  // Pagination
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  searchQuery?: string;
}

export function ProductCatalogTable({
  products,
  isLoading,
  canAdjust,
  onEdit,
  onAddToSale,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  searchQuery,
}: ProductCatalogTableProps) {
  const columns = useMemo(
    () => buildProductCatalogColumns({ canAdjust, onEdit, onAddToSale }),
    [canAdjust, onEdit, onAddToSale],
  );

  const renderMobileRow = (product: Product) => (
    <ProductCatalogMobileCard
      key={product.id}
      product={product}
      canAdjust={canAdjust}
      onEdit={onEdit}
      onAddToSale={onAddToSale}
    />
  );

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={products}
        isLoading={isLoading}
        renderMobileRow={renderMobileRow}
        emptyState={
          <EmptyState
            title={searchQuery ? "No Matching Products" : "No Products Found"}
            description={
              searchQuery
                ? `No catalog items matched "${searchQuery}".`
                : "Your organization does not have any inventory products defined yet. Click 'Create Product' to register your master items."
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
          itemLabel="products"
        />
      )}
    </div>
  );
}
