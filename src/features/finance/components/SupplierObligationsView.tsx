"use client";

import React from "react";
import { useFinancialAlerts } from "../hooks";
import { useProcurementOverview } from "@/features/procurement/hooks/useProcurement";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Truck,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Info,
  Package,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function SupplierObligationsView() {
  const { data: alerts, isLoading: alertsLoading } = useFinancialAlerts();
  const { data: procurementOverview, isLoading: procurementLoading } =
    useProcurementOverview();

  const supplierPayables =
    alerts?.outstandingSupplierInvoices?.totalUnpaidAmount ??
    procurementOverview?.outstandingSupplierBalance ??
    0;
  const supplierInvoicesCount =
    alerts?.outstandingSupplierInvoices?.count ??
    procurementOverview?.unpaidInvoicesCount ??
    0;

  return (
    <div className="space-y-6">
      {/* Header Overview Card */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Supplier Accounts Payable
            </span>
            <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-mono">
              Procurement & Inventory
            </span>
          </div>
          <div className="text-3xl font-extrabold font-mono text-foreground tracking-tight">
            {alertsLoading || procurementLoading ? "..." : formatCurrency(supplierPayables)}
          </div>
          <p className="text-xs text-muted-foreground">
            Authoritatively aggregated from verified Procurement invoices and outstanding vendor balances.
          </p>
        </div>

        <div>
          {supplierPayables === 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-3.5 py-2 rounded-xl">
              <ShieldCheck className="h-4 w-4" />
              All supplier invoices fully settled
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-3.5 py-2 rounded-xl">
              <AlertCircle className="h-4 w-4" />
              {supplierInvoicesCount} invoices pending payment
            </div>
          )}
        </div>
      </div>

      {/* Accounting Discrepancy & Double-Counting Safeguard Notice */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-xs text-foreground flex items-start gap-3">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-foreground">
            Procurement Double-Counting Safeguard
          </span>
          <p className="text-muted-foreground text-xs leading-relaxed">
            In our P&L and Operating Profit calculations, inventory purchases (<code className="font-mono text-primary">sourceType: "procurement_invoice"</code> for stock/supplies) are strictly excluded from Operating Expense overhead.
            They are tracked here as <strong>Accounts Payable liabilities</strong> until cash settlement via <code className="font-mono text-primary">SupplierPayment</code>, preventing double counting of inventory assets as operating costs.
            Legitimate non-stock procurement operational expenses (cleaning, plumbing, salon repairs) remain correctly recognized in Operating Expenses.
          </p>
        </div>
      </div>

      {/* Action and Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Vendor Obligations Register
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Outstanding bills by vendor
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Unpaid Invoices Total:</span>
              <span className="text-xl font-bold font-mono text-foreground">
                {formatCurrency(supplierPayables)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Invoices Awaiting Payment:</span>
              <span className="font-semibold text-foreground">{supplierInvoicesCount}</span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/40">
              Formula: Σ (totalAmount - amountPaid) across unpaid/partially-paid supplier invoices.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/procurement">
              <Button className="w-full text-xs font-semibold gap-2">
                Open Procurement & Invoices Register
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Cash Disbursement Audit Path
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Supplier payment trace
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-xs text-muted-foreground">
            <p>
              When supplier invoices are settled, the payments are recorded as <code className="font-mono text-foreground">SupplierPayment</code> records.
            </p>
            <p>
              These records immediately surface in the <strong>Financial Transactions Register</strong> as verified cash outflows with full voucher and invoice tracking.
            </p>
            <div className="pt-2">
              <Link href="/procurement?tab=purchase-orders">
                <Button variant="outline" className="w-full text-xs font-semibold gap-2">
                  View Purchase Orders & Goods Receipt
                  <Package className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
