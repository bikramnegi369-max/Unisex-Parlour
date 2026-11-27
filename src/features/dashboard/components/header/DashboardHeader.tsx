"use client";

import React, { useMemo } from "react";
import {
  RefreshCw,
  Calendar,
  Clock,
  ChevronDown,
  Check,
  Sparkles,
  Building2,
} from "lucide-react";
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  subWeeks,
} from "date-fns";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBranchContext } from "@/hooks/useBranchContext";
import {
  ComparisonPeriod,
  DateFilterPreset,
} from "../../types/dashboard.types";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  startDate: string;
  endDate: string;
  compareWith: ComparisonPeriod;
  activePreset: DateFilterPreset;
  onDateChange: (start: string, end: string, preset: DateFilterPreset) => void;
  onCompareChange: (compare: ComparisonPeriod) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  generatedAt?: string;
}

export function DashboardHeader({
  compareWith,
  activePreset,
  onDateChange,
  onCompareChange,
  onRefresh,
  isRefreshing,
  generatedAt,
}: DashboardHeaderProps) {
  const { user } = useAuth();
  const { currentBranch, isAllBranchesSelected } = useBranchContext();
  const [isPresetOpen, setIsPresetOpen] = React.useState(false);
  const [isCompareOpen, setIsCompareOpen] = React.useState(false);

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const userName = user?.name ? user.name.split(" ")[0] : "Admin";

  // Preset calculation helper
  const applyPreset = (preset: DateFilterPreset) => {
    const today = new Date();
    let start = today;
    let end = today;

    switch (preset) {
      case "today":
        start = today;
        end = today;
        break;
      case "yesterday":
        start = subDays(today, 1);
        end = subDays(today, 1);
        break;
      case "this_week":
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = today;
        break;
      case "last_week": {
        const lastWeek = subWeeks(today, 1);
        start = startOfWeek(lastWeek, { weekStartsOn: 1 });
        end = endOfWeek(lastWeek, { weekStartsOn: 1 });
        break;
      }
      case "this_month":
        start = startOfMonth(today);
        end = today;
        break;
      case "last_month": {
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      }
      case "this_quarter": {
        const currQuarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), currQuarter * 3, 1);
        end = today;
        break;
      }
      case "this_year":
        start = startOfYear(today);
        end = today;
        break;
      default:
        break;
    }

    onDateChange(
      format(start, "yyyy-MM-dd"),
      format(end, "yyyy-MM-dd"),
      preset,
    );
    setIsPresetOpen(false);
  };

  const presetLabels: Record<DateFilterPreset, string> = {
    today: "Today",
    yesterday: "Yesterday",
    this_week: "This Week",
    last_week: "Last Week",
    this_month: "This Month",
    last_month: "Last Month",
    this_quarter: "This Quarter",
    this_year: "This Year",
    custom: "Custom Range",
  };

  const compareLabels: Record<ComparisonPeriod, string> = {
    previous_period: "vs. Previous Period",
    previous_year: "vs. Previous Year",
    none: "No Comparison",
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-linear-to-br from-card via-card to-primary/4 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 select-none">
      {/* Left: Greeting & Scope Context */}
      <div className="flex items-start gap-3.5">
        <div className="hidden sm:flex h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center text-primary shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {greeting}, {userName}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              <Building2 className="h-3 w-3" />
              {isAllBranchesSelected
                ? "Consolidated Org View"
                : currentBranch?.name || "Active Branch"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} className="shrink-0" />
              {format(new Date(), "EEEE, dd MMMM yyyy")}
            </span>
            {generatedAt && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Fresh as of {format(new Date(generatedAt), "hh:mm a")}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Controls & Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        {/* Preset Range Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsPresetOpen((prev) => !prev)}
            className="flex items-center gap-2 h-9 px-3 rounded-xl border border-border/80 bg-background hover:bg-muted/60 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs"
            aria-label="Select date filter range"
          >
            <Calendar size={14} className="text-muted-foreground" />
            <span>{presetLabels[activePreset]}</span>
            <ChevronDown size={13} className="text-muted-foreground" />
          </button>

          {isPresetOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-popover border border-border rounded-xl shadow-xl z-50 p-1 space-y-0.5 animate-in fade-in-50 zoom-in-95 duration-100">
              {(Object.keys(presetLabels) as DateFilterPreset[])
                .filter((p) => p !== "custom")
                .map((preset) => (
                  <button
                    key={preset}
                    onClick={() => applyPreset(preset)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left",
                      activePreset === preset
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-muted text-foreground",
                    )}
                  >
                    <span>{presetLabels[preset]}</span>
                    {activePreset === preset && <Check size={13} />}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Comparison Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsCompareOpen((prev) => !prev)}
            className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl border border-border/80 bg-background hover:bg-muted/60 text-xs font-medium text-foreground transition-all cursor-pointer shadow-2xs"
            aria-label="Select comparison period"
          >
            <span>{compareLabels[compareWith]}</span>
            <ChevronDown size={13} className="text-muted-foreground" />
          </button>

          {isCompareOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-popover border border-border rounded-xl shadow-xl z-50 p-1 space-y-0.5 animate-in fade-in-50 zoom-in-95 duration-100">
              {(Object.keys(compareLabels) as ComparisonPeriod[]).map(
                (period) => (
                  <button
                    key={period}
                    onClick={() => {
                      onCompareChange(period);
                      setIsCompareOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left",
                      compareWith === period
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-muted text-foreground",
                    )}
                  >
                    <span>{compareLabels[period]}</span>
                    {compareWith === period && <Check size={13} />}
                  </button>
                ),
              )}
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center justify-center h-9 w-9 rounded-xl border border-border/80 bg-background hover:bg-muted/60 text-foreground transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          title="Refresh dashboard data"
          aria-label="Refresh data"
        >
          <RefreshCw
            size={14}
            className={cn(
              "text-muted-foreground",
              isRefreshing && "animate-spin text-primary",
            )}
          />
        </button>
      </div>
    </div>
  );
}
