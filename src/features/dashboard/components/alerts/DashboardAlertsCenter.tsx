"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, Info, Bell, ArrowRight } from "lucide-react";
import { DashboardAlertsData, DashboardAlertItem } from "../../types/dashboard.types";
import { cn } from "@/lib/utils";

interface DashboardAlertsCenterProps {
  data?: DashboardAlertsData;
  isLoading: boolean;
}

export function DashboardAlertsCenter({ data, isLoading }: DashboardAlertsCenterProps) {
  if (isLoading) {
    return (
      <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-2xs animate-pulse space-y-3">
        <div className="h-5 w-40 bg-muted rounded-md" />
        <div className="h-16 bg-muted/60 rounded-xl" />
        <div className="h-16 bg-muted/60 rounded-xl" />
      </div>
    );
  }

  const alerts = data?.alerts || [];

  if (alerts.length === 0) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-2xs flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Bell size={16} />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground">Operational Action Center</span>
            <p className="text-[11px] text-muted-foreground">
              All systems healthy. No critical inventory shortages, overdue supplier payables, or pending approvals.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const severityConfig: Record<
    DashboardAlertItem["severity"],
    { icon: typeof AlertCircle; badgeClass: string; cardBorder: string }
  > = {
    critical: {
      icon: AlertCircle,
      badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      cardBorder: "border-rose-500/30 hover:border-rose-500/60 bg-rose-500/5",
    },
    warning: {
      icon: AlertTriangle,
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      cardBorder: "border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5",
    },
    info: {
      icon: Info,
      badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      cardBorder: "border-blue-500/30 hover:border-blue-500/60 bg-blue-500/5",
    },
  };

  return (
    <div className="flex flex-col p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-2xs select-none space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Bell size={16} />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
            Action Center ({alerts.length} Attention Required)
          </h2>
        </div>
        <span className="text-[11px] text-muted-foreground font-medium">Real-time alerts</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {alerts.map((alert) => {
          const config = severityConfig[alert.severity] || severityConfig.info;
          const Icon = config.icon;

          return (
            <div
              key={alert.id}
              className={cn(
                "flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-200",
                config.cardBorder
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                      config.badgeClass
                    )}
                  >
                    <Icon size={12} />
                    <span>{alert.severity}</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {alert.sourceModule}
                  </span>
                </div>

                <div className="text-xs font-bold text-foreground mb-1 line-clamp-1">
                  {alert.title}
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2">
                  {alert.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-mono">
                  Items affected: <strong>{alert.count}</strong>
                </span>
                <Link
                  href={alert.targetUrl}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline group"
                >
                  <span>{alert.actionLabel}</span>
                  <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
