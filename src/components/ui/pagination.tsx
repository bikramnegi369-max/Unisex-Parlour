"use client";

import * as React from "react";
import { Button } from "./button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  /** Label used in the summary text, e.g. "services", "customers" */
  itemLabel?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  itemLabel = "records",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/60 text-xs">
      <span className="text-muted-foreground">
        Showing page{" "}
        <strong className="text-foreground">{currentPage}</strong> of{" "}
        <strong className="text-foreground">{totalPages}</strong>{" "}
        ({totalItems} total {itemLabel})
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage <= 1}
          className="cursor-pointer"
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage >= totalPages}
          className="cursor-pointer"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
