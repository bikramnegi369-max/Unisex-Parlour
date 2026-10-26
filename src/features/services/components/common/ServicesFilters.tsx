"use client";

import React from "react";
import { Filter, RefreshCw, RotateCcw, X, Layers, Users, Sparkles } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ServiceCategory } from "../../types/category.types";

interface ServicesFiltersProps {
  status: string;
  onStatusChange: (status: string) => void;
  gender: string;
  onGenderChange: (gender: string) => void;
  categoryId: string;
  onCategoryIdChange: (categoryId: string) => void;
  categories: ServiceCategory[];
  sort: string;
  onSortChange: (sort: string) => void;
  onClearFilters: () => void;
  activeScopeName: string;
  isRefetching: boolean;
  totalResults?: number;
}

export function ServicesFilters({
  status,
  onStatusChange,
  gender,
  onGenderChange,
  categoryId,
  onCategoryIdChange,
  categories,
  sort,
  onSortChange,
  onClearFilters,
  activeScopeName,
  isRefetching,
  totalResults,
}: ServicesFiltersProps) {
  const activeFilterCount =
    (status !== "all" ? 1 : 0) +
    (gender !== "all" && gender !== "" ? 1 : 0) +
    (categoryId !== "all" ? 1 : 0) +
    (sort !== "" ? 1 : 0);

  const selectedCategoryName =
    categoryId !== "all"
      ? categories.find((c) => c.id === categoryId)?.name || "Category"
      : null;

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Primary Toolbar Control Row */}
      <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between w-full">
        {/* Filter Controls Group */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto flex-1 max-w-4xl">
          {/* Gender Filter */}
          <div className="relative">
            <Select
              value={gender || "all"}
              onChange={(e) => onGenderChange(e.target.value)}
              aria-label="Filter by Gender"
              className="h-9 text-xs rounded-lg bg-card border-border shadow-2xs font-medium pl-2.5 pr-8"
            >
              <option value="all">All Genders</option>
              <option value="unisex">Unisex</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Select
              value={categoryId}
              onChange={(e) => onCategoryIdChange(e.target.value)}
              aria-label="Filter by Category"
              className="h-9 text-xs rounded-lg bg-card border-border shadow-2xs font-medium pl-2.5 pr-8"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label="Filter by Status"
              className="h-9 text-xs rounded-lg bg-card border-border shadow-2xs font-medium pl-2.5 pr-8"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </Select>
          </div>

          {/* Sort Selection */}
          <div className="relative">
            <Select
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              aria-label="Sort Services"
              className="h-9 text-xs rounded-lg bg-card border-border shadow-2xs font-medium pl-2.5 pr-8"
            >
              <option value="">Sort: Default</option>
              <option value="name">Name (A-Z)</option>
              <option value="-name">Name (Z-A)</option>
              <option value="-basePrice">Price: Low to High</option>
              <option value="basePrice">Price: High to Low</option>
              <option value="-duration">Duration: Shortest</option>
              <option value="duration">Duration: Longest</option>
            </Select>
          </div>
        </div>

        {/* Scope Indicator & Reset Button */}
        <div className="flex items-center gap-2 justify-end shrink-0">
          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="h-9 px-2.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground border-border/80 hover:bg-muted/60 transition-colors shadow-2xs"
              title="Reset all active filters"
            >
              <RotateCcw size={13} className="shrink-0" />
              <span>Reset</span>
              <Badge
                variant="secondary"
                className="h-4.5 px-1.5 text-[10px] font-bold rounded-full ml-0.5"
              >
                {activeFilterCount}
              </Badge>
            </Button>
          )}

          <div
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/30 border border-border/60 px-3 py-1.5 rounded-lg h-9 shadow-2xs"
            title="Current Branch Scope"
          >
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-bold hidden sm:inline">
              Scope:
            </span>
            <span className="font-semibold text-foreground text-xs truncate max-w-32">
              {activeScopeName}
            </span>
            {isRefetching && (
              <RefreshCw
                size={12}
                className="animate-spin text-primary shrink-0 ml-0.5"
              />
            )}
          </div>
        </div>
      </div>

      {/* Active Filter Chips / Pills Row */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5 animate-in fade-in duration-150">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mr-1">
            <Filter size={11} className="text-primary" />
            <span>Active filters:</span>
          </span>

          {gender && gender !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
              <Users size={11} />
              <span>Gender: {gender === "unisex" ? "Unisex" : gender === "female" ? "Female" : "Male"}</span>
              <button
                type="button"
                onClick={() => onGenderChange("all")}
                className="hover:bg-purple-500/20 rounded p-0.5 cursor-pointer ml-0.5"
                title="Remove gender filter"
              >
                <X size={11} />
              </button>
            </span>
          )}

          {categoryId !== "all" && selectedCategoryName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
              <Layers size={11} />
              <span>Category: {selectedCategoryName}</span>
              <button
                type="button"
                onClick={() => onCategoryIdChange("all")}
                className="hover:bg-primary/20 rounded p-0.5 cursor-pointer ml-0.5"
                title="Remove category filter"
              >
                <X size={11} />
              </button>
            </span>
          )}

          {status !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              <Sparkles size={11} />
              <span>Status: {status === "active" ? "Active" : "Inactive"}</span>
              <button
                type="button"
                onClick={() => onStatusChange("all")}
                className="hover:bg-emerald-500/20 rounded p-0.5 cursor-pointer ml-0.5"
                title="Remove status filter"
              >
                <X size={11} />
              </button>
            </span>
          )}

          {sort && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-foreground border border-border">
              <span>Sorted</span>
              <button
                type="button"
                onClick={() => onSortChange("")}
                className="hover:bg-muted-foreground/20 rounded p-0.5 cursor-pointer ml-0.5"
                title="Remove sorting"
              >
                <X size={11} />
              </button>
            </span>
          )}

          {totalResults !== undefined && (
            <span className="text-[11px] text-muted-foreground ml-auto">
              {totalResults} {totalResults === 1 ? "service" : "services"} found
            </span>
          )}
        </div>
      )}
    </div>
  );
}
