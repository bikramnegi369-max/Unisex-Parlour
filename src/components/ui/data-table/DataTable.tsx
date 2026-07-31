"use client";
import { cn } from "@/lib/utils";

import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  renderMobileRow?: (row: TData) => React.ReactNode;
  /** Optional callback to add custom CSS classes to table rows */
  getRowClassName?: (row: TData) => string;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading,
  emptyState,
  renderMobileRow,
  getRowClassName,
}: DataTableProps<TData>) {
  "use no memo";
  // useReactTable returns mutable table instances with methods that cannot be safely memoized by the React Compiler.
  // We mark the component with "use no memo" and disable this warning specifically for this hook call.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="w-full">
        {/* Desktop Table Skeleton */}
        <div className="hidden md:block overflow-x-auto border border-border/80 rounded-xl bg-card shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {columns.map((_, i) => (
                  <th key={i} className="px-6 py-4">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((_, colIndex) => (
                    <td key={colIndex} className="px-6 py-4 align-middle">
                      <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards Skeleton */}
        {renderMobileRow && (
          <div className="md:hidden space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="p-4 bg-card border border-border/80 rounded-xl space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 rounded bg-muted" />
                      <div className="h-3 w-20 rounded bg-muted" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-10 w-10 rounded bg-muted" />
                    <div className="h-10 w-10 rounded bg-muted" />
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-border/50 animate-pulse">
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-3 w-2/3 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (data.length === 0) {
    return emptyState ? <>{emptyState}</> : null;
  }

  return (
    <div className="w-full">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto border border-border/80 rounded-xl bg-card shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-6 py-4">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border/60 text-sm">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "hover:bg-muted/10 transition-colors",
                  getRowClassName?.(row.original)
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-4 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Row View */}
      {renderMobileRow && (
        <div className="md:hidden space-y-3">
          {data.map((row) => renderMobileRow(row))}
        </div>
      )}
    </div>
  );
}
