"use client";

import React from "react";
import {
  Users,
  CreditCard,
  Clock,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import type { MembershipReportsSummary } from "../types/membership.types";

interface MembershipsOverviewTabProps {
  reports?: MembershipReportsSummary | null;
  isLoading: boolean;
  onSellMembership: () => void;
  onCreatePlan: () => void;
  onViewCustomerMemberships: () => void;
  onViewPlansCatalog: () => void;
  canSell?: boolean;
  canConfigure?: boolean;
}

export function MembershipsOverviewTab({
  reports,
  isLoading,
  onSellMembership,
  onCreatePlan,
  onViewCustomerMemberships,
  onViewPlansCatalog,
  canSell = true,
  canConfigure = true,
}: MembershipsOverviewTabProps) {
  const summaryCards = [
    {
      title: "Active Memberships",
      value: reports?.activeMemberships ?? 0,
      sub: `${reports?.uniqueBeneficiariesCount ?? 0} unique beneficiaries`,
      icon: Users,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
      accent: "text-emerald-600",
    },
    {
      title: "Sold This Month",
      value: reports?.soldThisMonthCount ?? 0,
      sub: "New memberships issued",
      icon: TrendingUp,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
      accent: "text-blue-600",
    },
    {
      title: "Pending Payments",
      value: reports?.pendingPaymentCount ?? 0,
      sub: "Checkout invoices pending",
      icon: Clock,
      color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
      accent: "text-amber-600",
    },
    {
      title: "Expiring Soon",
      value: reports?.expiringSoonCount ?? 0,
      sub: "Within next 30 days",
      icon: AlertTriangle,
      color: "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800",
      accent: "text-rose-600",
    },
    {
      title: "Membership Revenue",
      value: formatCurrency(reports?.totalRevenue ?? 0),
      sub: `From ${reports?.totalMemberships ?? 0} total enrollments`,
      icon: CreditCard,
      color: "text-violet-600 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800",
      accent: "text-violet-600",
    },
    {
      title: "Active Catalog Plans",
      value: reports?.activePlansCount ?? 0,
      sub: "Standard tiers configured",
      icon: Sparkles,
      color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800",
      accent: "text-indigo-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={idx} className="border shadow-xs overflow-hidden">
              <CardContent className="p-5 flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold tracking-tight">
                    {isLoading ? "..." : card.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{card.sub}</p>
                </div>
                <div
                  className={`p-2.5 rounded-lg border ${card.color} shrink-0`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actionable Reception Quick-Launch Banner */}
      <div className="rounded-xl border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-background text-primary text-xs font-semibold">
              Reception Desk Guide
            </Badge>
            <span className="text-xs text-muted-foreground">Quick Actions</span>
          </div>
          <h3 className="text-base font-semibold text-foreground">
            Sell or Build Memberships Directly for Walk-ins & Appointments
          </h3>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Staff can sell standard catalogue plans or assemble completely customized memberships with custom pricing,
            discount privileges, and family beneficiaries without creating a permanent catalogue entry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {canSell && (
            <Button
              onClick={onSellMembership}
              size="sm"
              className="gap-1.5 shadow-sm text-xs font-semibold cursor-pointer"
            >
              <CreditCard className="w-4 h-4" /> Sell Membership
            </Button>
          )}
          {canConfigure && (
            <Button
              onClick={onCreatePlan}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-medium cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> New Catalog Plan
            </Button>
          )}
        </div>
      </div>

      {/* Quick Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="border shadow-xs hover:border-primary/40 transition-colors">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Active Customer Enrollments
                </span>
                <Badge variant="secondary" className="text-xs">
                  {reports?.activeMemberships ?? 0} Active
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Review all enrolled customers, track multiple family beneficiaries, verify validities, and manage
                suspensions or cancellations directly.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onViewCustomerMemberships}
              className="w-full text-xs cursor-pointer"
            >
              View Enrolled Memberships
            </Button>
          </CardContent>
        </Card>

        <Card className="border shadow-xs hover:border-primary/40 transition-colors">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Reusable Plan Catalog
                </span>
                <Badge variant="secondary" className="text-xs">
                  {reports?.activePlansCount ?? 0} Catalog Plans
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Browse salon-wide standardized tiers (Silver, Gold, Platinum), adjust service discounts, complimentary perks,
                and permitted branch privileges.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onViewPlansCatalog}
              className="w-full text-xs cursor-pointer"
            >
              Manage Catalog Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
