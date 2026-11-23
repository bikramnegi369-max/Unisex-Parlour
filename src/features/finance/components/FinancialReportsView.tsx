"use client";

import React, { useState } from "react";
import { useFinancialReports, useExportFinancialReport } from "../hooks";
import { ReportQueryParams } from "../types/finance.types";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  Receipt,
  Store,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react";

type ReportType =
  | "pnl_statement"
  | "tender_reconciliation"
  | "expense_breakdown"
  | "revenue_streams";

export default function FinancialReportsView() {
  const today = new Date();
  const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const defaultEndDate = today.toISOString().split("T")[0];

  const [reportType, setReportType] = useState<ReportType>("pnl_statement");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const queryParams: ReportQueryParams = {
    reportType,
    startDate,
    endDate,
    format: "json",
  };

  const { data: reportData, isLoading, isError, refetch } = useFinancialReports(queryParams);
  const { mutate: exportCsv, isPending: isExporting } = useExportFinancialReport();

  const handleExport = () => {
    exportCsv({
      reportType,
      startDate,
      endDate,
      format: "csv",
    });
  };

  const handlePreset = (type: "today" | "mtd" | "last_month" | "ytd") => {
    const now = new Date();
    if (type === "today") {
      const d = now.toISOString().split("T")[0];
      setStartDate(d);
      setEndDate(d);
    } else if (type === "mtd") {
      setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (type === "last_month") {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString()
        .split("T")[0];
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        .toISOString()
        .split("T")[0];
      setStartDate(firstDayLastMonth);
      setEndDate(lastDayLastMonth);
    } else if (type === "ytd") {
      setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    }
  };

  const reportTabs = [
    {
      key: "pnl_statement",
      label: "Operating P&L Statement",
      icon: TrendingUp,
      description: "Net Revenue, Operating Overhead, Workforce Payroll, and Operating Result",
    },
    {
      key: "tender_reconciliation",
      label: "Tender Reconciliation",
      icon: Store,
      description: "Collections, refunds, and daily register count discrepancies",
    },
    {
      key: "expense_breakdown",
      label: "Operating Expenses Breakdown",
      icon: Receipt,
      description: "Category-wise approved operating expenses and store overhead",
    },
    {
      key: "revenue_streams",
      label: "Revenue Streams Summary",
      icon: DollarSign,
      description: "Services, retail products, memberships, and package subscriptions",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Controls & Export Bar */}
      <div className="bg-card p-5 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Authoritative Financial Reports & Exports
              </h2>
              <p className="text-xs text-muted-foreground">
                Generate GAAP-aligned operational statements and download audit-ready CSV datasets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleExport}
              disabled={isExporting || isLoading}
              className="gap-2 text-xs font-semibold"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        {/* Date Filters & Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Preset:</span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreset("today")}
                className="text-[11px] h-7 px-2.5"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreset("mtd")}
                className="text-[11px] h-7 px-2.5 font-bold"
              >
                MTD
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreset("last_month")}
                className="text-[11px] h-7 px-2.5"
              >
                Last Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreset("ytd")}
                className="text-[11px] h-7 px-2.5"
              >
                YTD
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-[11px]">Start:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 rounded-xl border border-border bg-background text-foreground text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-[11px]">End:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 rounded-xl border border-border bg-background text-foreground text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Report Type Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = reportType === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setReportType(tab.key as ReportType)}
              className={`p-4 rounded-2xl border text-left transition-all duration-150 space-y-1.5 ${
                isSelected
                  ? "bg-card border-primary ring-1 ring-primary shadow-xs"
                  : "bg-card/60 border-border hover:bg-card hover:border-border/80"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={`h-4 w-4 ${
                    isSelected ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-xs font-bold ${
                    isSelected ? "text-primary" : "text-foreground"
                  }`}
                >
                  {tab.label}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                {tab.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Report Content Preview */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {reportTabs.find((t) => t.key === reportType)?.label}
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              Period: {startDate} to {endDate}
            </span>
          </div>

          <span className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground font-mono">
            Format: Authoritative In-App Preview
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            <p className="text-xs text-muted-foreground">Aggregating financial ledger data...</p>
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-xs text-destructive space-y-2">
            <AlertCircle className="h-6 w-6 mx-auto" />
            <p>Failed to load financial report data. Please verify your date range and permissions.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Render Preview according to report type */}
            {reportType === "pnl_statement" && (
              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200">
                  <strong>Notice:</strong> Operating Result reflects Net Revenue minus Operating
                  Overhead and Finalized Gross Payroll. Stock consumption (COGS) is excluded due to lack
                  of batch valuation.
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground font-semibold">
                        <th className="py-2.5 px-3">Line Item</th>
                        <th className="py-2.5 px-3">Classification</th>
                        <th className="py-2.5 px-3 text-right">Paise / Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-mono">
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          Gross Invoiced Revenue
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">Invoiced Sales</td>
                        <td className="py-2.5 px-3 text-right text-foreground font-bold">
                          {formatCurrency(reportData?.grossRevenue || 0)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-rose-600 dark:text-rose-400">
                          Less: Invoiced Refunds
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">Revenue Deductions</td>
                        <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">
                          -{formatCurrency(reportData?.refunds || 0)}
                        </td>
                      </tr>
                      <tr className="bg-muted/30 font-bold">
                        <td className="py-2.5 px-3 text-foreground">Net Invoiced Revenue</td>
                        <td className="py-2.5 px-3 text-muted-foreground">Base Revenue</td>
                        <td className="py-2.5 px-3 text-right text-foreground">
                          {formatCurrency(reportData?.netRevenue || 0)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          Operating Expenses Overhead
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">Non-Stock Overhead</td>
                        <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">
                          -{formatCurrency(reportData?.operatingExpenses?.total || 0)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          Workforce Payroll Compensation
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          Gross Payroll ({reportData?.workforceCosts?.approvedStaffCount || 0} staff)
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">
                          -{formatCurrency(reportData?.workforceCosts?.finalizedGrossPayroll || 0)}
                        </td>
                      </tr>
                      <tr className="bg-primary/5 font-extrabold text-sm border-t-2 border-primary">
                        <td className="py-3 px-3 text-primary">Operating Result</td>
                        <td className="py-3 px-3 text-xs text-muted-foreground font-normal">
                          Margin: {reportData?.operatingMarginPercentage || 0}%
                        </td>
                        <td className="py-3 px-3 text-right text-primary">
                          {formatCurrency(
                            reportData?.operatingResult ?? reportData?.operatingProfit ?? 0
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportType === "tender_reconciliation" && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground font-semibold">
                        <th className="py-2.5 px-3">Tender Method</th>
                        <th className="py-2.5 px-3 text-right">Inflow Collected</th>
                        <th className="py-2.5 px-3 text-right">Refunds Paid</th>
                        <th className="py-2.5 px-3 text-right">Net Tender Collections</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-mono">
                      {[
                        { method: "Cash", key: "cash" },
                        { method: "Card (POS)", key: "card" },
                        { method: "UPI / QR", key: "upi" },
                        { method: "Other / Direct", key: "other" },
                      ].map((tender) => {
                        const coll = (reportData?.collections as any)?.[tender.key] || 0;
                        return (
                          <tr key={tender.key}>
                            <td className="py-2.5 px-3 font-semibold text-foreground">
                              {tender.method}
                            </td>
                            <td className="py-2.5 px-3 text-right text-foreground">
                              {formatCurrency(coll)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">--</td>
                            <td className="py-2.5 px-3 text-right font-bold text-foreground">
                              {formatCurrency(coll)}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-muted/40 font-bold border-t-2 border-border">
                        <td className="py-2.5 px-3 text-foreground">Total Tender Collections</td>
                        <td className="py-2.5 px-3 text-right text-foreground">
                          {formatCurrency(reportData?.collections?.totalCollected || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-600">
                          -{formatCurrency(reportData?.refunds || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-primary font-extrabold">
                          {formatCurrency(reportData?.collections?.netCollections || 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportType === "expense_breakdown" && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground font-semibold">
                        <th className="py-2.5 px-3">Overhead Category</th>
                        <th className="py-2.5 px-3 text-right">Total Amount</th>
                        <th className="py-2.5 px-3 text-right">% of Total Overhead</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-mono">
                      {Object.entries(reportData?.operatingExpenses || {})
                        .filter(([k]) => k !== "total")
                        .map(([cat, amt]: [string, any]) => {
                          const total = reportData?.operatingExpenses?.total || 1;
                          const pct = ((amt / total) * 100).toFixed(1);
                          return (
                            <tr key={cat}>
                              <td className="py-2.5 px-3 font-semibold text-foreground capitalize">
                                {cat.replace(/_/g, " ")}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-foreground">
                                {formatCurrency(amt)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-muted-foreground">
                                {pct}%
                              </td>
                            </tr>
                          );
                        })}
                      <tr className="bg-muted/40 font-bold border-t-2 border-border">
                        <td className="py-2.5 px-3 text-foreground">Total Operating Overhead</td>
                        <td className="py-2.5 px-3 text-right text-foreground font-extrabold">
                          {formatCurrency(reportData?.operatingExpenses?.total || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">100.0%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportType === "revenue_streams" && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground font-semibold">
                        <th className="py-2.5 px-3">Revenue Stream</th>
                        <th className="py-2.5 px-3 text-right">Invoiced Amount</th>
                        <th className="py-2.5 px-3 text-right">Share of Gross Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-mono">
                      {[
                        { label: "Salon Services", key: "services" },
                        { label: "Retail Products", key: "retailProducts" },
                        { label: "Memberships", key: "memberships" },
                        { label: "Package Subscriptions", key: "subscriptions" },
                      ].map((stream) => {
                        const amount = (reportData?.revenueStreams as any)?.[stream.key] || 0;
                        const gross = reportData?.grossRevenue || 1;
                        const pct = ((amount / gross) * 100).toFixed(1);
                        return (
                          <tr key={stream.key}>
                            <td className="py-2.5 px-3 font-semibold text-foreground">
                              {stream.label}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-foreground">
                              {formatCurrency(amount)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">
                              {pct}%
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-muted/40 font-bold border-t-2 border-border">
                        <td className="py-2.5 px-3 text-foreground">Total Gross Revenue</td>
                        <td className="py-2.5 px-3 text-right text-foreground font-extrabold">
                          {formatCurrency(reportData?.grossRevenue || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">100.0%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
