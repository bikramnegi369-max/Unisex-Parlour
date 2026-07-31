"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { Select } from "@/components/ui/select";
import type { ServiceCategory } from "../../types/category.types";

interface ServicesFiltersProps {
  status: string;
  onStatusChange: (status: string) => void;
  categoryId: string;
  onCategoryIdChange: (categoryId: string) => void;
  categories: ServiceCategory[];
  sort: string;
  onSortChange: (sort: string) => void;
  activeScopeName: string;
  isRefetching: boolean;
}

export function ServicesFilters({
  status,
  onStatusChange,
  categoryId,
  onCategoryIdChange,
  categories,
  sort,
  onSortChange,
  activeScopeName,
  isRefetching,
}: ServicesFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-wrap">
      {/* Status Filter */}
      <div className="min-w-35">
        <Select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          aria-label="Filter by Status"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </Select>
      </div>

      {/* Category Filter */}
      <div className="min-w-40">
        <Select
          value={categoryId}
          onChange={(e) => onCategoryIdChange(e.target.value)}
          aria-label="Filter by Category"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Sort Selection */}
      <div className="min-w-40">
        <Select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          aria-label="Sort Services"
        >
          <option value="">Sort by (Default)</option>
          <option value="name">Name (A-Z)</option>
          <option value="-name">Name (Z-A)</option>
          <option value="basePrice">Price (Lowest)</option>
          <option value="-basePrice">Price (Highest)</option>
          <option value="duration">Duration (Shortest)</option>
          <option value="-duration">Duration (Longest)</option>
        </Select>
      </div>

      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground shrink-0 bg-muted/30 border border-border/50 px-3 py-2.5 rounded-lg">
        <span>Active Scope:</span>
        <span className="font-semibold text-foreground">{activeScopeName}</span>
        {isRefetching && <RefreshCw size={12} className="animate-spin text-primary ml-1" />}
      </div>
    </div>
  );
}
