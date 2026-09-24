import React from "react";
import { Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface SubscriptionFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  onClear: () => void;
  isLoading?: boolean;
}

export function SubscriptionFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  onClear,
  isLoading,
}: SubscriptionFiltersProps) {
  const hasActiveFilters = search.trim() !== "" || (status && status !== "all");

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-2xs">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by code or customer..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={isLoading}
          className="pl-9 h-9 text-xs"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="w-36">
          <Select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            disabled={isLoading}
            className="h-9 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="exhausted">Exhausted</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-9 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
