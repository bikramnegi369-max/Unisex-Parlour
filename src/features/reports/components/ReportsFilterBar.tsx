import React from "react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { Calendar, Download, RefreshCw } from "lucide-react";
import { ReportsFilterParams } from "../types/reports.types";

interface ReportsFilterBarProps {
  filters: ReportsFilterParams;
  onFilterChange: (newFilters: ReportsFilterParams) => void;
  onRefresh?: () => void;
  onExportCsv?: () => void;
  exportable?: boolean;
  isExporting?: boolean;
}

export const ReportsFilterBar: React.FC<ReportsFilterBarProps> = ({
  filters,
  onFilterChange,
  onRefresh,
  onExportCsv,
  exportable = false,
  isExporting = false,
}) => {
  const handlePresetChange = (preset: "today" | "last7" | "last30" | "thisMonth") => {
    const today = new Date();
    let start = today;
    let end = today;

    if (preset === "today") {
      start = today;
      end = today;
    } else if (preset === "last7") {
      start = subDays(today, 6);
      end = today;
    } else if (preset === "last30") {
      start = subDays(today, 29);
      end = today;
    } else if (preset === "thisMonth") {
      start = startOfMonth(today);
      end = endOfMonth(today);
    }

    onFilterChange({
      ...filters,
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/40 bg-card/60 p-4 shadow-sm backdrop-blur-md md:flex-row md:items-center md:justify-between">
      {/* Date Presets and Inputs */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-border bg-background p-1 text-xs">
          <button
            type="button"
            onClick={() => handlePresetChange("today")}
            className="rounded px-2.5 py-1 font-medium transition hover:bg-muted"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handlePresetChange("last7")}
            className="rounded px-2.5 py-1 font-medium transition hover:bg-muted"
          >
            Last 7D
          </button>
          <button
            type="button"
            onClick={() => handlePresetChange("last30")}
            className="rounded px-2.5 py-1 font-medium transition hover:bg-muted"
          >
            Last 30D
          </button>
          <button
            type="button"
            onClick={() => handlePresetChange("thisMonth")}
            className="rounded px-2.5 py-1 font-medium transition hover:bg-muted"
          >
            This Month
          </button>
        </div>

        {/* Custom Date Pickers */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value })}
              className="bg-transparent focus:outline-none"
            />
          </div>
          <span className="text-muted-foreground">to</span>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value })}
              className="bg-transparent focus:outline-none"
            />
          </div>
        </div>

        {/* Comparison Toggle */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1 text-xs">
          <label className="flex cursor-pointer items-center gap-1.5 font-medium">
            <input
              type="checkbox"
              checked={filters.compareWith === "previous_period"}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  compareWith: e.target.checked ? "previous_period" : "none",
                })
              }
              className="rounded border-border text-primary focus:ring-0"
            />
            Compare with previous period
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
            title="Refresh Report Data"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        )}
        {exportable && onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </button>
        )}
      </div>
    </div>
  );
};
