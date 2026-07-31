"use client";

import * as React from "react";
import { Button } from "./button";
import { Select } from "./select";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  /** Label used in the summary text, e.g. "services", "customers" */
  itemLabel?: string;
  className?: string;
  
  // Page size limits configuration
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  itemLabel = "records",
  className,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  onPageSizeChange,
}: PaginationProps) {
  // If we only have 1 page and page size selector is not enabled, hide pagination
  if (totalPages <= 1 && !onPageSizeChange) return null;

  // Generate page numbers with ellipsis (e.g., [1, 2, 'ellipsis-1', 9, 10])
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always include page 1
      pages.push(1);

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      if (start > 2) {
        pages.push("ellipsis-start");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push("ellipsis-end");
      }

      // Always include last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <nav
      role="navigation"
      aria-label="Pagination Navigation"
      className={cn(
        "flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60 text-xs w-full select-none",
        className
      )}
    >
      {/* Left side: Information Summary & Page Size selector */}
      <div className="flex flex-col sm:flex-row items-center gap-3.5 order-2 md:order-1 text-center md:text-left w-full md:w-auto justify-between md:justify-start">
        <span className="text-muted-foreground">
          Showing page <strong className="text-foreground">{currentPage}</strong> of{" "}
          <strong className="text-foreground">{totalPages}</strong> ({totalItems} total {itemLabel})
        </span>

        {/* Page size limit drop-down option */}
        {onPageSizeChange && pageSize !== undefined && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-muted-foreground">Show:</span>
            <div className="w-18">
              <Select
                value={String(pageSize)}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                aria-label="Items per page"
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={String(option)}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
            <span className="text-muted-foreground">per page</span>
          </div>
        )}
      </div>

      {/* Right side: Page Buttons List */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 order-1 md:order-2 flex-wrap justify-center w-full md:w-auto">
          {/* Previous Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage <= 1}
            className="h-8 w-8 cursor-pointer rounded-lg shrink-0"
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Numbered Page Buttons */}
          {getPageNumbers().map((page, idx) => {
            if (typeof page === "string") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="h-8 w-8 flex items-center justify-center text-muted-foreground shrink-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              );
            }

            const isCurrent = page === currentPage;

            return (
              <Button
                key={page}
                variant={isCurrent ? "default" : "outline"}
                onClick={() => onPageChange(page)}
                className={cn(
                  "h-8 w-8 cursor-pointer rounded-lg font-medium shrink-0 transition-all duration-200",
                  isCurrent ? "shadow-sm shadow-primary/10" : ""
                )}
                aria-label={`Go to page ${page}`}
                aria-current={isCurrent ? "page" : undefined}
              >
                {page}
              </Button>
            );
          })}

          {/* Next Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage >= totalPages}
            className="h-8 w-8 cursor-pointer rounded-lg shrink-0"
            aria-label="Go to next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </nav>
  );
}
