import React from "react";
import { CircleDot, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { ServiceAppointmentStats } from "../../types/service.types";

interface ServiceAppointmentStatsCardsProps {
  stats: ServiceAppointmentStats;
}

/**
 * Pure presentation component rendering KPI metric tiles for service appointments.
 *
 * Implements:
 * - Single Responsibility Principle (SRP): Only responsible for stats card presentation.
 * - Responsive 1024px design: Uses 2-column layout on medium & tablet screens (preventing sidebar squish) and 4-column on desktop.
 */
export const ServiceAppointmentStatsCards = React.memo(
  function ServiceAppointmentStatsCards({
    stats,
  }: ServiceAppointmentStatsCardsProps) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4 w-full min-w-0">
        {/* Card 1: Total Bookings */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs space-y-2 min-w-0 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider leading-snug">
              Total Bookings
            </span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <CircleDot className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {stats.total}
          </p>
          <span className="text-[11px] text-muted-foreground block leading-tight">
            Lifetime bookings for service
          </span>
        </div>

        {/* Card 2: Completed */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs space-y-2 min-w-0 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider leading-snug">
              Completed
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {stats.completed}
          </p>
          <span className="text-[11px] text-muted-foreground block leading-tight">
            Successfully fulfilled
          </span>
        </div>

        {/* Card 3: Upcoming */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs space-y-2 min-w-0 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider leading-snug">
              Upcoming
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {stats.upcoming}
          </p>
          <span className="text-[11px] text-muted-foreground block leading-tight">
            Scheduled or active
          </span>
        </div>

        {/* Card 4: Revenue */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs space-y-2 min-w-0 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider leading-snug">
              Service
              <br className="hidden sm:inline" /> Revenue
            </span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-0.5">
            {formatCurrency(stats.totalRevenue)}
          </p>
          <span className="text-[11px] text-muted-foreground block leading-tight">
            Completed treatment sales
          </span>
        </div>
      </div>
    );
  }
);
