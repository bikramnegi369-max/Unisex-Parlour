"use client";

import React from "react";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import type { Invoice } from "../types/billing.types";

interface PrintableInvoiceReceiptProps {
  invoice: Invoice;
  branchName?: string;
}

export const PrintableInvoiceReceipt = React.forwardRef<
  HTMLDivElement,
  PrintableInvoiceReceiptProps
>(({ invoice, branchName }, ref) => {
  const isSettled = invoice.amountDue <= 0;

  return (
    <div
      ref={ref}
      id="printable-receipt"
      className="hidden print:block text-black bg-white p-6 max-w-[80mm] sm:max-w-[100mm] mx-auto font-mono text-[11px] leading-tight"
    >
      {/* Receipt Header */}
      <div className="text-center pb-4 border-b border-black/40 space-y-1">
        <h1 className="text-base font-extrabold uppercase tracking-widest font-sans">
          UNISEX PARLOUR
        </h1>
        {branchName && (
          <p className="text-[11px] font-semibold text-gray-700 uppercase">
            Branch: {branchName}
          </p>
        )}
        <p className="text-[10px] text-gray-600">Commercial Invoice</p>
      </div>

      {/* Invoice & Appointment Meta */}
      <div className="py-3 border-b border-black/40 space-y-1 text-[10px]">
        <div className="flex justify-between">
          <span className="font-semibold">Invoice No:</span>
          <span className="font-bold">{invoice.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date & Time:</span>
          <span>{formatDateTime(invoice.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>Status:</span>
          <span className="uppercase font-bold">{invoice.status}</span>
        </div>
        <div className="flex justify-between">
          <span>Payment Status:</span>
          <span className="uppercase font-bold">{invoice.paymentStatus}</span>
        </div>
        {invoice.appointmentCode && (
          <div className="flex justify-between">
            <span>Appointment:</span>
            <span>{invoice.appointmentCode}</span>
          </div>
        )}
        {invoice.customer && (
          <div className="flex justify-between pt-1 border-t border-dashed border-gray-300">
            <span>Customer:</span>
            <span className="font-semibold">
              {invoice.customer.name}{" "}
              {invoice.customer.phone ? `(${invoice.customer.phone})` : ""}
            </span>
          </div>
        )}
      </div>

      {/* Line Items Table */}
      <div className="py-3 border-b border-black/40">
        <div className="flex justify-between font-bold pb-1 text-[10px] uppercase border-b border-gray-300">
          <span>Item</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="divide-y divide-gray-200">
          {invoice.items.map((item, idx) => {
            const isProduct = item.lineType === "product" || Boolean(item.productId);
            const isSubscription = item.lineType === "subscription";
            const isMembership = item.lineType === "membership";
            const isRedeemed = Boolean(
              item.isRedeemedViaSubscription ||
              item.appliedSubscriptionId ||
              (item.subscriptionCoveredAmount &&
                item.subscriptionCoveredAmount > 0),
            );
            const isDiscountedByMem = Boolean(
              item.isDiscountedByMembership ||
              (item.membershipDiscountAmount && item.membershipDiscountAmount > 0)
            );
            const payable =
              item.customerPayable !== undefined
                ? item.customerPayable
                : Math.max(
                    0,
                    item.lineTotal - (item.subscriptionCoveredAmount || 0) - (item.membershipDiscountAmount || 0),
                  );

            return (
              <div key={item.id || idx} className="py-1.5 space-y-0.5">
                <div className="flex justify-between">
                  <span className="font-semibold">
                    {item.name || item.productName || item.serviceName}
                    {item.quantity > 1 ? ` (x${item.quantity})` : ""}
                  </span>
                  <span className="text-right font-medium">
                    {formatCurrency(item.unitPrice * (item.quantity || 1))}
                  </span>
                </div>
                {isProduct && item.sku && (
                  <div className="text-[9px] text-gray-500">
                    [Product] SKU: {item.sku} {item.stockUnit ? `• Unit: ${item.stockUnit}` : ""}
                  </div>
                )}
                {isSubscription && (
                  <div className="text-[9px] text-indigo-700">
                    [Subscription Package] Prepaid Multi-Session
                  </div>
                )}
                {isMembership && (
                  <div className="text-[9px] text-amber-700">
                    [Membership Tier] {item.membershipTierSnapshot || "VIP"} Tier Plan
                  </div>
                )}
                {!isProduct && !isSubscription && !isMembership && item.duration && (
                  <div className="text-[9px] text-gray-500">
                    [Service] {item.duration} mins
                  </div>
                )}
                {isRedeemed && (
                  <div className="flex justify-between text-[9px] text-emerald-800 italic">
                    <span>
                      ↳ Covered via Subscription{" "}
                      {item.subscriptionCode
                        ? `(${item.subscriptionCode})`
                        : ""}
                    </span>
                    <span>
                      -
                      {formatCurrency(
                        item.subscriptionCoveredAmount || item.unitPrice,
                      )}
                    </span>
                  </div>
                )}
                {isDiscountedByMem && (
                  <div className="flex justify-between text-[9px] text-amber-800 italic">
                    <span>↳ Member Tier Benefit Discount</span>
                    <span>-{formatCurrency(item.membershipDiscountAmount || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[10px] font-bold pt-0.5">
                  <span className="text-gray-600">Net Line Total:</span>
                  <span>{formatCurrency(payable)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial Breakdown Totals */}
      <div className="py-3 border-b border-black/40 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span>Gross Subtotal:</span>
          <span>{formatCurrency(invoice.subtotal)}</span>
        </div>
        {(() => {
          const membershipDiscountTotal = (invoice.items || []).reduce(
            (sum, item) => sum + (item.membershipDiscountAmount || 0),
            0
          );
          const hasAnyDiscount =
            invoice.discountTotal > 0 || membershipDiscountTotal > 0;
          if (!hasAnyDiscount) return null;
          return (
            <>
              {invoice.discountTotal > 0 && (
                <div className="flex justify-between text-gray-800 font-semibold">
                  <span>Total Discounts:</span>
                  <span>-{formatCurrency(invoice.discountTotal)}</span>
                </div>
              )}
              {membershipDiscountTotal > 0 && (
                <div className="flex justify-between text-gray-600 pl-3 text-[10px]">
                  <span>↳ Membership Benefit:</span>
                  <span>-{formatCurrency(membershipDiscountTotal)}</span>
                </div>
              )}
              {invoice.coupon && invoice.coupon.calculatedDiscountAmount > 0 && (
                <div className="flex justify-between text-gray-600 pl-3 text-[10px]">
                  <span>↳ Coupon ({invoice.coupon.codeUpper || invoice.coupon.code}):</span>
                  <span>-{formatCurrency(invoice.coupon.calculatedDiscountAmount)}</span>
                </div>
              )}
              {(invoice.lineDiscountsTotal ?? 0) > 0 && (
                <div className="flex justify-between text-gray-600 pl-3 text-[10px]">
                  <span>↳ Manual Line Discounts:</span>
                  <span>-{formatCurrency(invoice.lineDiscountsTotal!)}</span>
                </div>
              )}
              {(invoice.invoiceDiscountsTotal ?? 0) > 0 && (
                <div className="flex justify-between text-gray-600 pl-3 text-[10px]">
                  <span>↳ Manual Invoice Discounts:</span>
                  <span>-{formatCurrency(invoice.invoiceDiscountsTotal!)}</span>
                </div>
              )}
            </>
          );
        })()}
        {invoice.subscriptionCoveredAmount > 0 && (
          <div className="flex justify-between font-semibold">
            <span>Subscription Waived:</span>
            <span>-{formatCurrency(invoice.subscriptionCoveredAmount)}</span>
          </div>
        )}
        <div className="flex justify-between font-extrabold text-xs pt-1 border-t border-black/20">
          <span>Total Payable:</span>
          <span>{formatCurrency(invoice.payableAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Amount Paid:</span>
          <span>{formatCurrency(invoice.amountPaid)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Balance Due:</span>
          <span>{formatCurrency(invoice.amountDue)}</span>
        </div>
      </div>

      {/* Footer Notes & Receipt Settlement Notice */}
      <div className="pt-4 text-center space-y-1.5 text-[9px] text-gray-600">
        {isSettled ? (
          <div className="font-bold text-[10px] uppercase tracking-wider text-black">
            *** PAID IN FULL ***
          </div>
        ) : (
          <div className="font-bold text-[10px] uppercase tracking-wider text-black">
            *** PAYMENT PENDING ***
          </div>
        )}
        {invoice.notes && <p className="italic">Note: {invoice.notes}</p>}
        <p>Thank you for visiting! Please visit us again.</p>
        <p className="text-[8px] text-gray-400">
          Generated automatically by Unisex Parlour ERP
        </p>
      </div>
    </div>
  );
});

PrintableInvoiceReceipt.displayName = "PrintableInvoiceReceipt";
