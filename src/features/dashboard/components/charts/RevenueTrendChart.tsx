"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { RevenueTrendPoint } from "../../types/dashboard.types";
import { TrendingUp } from "lucide-react";

interface RevenueTrendChartProps {
  data: RevenueTrendPoint[];
  isLoading?: boolean;
}

export function RevenueTrendChart({ data, isLoading }: RevenueTrendChartProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col p-4 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 bg-muted rounded-md" />
          <div className="h-6 w-24 bg-muted/60 rounded-md" />
        </div>
        <div className="h-72 w-full bg-muted/30 rounded-xl" />
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formattedData = React.useMemo(() => {
    return (data || []).map((item) => {
      let label = item.date;
      try {
        label = format(parseISO(item.date), "dd MMM");
      } catch {
        // Fallback to raw string
      }
      return {
        ...item,
        displayDate: label,
      };
    });
  }, [data]);

  const totalBilled = React.useMemo(
    () =>
      (data || []).reduce((acc, curr) => acc + (curr.billedRevenue || 0), 0),
    [data],
  );

  const totalCollections = React.useMemo(
    () => (data || []).reduce((acc, curr) => acc + (curr.collections || 0), 0),
    [data],
  );

  return (
    <div className="flex flex-col p-4 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-2xs select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              Revenue & Cash Trajectory
            </h2>
            <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/40">
              Daily Attribution
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Accrual billed sales vs. actual cash collected across period
          </p>
        </div>

        {/* Quick Summary Pill */}
        <div className="flex items-center gap-3 bg-muted/30 px-3 py-1.5 rounded-xl border border-border/60 self-start sm:self-auto">
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
              Period Collections
            </span>
            <span className="text-xs sm:text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalCollections)}
            </span>
          </div>
          <div className="h-6 w-px bg-border/80" />
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
              Billed Sales
            </span>
            <span className="text-xs sm:text-sm font-extrabold font-mono text-purple-600 dark:text-purple-400">
              {formatCurrency(totalBilled)}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full">
        {formattedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl">
            <TrendingUp size={24} className="text-muted-foreground/40 mb-1" />
            <span>No transaction data available for the selected period</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={formattedData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9333ea" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="colorCollections"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                className="text-border/40"
              />

              <XAxis
                dataKey="displayDate"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "currentColor" }}
                className="text-muted-foreground font-mono"
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) =>
                  `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                }
                tick={{ fontSize: 11, fill: "currentColor" }}
                className="text-muted-foreground font-mono"
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as RevenueTrendPoint;
                    return (
                      <div className="p-3 bg-popover text-popover-foreground border border-border shadow-xl rounded-xl text-xs space-y-1.5 font-sans z-50">
                        <div className="font-bold border-b border-border/60 pb-1 text-foreground">
                          {label}
                        </div>
                        <div className="flex items-center justify-between gap-4 text-purple-600 dark:text-purple-400">
                          <span>Billed Sales:</span>
                          <span className="font-mono font-bold">
                            {formatCurrency(d.billedRevenue)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400">
                          <span>Collections:</span>
                          <span className="font-mono font-bold">
                            {formatCurrency(d.collections)}
                          </span>
                        </div>
                        {d.refunds > 0 && (
                          <div className="flex items-center justify-between gap-4 text-rose-600 dark:text-rose-400">
                            <span>Refunds:</span>
                            <span className="font-mono font-bold">
                              {formatCurrency(d.refunds)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-4 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                          <span>Net Liquid:</span>
                          <span className="font-mono">
                            {formatCurrency(d.netCollections)}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: 12, fontSize: 11 }}
              />

              <Area
                type="monotone"
                name="Billed Sales"
                dataKey="billedRevenue"
                stroke="#9333ea"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorBilled)"
              />

              <Area
                type="monotone"
                name="Collections"
                dataKey="collections"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCollections)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
