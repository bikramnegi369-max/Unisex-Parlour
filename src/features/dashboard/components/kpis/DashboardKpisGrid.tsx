"use client";

import React from "react";
import {
  TrendingUp,
  Receipt,
  Wallet,
  RotateCcw,
  BadgeDollarSign,
  AlertCircle,
  Calculator,
  CalendarCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { DashboardKpiCard } from "./DashboardKpiCard";
import { DashboardOverviewData } from "../../types/dashboard.types";

interface DashboardKpisGridProps {
  data?: DashboardOverviewData["kpis"];
  isLoading?: boolean;
}

export function DashboardKpisGrid({ data, isLoading }: DashboardKpisGridProps) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 animate-pulse">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div
            key={idx}
            className="h-28 rounded-2xl bg-card border border-border/60 p-4 space-y-3"
          >
            <div className="h-4 w-20 bg-muted/70 rounded-md" />
            <div className="h-6 w-28 bg-muted rounded-md" />
            <div className="h-3 w-16 bg-muted/50 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val ?? 0);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {/* 1. Net Billed Sales */}
      <DashboardKpiCard
        title="Net Sales"
        value={formatCurrency(data.netSales?.current)}
        delta={data.netSales}
        icon={TrendingUp}
        badgeColor="primary"
        href="/billing"
        tooltip="Net billed amount after discounts and subscriptions"
      />

      {/* 2. Collections */}
      <DashboardKpiCard
        title="Collections"
        value={formatCurrency(data.collections?.current)}
        delta={data.collections}
        icon={Wallet}
        badgeColor="emerald"
        href="/billing"
        tooltip="Actual liquid payments collected in period"
      />

      {/* 3. Refunds */}
      <DashboardKpiCard
        title="Refunds"
        value={formatCurrency(data.refunds?.current)}
        delta={data.refunds}
        icon={RotateCcw}
        badgeColor="rose"
        href="/billing"
        tooltip="Total refunded payments in period"
      />

      {/* 4. Net Collections */}
      <DashboardKpiCard
        title="Net Collections"
        value={formatCurrency(data.netCollections?.current)}
        delta={data.netCollections}
        icon={BadgeDollarSign}
        badgeColor="purple"
        href="/billing"
        tooltip="Collections minus refunds"
      />

      {/* 5. Outstanding Receivables */}
      <DashboardKpiCard
        title="Receivables"
        value={formatCurrency(data.outstandingReceivables?.current)}
        delta={data.outstandingReceivables}
        subtitle="current unpaid dues"
        icon={AlertCircle}
        badgeColor="amber"
        href="/billing"
        tooltip="Total unpaid balance across finalized invoices"
      />

      {/* 6. Gross Billed Sales */}
      <DashboardKpiCard
        title="Gross Sales"
        value={formatCurrency(data.grossSales?.current)}
        delta={data.grossSales}
        icon={Receipt}
        badgeColor="blue"
        href="/billing"
        tooltip="Total catalog line-item subtotal before discounts"
      />

      {/* 7. Average Bill Value */}
      <DashboardKpiCard
        title="Avg Bill Value"
        value={formatCurrency(data.averageBillValue?.current)}
        delta={data.averageBillValue}
        icon={Calculator}
        badgeColor="primary"
        tooltip="Net Sales divided by count of finalized bills"
      />

      {/* 8. Total Appointments */}
      <DashboardKpiCard
        title="Appointments"
        value={(data.totalAppointments?.current ?? 0).toLocaleString()}
        delta={data.totalAppointments}
        icon={CalendarCheck}
        badgeColor="emerald"
        href="/appointments"
        tooltip="Bookings scheduled or completed in period"
      />

      {/* 9. New Customers */}
      <DashboardKpiCard
        title="New Customers"
        value={(data.newCustomers?.current ?? 0).toLocaleString()}
        delta={data.newCustomers}
        icon={UserPlus}
        badgeColor="blue"
        href="/customers"
        tooltip="First-time customers registered in period"
      />

      {/* 10. Repeat Customer Rate */}
      <DashboardKpiCard
        title="Repeat Rate"
        value={`${data.repeatCustomerRate?.current ?? 0}%`}
        delta={data.repeatCustomerRate}
        subtitle="returning visit cohort"
        icon={Users}
        badgeColor="purple"
        href="/customers"
        tooltip="Percentage of customers with >= 2 lifetime visits"
      />
    </div>
  );
}
