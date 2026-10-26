import React from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Building2, Calendar, User, FileText, CheckCircle2 } from "lucide-react";
import type { Subscription } from "../types/subscription.types";

interface SubscriptionOverviewTabProps {
  subscription: Subscription;
  getBranchName: (branchId: string) => string;
}

export function SubscriptionOverviewTab({
  subscription,
  getBranchName,
}: SubscriptionOverviewTabProps) {
  const customer = subscription.customer;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Identity Card */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
            <User className="h-4 w-4 text-primary" />
            Customer Information
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-semibold text-foreground">{customer?.name || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-semibold text-foreground">{customer?.phone || "N/A"}</span>
            </div>
            {customer?.email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-semibold text-foreground">{customer.email}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer ID:</span>
              <span className="font-mono text-muted-foreground">
                {typeof subscription.customerId === "string"
                  ? subscription.customerId
                  : (subscription.customerId as { _id?: string; id?: string })?._id || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Financial & Plan Card */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Plan & Pricing
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Agreed Price:</span>
              <span className="font-bold text-sm text-foreground">{formatCurrency(subscription.price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subscription Code:</span>
              <span className="font-mono font-bold text-foreground">{subscription.subscriptionCode || subscription.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pricing Nature:</span>
              <span className="text-muted-foreground">Custom Customer-Agreed</span>
            </div>
            {subscription.planId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan Template:</span>
                <span className="font-medium text-foreground">
                  {typeof subscription.planId === "object"
                    ? subscription.planId.name
                    : "Linked Template"}
                </span>
              </div>
            )}
            {subscription.paymentStatus && (
              <div className="flex justify-between items-center pt-1 border-t border-border/50">
                <span className="text-muted-foreground">Payment Status:</span>
                <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                  subscription.paymentStatus === "paid"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : subscription.paymentStatus === "partially_paid"
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}>
                  {subscription.paymentStatus.replace("_", " ")}
                </span>
              </div>
            )}
            {subscription.amountPaid !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(subscription.amountPaid)}
                </span>
              </div>
            )}
            {subscription.amountDue !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Due:</span>
                <span className={`font-semibold ${subscription.amountDue > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                  {formatCurrency(subscription.amountDue)}
                </span>
              </div>
            )}
            {subscription.invoiceId && (
              <div className="flex justify-between items-center pt-1 border-t border-border/50">
                <span className="text-muted-foreground">Sale Invoice:</span>
                <Link
                  href={`/billing/${subscription.invoiceId}`}
                  className="font-bold text-xs text-primary underline underline-offset-2 hover:opacity-80"
                >
                  {subscription.invoiceNumber || `#${subscription.invoiceId.slice(-6)}`}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Validity & Branch Access Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
            <Calendar className="h-4 w-4 text-primary" />
            Validity Period
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start Date:</span>
              <span className="font-semibold text-foreground">{formatDate(subscription.startDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">End Date:</span>
              <span className="font-semibold text-foreground">{formatDate(subscription.endDate)}</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
            <Building2 className="h-4 w-4 text-primary" />
            Permitted Branch Access
          </div>
          <div className="text-xs">
            {subscription.permittedBranchIds && subscription.permittedBranchIds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {subscription.permittedBranchIds.map((b, idx) => {
                  const rawBranch = b as unknown;
                  const bObj = typeof rawBranch === "object" && rawBranch !== null
                    ? (rawBranch as { _id?: string; id?: string; name?: string })
                    : undefined;
                  const branchId = bObj ? (bObj._id || bObj.id || "") : typeof b === "string" ? b : "";
                  const label = bObj?.name || (branchId ? getBranchName(branchId) : `Branch ${idx + 1}`);

                  return (
                    <span
                      key={branchId || idx}
                      className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md font-medium"
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> All Branches permitted for redemption
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Notes Card */}
      {subscription.notes && (
        <div className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
            <FileText className="h-4 w-4 text-primary" />
            Internal Notes
          </div>
          <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
            {subscription.notes}
          </p>
        </div>
      )}
    </div>
  );
}
