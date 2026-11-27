"use client";

import React, { useState } from "react";
import { useForm, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  supplierInvoiceFormSchema,
  SupplierInvoiceFormValues,
  supplierPaymentFormSchema,
  SupplierPaymentFormValues,
} from "../schemas/procurement.schemas";
import {
  useSupplierInvoices,
  useCreateSupplierInvoice,
  useSupplierPayments,
  useRecordSupplierPayment,
  useSuppliers,
  usePurchaseOrders,
} from "../hooks/useProcurement";
import { procurementApi } from "../api/procurement.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import {
  SupplierInvoice,
  SupplierPayment,
  Supplier,
  PurchaseOrder,
} from "../types/procurement.types";
import {
  Receipt,
  Plus,
  CreditCard,
  RefreshCw,
  Eye,
  Printer,
  Download,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "sonner";

export default function SupplierInvoicesView() {
  const { user } = useAuth();
  const { currentBranchId } = useBranchContext();
  const canManageInvoices = hasPermission(user, "procurement.invoices.manage");
  const canManagePayments = hasPermission(user, "procurement.payments.manage");

  const [activeTab, setActiveTab] = useState<"invoices" | "payments">(
    "invoices",
  );
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [invoicesLimit, setInvoicesLimit] = useState(20);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsLimit, setPaymentsLimit] = useState(20);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] =
    useState<SupplierInvoice | null>(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<
    string | null
  >(null);
  const [viewingPayment, setViewingPayment] = useState<SupplierPayment | null>(
    null,
  );
  const [viewingInvoice, setViewingInvoice] = useState<SupplierInvoice | null>(
    null,
  );

  const {
    data: invoicesData,
    isLoading: invoicesLoading,
    isFetching: invoicesFetching,
    refetch: refetchInvoices,
  } = useSupplierInvoices({
    branchId: currentBranchId,
    page: invoicesPage,
    limit: invoicesLimit,
  });

  const {
    data: paymentsData,
    isLoading: paymentsLoading,
    isFetching: paymentsFetching,
    refetch: refetchPayments,
  } = useSupplierPayments({
    branchId: currentBranchId,
    page: paymentsPage,
    limit: paymentsLimit,
  });

  const { data: suppliersData } = useSuppliers({
    status: "active",
    limit: 100,
  });
  const { data: ordersData } = usePurchaseOrders({
    branchId: currentBranchId,
    limit: 100,
  });

  const suppliers: Supplier[] = suppliersData?.data || [];
  const orders: PurchaseOrder[] = ordersData?.data || [];

  const createInvoiceMutation = useCreateSupplierInvoice();
  const recordPaymentMutation = useRecordSupplierPayment();

  // Invoice Form
  const invoiceForm = useForm<SupplierInvoiceFormValues>({
    resolver: zodResolver(supplierInvoiceFormSchema),
    defaultValues: {
      supplierId: "",
      invoiceDate: "",
      dueDate: "",
      totalAmount: 0,
      notes: "",
    },
  });

  // Payment Form
  const paymentForm = useForm<SupplierPaymentFormValues>({
    resolver: zodResolver(supplierPaymentFormSchema),
    defaultValues: {
      supplierId: "",
      supplierInvoiceId: "",
      amount: 0,
      paymentMethod: "bank_transfer",
      paymentDate: new Date().toISOString().split("T")[0],
      referenceNote: "",
    },
  });

  const handleOpenRecordPayment = (inv: SupplierInvoice) => {
    setSelectedInvoice(inv);
    const outstanding = Math.max(0, inv.totalAmount - (inv.amountPaid || 0));
    const normalizedSupplierId =
      typeof inv.supplierId === "object" && inv.supplierId !== null
        ? (inv.supplierId as { _id?: string; id?: string })._id ||
          (inv.supplierId as { _id?: string; id?: string }).id ||
          ""
        : inv.supplierId || "";
    paymentForm.reset({
      supplierId: normalizedSupplierId,
      supplierInvoiceId: inv.id,
      amount: outstanding,
      paymentMethod: "bank_transfer",
      paymentDate: new Date().toISOString().split("T")[0],
      referenceNote: `Settlement for #${inv.invoiceNumber}`,
    });
    setIsPaymentModalOpen(true);
  };

  const getRelatedPO = (inv: SupplierInvoice): PurchaseOrder | undefined => {
    const poId =
      typeof inv.purchaseOrderId === "object" && inv.purchaseOrderId !== null
        ? (inv.purchaseOrderId as { _id?: string; id?: string })._id ||
          (inv.purchaseOrderId as { _id?: string; id?: string }).id
        : inv.purchaseOrderId;
    if (!poId) return undefined;
    return orders.find((po: PurchaseOrder) => po.id === poId);
  };

  const handleDownloadOfficialPdf = async (inv: SupplierInvoice) => {
    if (downloadingInvoiceId) return;
    setDownloadingInvoiceId(inv.id);
    const toastId = toast.loading(
      `Generating official PDF for ${inv.invoiceNumber}...`,
      {
        style: {
          background: "#ecfdf5",
          color: "#065f46",
          border: "1px solid #6ee7b7",
        },
      },
    );
    try {
      await procurementApi.downloadSupplierInvoicePdf(
        inv.id,
        inv.invoiceNumber,
      );
      toast.success("Official PDF downloaded", { id: toastId });
    } catch {
      toast.error("Failed to download official PDF", { id: toastId });
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const handlePrintInvoice = (inv: SupplierInvoice) => {
    const vendorName =
      (typeof inv.supplierId === "object" && inv.supplierId !== null
        ? (inv.supplierId as { name?: string }).name
        : undefined) ||
      inv.supplier?.name ||
      "—";
    const poNumber =
      (typeof inv.purchaseOrderId === "object" && inv.purchaseOrderId !== null
        ? (inv.purchaseOrderId as { poNumber?: string }).poNumber
        : undefined) ||
      inv.purchaseOrder?.poNumber ||
      "Standalone";
    const relatedPO = getRelatedPO(inv);
    const outstanding = Math.max(0, inv.totalAmount - (inv.amountPaid || 0));

    const poRows = relatedPO?.items?.length
      ? relatedPO.items
          .map((line) => {
            const prodName =
              (typeof line.productId === "object" && line.productId !== null
                ? (line.productId as { name?: string }).name
                : undefined) ||
              line.product?.name ||
              "Product";
            return `<tr>
              <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${prodName}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${line.orderedQuantity}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">₹${line.unitCostPrice.toLocaleString()}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">₹${line.lineTotal.toLocaleString()}</td>
            </tr>`;
          })
          .join("")
      : "";

    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) {
      toast.error("Please allow popups to print or save the invoice as PDF.");
      return;
    }

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Official Invoice - ${inv.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 36px; color: #0f172a; font-size: 13px; max-width: 820px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
    .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
    .doc-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; margin-top: 2px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #f1f5f9; border: 1px solid #cbd5e1; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .box { padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
    .box-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 8px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { text-align: left; padding: 9px 10px; background: #f1f5f9; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; border-bottom: 1px solid #cbd5e1; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    .summary { margin-left: auto; width: 280px; margin-top: 16px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
    .summary-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .summary-total { display: flex; justify-content: space-between; padding-top: 8px; margin-top: 8px; border-top: 2px solid #0f172a; font-size: 15px; font-weight: 800; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Unisex Parlour ERP</div>
      <div class="doc-title">Official Supplier Invoice</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:16px;font-weight:700;">${inv.invoiceNumber}</div>
      <div style="margin-top:4px;"><span class="badge">${inv.status.replace("_", " ")}</span></div>
    </div>
  </div>
  <div class="meta-grid">
    <div class="box">
      <div class="box-title">Vendor / Supplier</div>
      <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${vendorName}</div>
      <div style="color:#475569;">Supplier Ref #: ${inv.supplierInvoiceRef || "—"}</div>
    </div>
    <div class="box">
      <div class="box-title">Invoice Details</div>
      <div class="row"><span>Related PO:</span><strong>${poNumber}</strong></div>
      <div class="row"><span>Invoice Date:</span><strong>${new Date(inv.invoiceDate).toLocaleDateString()}</strong></div>
      <div class="row"><span>Due Date:</span><strong>${new Date(inv.dueDate).toLocaleDateString()}</strong></div>
    </div>
  </div>
  ${
    poRows
      ? `<table>
           <thead><tr><th>Product</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Unit Cost</th><th style="text-align:right;">Total</th></tr></thead>
           <tbody>${poRows}</tbody>
         </table>`
      : ""
  }
  <div class="summary">
    <div class="summary-row"><span>Total Amount</span><strong>₹${inv.totalAmount.toLocaleString()}</strong></div>
    <div class="summary-row"><span>Amount Paid</span><strong>₹${(inv.amountPaid || 0).toLocaleString()}</strong></div>
    <div class="summary-total"><span>Balance Due</span><span>₹${outstanding.toLocaleString()}</span></div>
  </div>
  ${inv.notes ? `<div class="box" style="margin-top:16px;"><div class="box-title">Notes</div><div>${inv.notes}</div></div>` : ""}
  <div class="footer">Generated by Unisex Parlour ERP • Official Supplier Settlement Record</div>
</body>
</html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const onInvoiceSubmit = async (values: SupplierInvoiceFormValues) => {
    const payload = {
      ...values,
      branchId: currentBranchId || undefined,
      purchaseOrderId: values.purchaseOrderId || undefined,
    };
    await createInvoiceMutation.mutateAsync(payload);
    setIsInvoiceModalOpen(false);
  };

  const onPaymentSubmit = async (values: SupplierPaymentFormValues) => {
    const payload = {
      ...values,
      branchId: currentBranchId || undefined,
    };
    await recordPaymentMutation.mutateAsync(payload);
    setIsPaymentModalOpen(false);
  };

  const onPaymentInvalid = (
    formErrors: FieldErrors<SupplierPaymentFormValues>,
  ) => {
    const firstErr = Object.values(formErrors || {})[0] as
      | { message?: string }
      | undefined;
    toast.error(
      firstErr?.message || "Please check the payment fields and try again.",
    );
  };

  const invoices: SupplierInvoice[] = invoicesData?.data || [];
  const payments: SupplierPayment[] = paymentsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Receipt className="h-6 w-6 text-primary" />
            Supplier Invoices & Settlements
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Track vendor bills, payment due dates, and record cash/bank
            settlements with automatic outstanding balance reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              activeTab === "invoices" ? refetchInvoices() : refetchPayments()
            }
            disabled={
              activeTab === "invoices" ? invoicesFetching : paymentsFetching
            }
            className="text-xs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${
                (activeTab === "invoices" ? invoicesFetching : paymentsFetching)
                  ? "animate-spin"
                  : ""
              }`}
            />
            Sync
          </Button>
          <Button
            variant={activeTab === "invoices" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("invoices")}
            className="text-xs"
          >
            Invoices ({invoices.length})
          </Button>
          <Button
            variant={activeTab === "payments" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("payments")}
            className="text-xs"
          >
            Payment Log ({payments.length})
          </Button>
          {canManageInvoices && (
            <Button
              onClick={() => {
                invoiceForm.reset({
                  supplierId: suppliers?.[0]?.id || "",
                  invoiceDate: new Date().toISOString().split("T")[0],
                  dueDate: new Date(Date.now() + 30 * 86400000)
                    .toISOString()
                    .split("T")[0],
                  totalAmount: 0,
                });
                setIsInvoiceModalOpen(true);
              }}
              size="sm"
              className="font-semibold text-xs ml-2"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Log Vendor Bill
            </Button>
          )}
        </div>
      </div>

      {activeTab === "invoices" ? (
        <div className="space-y-3">
          {invoicesLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground bg-card rounded-xl border border-border animate-pulse">
              Loading supplier invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center bg-card rounded-2xl border border-border space-y-3">
              <Receipt className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">
                No invoices on file
              </h3>
              <p className="text-xs text-muted-foreground">
                Record distributor invoices against purchase orders to manage
                payables.
              </p>
            </div>
          ) : (
            invoices.map((inv: SupplierInvoice) => {
              const outstanding = Math.max(
                0,
                inv.totalAmount - (inv.amountPaid || 0),
              );

              return (
                <div
                  key={inv.id}
                  className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        {inv.invoiceNumber}
                      </span>
                      {inv.supplierInvoiceRef && (
                        <span className="text-[11px] text-muted-foreground">
                          (Ref: {inv.supplierInvoiceRef})
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                          inv.status === "paid"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : inv.status === "partially_paid"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {inv.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>
                        Vendor:{" "}
                        {(typeof inv.supplierId === "object" &&
                        inv.supplierId !== null
                          ? (inv.supplierId as { name?: string }).name
                          : undefined) ||
                          inv.supplier?.name ||
                          "—"}
                      </span>
                      <span>•</span>
                      <span>
                        Due: {new Date(inv.dueDate).toLocaleDateString()}
                      </span>
                      {((typeof inv.purchaseOrderId === "object" &&
                      inv.purchaseOrderId !== null
                        ? (inv.purchaseOrderId as { poNumber?: string })
                            .poNumber
                        : undefined) ||
                        inv.purchaseOrder?.poNumber) && (
                        <>
                          <span>•</span>
                          <span>
                            PO:{" "}
                            {(typeof inv.purchaseOrderId === "object" &&
                            inv.purchaseOrderId !== null
                              ? (inv.purchaseOrderId as { poNumber?: string })
                                  .poNumber
                              : undefined) || inv.purchaseOrder?.poNumber}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="text-muted-foreground text-[11px]">
                        Paid: ₹{(inv.amountPaid || 0).toLocaleString()} / ₹
                        {inv.totalAmount.toLocaleString()}
                      </div>
                      <div className="font-bold text-foreground">
                        Balance: ₹{outstanding.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingInvoice(inv)}
                        className="text-xs h-8 px-2.5"
                        title="View Invoice Details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePrintInvoice(inv)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        title="Quick Print Receipt"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={downloadingInvoiceId === inv.id}
                        onClick={() => handleDownloadOfficialPdf(inv)}
                        className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400 dark:hover:text-emerald-300"
                        title="Official PDF"
                      >
                        <FileText
                          className={`h-3.5 w-3.5 ${
                            downloadingInvoiceId === inv.id
                              ? "animate-pulse"
                              : ""
                          }`}
                        />
                      </Button>
                      {canManagePayments && inv.status !== "paid" && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenRecordPayment(inv)}
                          className="text-xs h-8"
                        >
                          <CreditCard className="h-3.5 w-3.5 mr-1" />
                          Pay
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {invoicesData?.meta && (
            <Pagination
              currentPage={Number(invoicesData.meta.page)}
              totalPages={invoicesData.meta.totalPages}
              totalItems={invoicesData.meta.total}
              onPageChange={setInvoicesPage}
              pageSize={invoicesLimit}
              onPageSizeChange={(newSize) => {
                setInvoicesLimit(newSize);
                setInvoicesPage(1);
              }}
              itemLabel="invoices"
            />
          )}
        </div>
      ) : (
        /* Payments Tab */
        <div className="space-y-3">
          {paymentsLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground bg-card rounded-xl border border-border animate-pulse">
              Loading payment history...
            </div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center bg-card rounded-2xl border border-border space-y-3">
              <CreditCard className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">
                No payments recorded
              </h3>
              <p className="text-xs text-muted-foreground">
                Vendor settlement disbursements will be logged here.
              </p>
            </div>
          ) : (
            payments.map((pay: SupplierPayment) => {
              const vendorName =
                (typeof pay.supplierId === "object" && pay.supplierId !== null
                  ? (pay.supplierId as { name?: string }).name
                  : undefined) || pay.supplier?.name;
              const invoiceNumber =
                (typeof pay.supplierInvoiceId === "object" &&
                pay.supplierInvoiceId !== null
                  ? (pay.supplierInvoiceId as { invoiceNumber?: string })
                      .invoiceNumber
                  : undefined) || pay.supplierInvoice?.invoiceNumber;

              return (
                <div
                  key={pay.id || (pay as { _id?: string })._id}
                  className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        {pay.paymentNumber}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {pay.paymentMethod.replace("_", " ")}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Vendor: {vendorName || "—"} • Invoice:{" "}
                      {invoiceNumber || "N/A"}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{pay.amount.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(pay.paymentDate).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingPayment(pay)}
                      className="text-xs h-8 px-2.5"
                      title="View Payment Details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}

          {paymentsData?.meta && (
            <Pagination
              currentPage={Number(paymentsData.meta.page)}
              totalPages={paymentsData.meta.totalPages}
              totalItems={paymentsData.meta.total}
              onPageChange={setPaymentsPage}
              pageSize={paymentsLimit}
              onPageSizeChange={(newSize) => {
                setPaymentsLimit(newSize);
                setPaymentsPage(1);
              }}
              itemLabel="payments"
            />
          )}
        </div>
      )}

      {/* Record Invoice Dialog */}
      <Dialog
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Log Incoming Supplier Bill"
        maxWidth="md"
      >
        <form
          onSubmit={invoiceForm.handleSubmit(onInvoiceSubmit)}
          className="space-y-3 py-2 text-xs"
        >
          <div>
            <label className="font-medium text-foreground">Supplier *</label>
            <select
              {...invoiceForm.register("supplierId")}
              className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
            >
              {suppliers.map((s: Supplier) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-foreground">
                Supplier Bill / Ref #
              </label>
              <Input
                {...invoiceForm.register("supplierInvoiceRef")}
                className="mt-1"
                placeholder="e.g. INV-9901"
              />
            </div>
            <div>
              <label className="font-medium text-foreground">
                Related Purchase Order
              </label>
              <select
                {...invoiceForm.register("purchaseOrderId")}
                className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="">None / Standalone</option>
                {orders
                  .filter((po: PurchaseOrder) => {
                    if (po.status === "cancelled") return false;
                    const hasInvoice = invoices.some((inv: SupplierInvoice) => {
                      const invPoId =
                        typeof inv.purchaseOrderId === "object" &&
                        inv.purchaseOrderId !== null
                          ? (
                              inv.purchaseOrderId as {
                                _id?: string;
                                id?: string;
                              }
                            )._id ||
                            (
                              inv.purchaseOrderId as {
                                _id?: string;
                                id?: string;
                              }
                            ).id
                          : inv.purchaseOrderId;
                      return invPoId === po.id;
                    });
                    return !hasInvoice;
                  })
                  .map((po: PurchaseOrder) => (
                    <option key={po.id} value={po.id}>
                      {po.poNumber} (₹{po.totalAmount})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-foreground">
                Invoice Date *
              </label>
              <Input
                type="date"
                {...invoiceForm.register("invoiceDate")}
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium text-foreground">
                Payment Due Date *
              </label>
              <Input
                type="date"
                {...invoiceForm.register("dueDate")}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-foreground">
              Total Bill Amount (₹) *
            </label>
            <Input
              type="number"
              step="any"
              {...invoiceForm.register("totalAmount", { valueAsNumber: true })}
              className="mt-1 font-bold"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsInvoiceModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createInvoiceMutation.isPending}
            >
              Save Invoice
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Supplier Payment"
        maxWidth="md"
      >
        <form
          onSubmit={paymentForm.handleSubmit(onPaymentSubmit, onPaymentInvalid)}
          className="space-y-3 py-2 text-xs"
        >
          <div className="p-3 rounded-lg bg-muted/20 border border-border text-xs space-y-1">
            <span className="font-bold text-foreground">
              Invoice #{selectedInvoice?.invoiceNumber}
            </span>
            <p className="text-muted-foreground">
              Total: ₹{selectedInvoice?.totalAmount} | Outstanding: ₹
              {selectedInvoice
                ? selectedInvoice.totalAmount -
                  (selectedInvoice.amountPaid || 0)
                : 0}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-foreground">
                Payment Amount (₹) *
              </label>
              <Input
                type="number"
                step="any"
                {...paymentForm.register("amount", { valueAsNumber: true })}
                className="mt-1 font-bold"
              />
            </div>

            <div>
              <label className="font-medium text-foreground">
                Payment Method *
              </label>
              <select
                {...paymentForm.register("paymentMethod")}
                className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="bank_transfer">Bank Transfer / NEFT</option>
                <option value="upi">UPI / QR</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-medium text-foreground">
              Transaction Reference / UTR #
            </label>
            <Input
              {...paymentForm.register("referenceNote")}
              className="mt-1"
              placeholder="UTR or Cheque Number"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPaymentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={recordPaymentMutation.isPending}
            >
              Confirm Payment
            </Button>
          </div>
        </form>
      </Dialog>

      {/* View Full Invoice Details Modal */}
      {viewingInvoice && (
        <Dialog
          isOpen={Boolean(viewingInvoice)}
          onClose={() => setViewingInvoice(null)}
          title={`Invoice — ${viewingInvoice.invoiceNumber}`}
          maxWidth="lg"
        >
          {(() => {
            const vendorName =
              (typeof viewingInvoice.supplierId === "object" &&
              viewingInvoice.supplierId !== null
                ? (viewingInvoice.supplierId as { name?: string }).name
                : undefined) || viewingInvoice.supplier?.name;
            const poNumber =
              (typeof viewingInvoice.purchaseOrderId === "object" &&
              viewingInvoice.purchaseOrderId !== null
                ? (viewingInvoice.purchaseOrderId as { poNumber?: string })
                    .poNumber
                : undefined) || viewingInvoice.purchaseOrder?.poNumber;
            const outstanding = Math.max(
              0,
              viewingInvoice.totalAmount - (viewingInvoice.amountPaid || 0),
            );

            return (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Vendor
                    </span>
                    <span className="font-semibold text-foreground">
                      {vendorName || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Status
                    </span>
                    <span className="font-semibold uppercase text-foreground">
                      {viewingInvoice.status.replace("_", " ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Supplier Bill / Ref #
                    </span>
                    <span className="font-medium text-foreground">
                      {viewingInvoice.supplierInvoiceRef || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Related Purchase Order
                    </span>
                    <span className="font-medium text-foreground">
                      {poNumber || "Standalone"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Invoice Date
                    </span>
                    <span className="font-medium text-foreground">
                      {new Date(
                        viewingInvoice.invoiceDate,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Due Date
                    </span>
                    <span className="font-medium text-foreground">
                      {new Date(viewingInvoice.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 p-3 rounded-lg border border-border bg-card text-center">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Total Amount
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      ₹{viewingInvoice.totalAmount.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Amount Paid
                    </span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{(viewingInvoice.amountPaid || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Balance Due
                    </span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      ₹{outstanding.toLocaleString()}
                    </span>
                  </div>
                </div>

                {(() => {
                  const relatedPO = getRelatedPO(viewingInvoice);
                  if (!relatedPO) return null;
                  return (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Related Purchase Order Details ({relatedPO.poNumber})
                      </span>
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 font-semibold">
                                Product
                              </th>
                              <th className="px-3 py-2 font-semibold text-right">
                                Qty
                              </th>
                              <th className="px-3 py-2 font-semibold text-right">
                                Unit Cost
                              </th>
                              <th className="px-3 py-2 font-semibold text-right">
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {relatedPO.items.map((line, idx) => {
                              const prodName =
                                (typeof line.productId === "object" &&
                                line.productId !== null
                                  ? (line.productId as { name?: string }).name
                                  : undefined) ||
                                line.product?.name ||
                                "Product";
                              return (
                                <tr key={idx}>
                                  <td className="px-3 py-2 font-medium text-foreground">
                                    {prodName}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    {line.orderedQuantity}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    ₹{line.unitCostPrice.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2 text-right font-semibold">
                                    ₹{line.lineTotal.toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {viewingInvoice.notes && (
                  <div className="p-3 rounded-lg bg-muted/20 border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-1">
                      Notes
                    </span>
                    <p className="text-foreground wrap-break-word">
                      {viewingInvoice.notes}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintInvoice(viewingInvoice)}
                  >
                    <Printer className="h-3.5 w-3.5 mr-1" />
                    Print
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={downloadingInvoiceId === viewingInvoice.id}
                    onClick={() => handleDownloadOfficialPdf(viewingInvoice)}
                  >
                    <Download
                      className={`h-3.5 w-3.5 mr-1 ${
                        downloadingInvoiceId === viewingInvoice.id
                          ? "animate-bounce"
                          : ""
                      }`}
                    />
                    {downloadingInvoiceId === viewingInvoice.id
                      ? "Generating PDF..."
                      : "Official Invoice"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingInvoice(null)}
                  >
                    Close
                  </Button>
                  {canManagePayments && viewingInvoice.status !== "paid" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const inv = viewingInvoice;
                        setViewingInvoice(null);
                        handleOpenRecordPayment(inv);
                      }}
                    >
                      <CreditCard className="h-3.5 w-3.5 mr-1" />
                      Record Payment
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </Dialog>
      )}

      {/* View Full Payment Details Modal */}
      {viewingPayment && (
        <Dialog
          isOpen={Boolean(viewingPayment)}
          onClose={() => setViewingPayment(null)}
          title={`Payment Receipt — ${viewingPayment.paymentNumber}`}
          maxWidth="md"
        >
          {(() => {
            const vendorName =
              (typeof viewingPayment.supplierId === "object" &&
              viewingPayment.supplierId !== null
                ? (viewingPayment.supplierId as { name?: string }).name
                : undefined) || viewingPayment.supplier?.name;
            const invoiceId =
              typeof viewingPayment.supplierInvoiceId === "object" &&
              viewingPayment.supplierInvoiceId !== null
                ? (
                    viewingPayment.supplierInvoiceId as {
                      _id?: string;
                      id?: string;
                    }
                  )._id ||
                  (
                    viewingPayment.supplierInvoiceId as {
                      _id?: string;
                      id?: string;
                    }
                  ).id
                : viewingPayment.supplierInvoiceId;
            const relatedInvoice = invoiceId
              ? invoices.find(
                  (inv: SupplierInvoice) =>
                    inv.id === invoiceId ||
                    (inv as { _id?: string })._id === invoiceId,
                )
              : undefined;
            const invoiceNumber =
              relatedInvoice?.invoiceNumber ||
              (typeof viewingPayment.supplierInvoiceId === "object" &&
              viewingPayment.supplierInvoiceId !== null
                ? (
                    viewingPayment.supplierInvoiceId as {
                      invoiceNumber?: string;
                    }
                  ).invoiceNumber
                : undefined) ||
              viewingPayment.supplierInvoice?.invoiceNumber;
            const recordedByName =
              typeof (viewingPayment as { recordedBy?: unknown }).recordedBy ===
                "object" &&
              (viewingPayment as { recordedBy?: unknown }).recordedBy !== null
                ? (
                    (viewingPayment as { recordedBy?: { name?: string } })
                      .recordedBy as { name?: string }
                  ).name
                : undefined;

            return (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-lg border border-border bg-emerald-500/5 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Amount Paid
                  </span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{viewingPayment.amount.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Vendor
                    </span>
                    <span className="font-semibold text-foreground">
                      {vendorName || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Invoice #
                    </span>
                    <span className="font-semibold text-foreground">
                      {invoiceNumber || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Payment Method
                    </span>
                    <span className="font-medium uppercase text-foreground">
                      {viewingPayment.paymentMethod.replace("_", " ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Payment Date
                    </span>
                    <span className="font-medium text-foreground">
                      {new Date(
                        viewingPayment.paymentDate,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  {recordedByName && (
                    <div className="col-span-2">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Recorded By
                      </span>
                      <span className="font-medium text-foreground">
                        {recordedByName}
                      </span>
                    </div>
                  )}
                </div>

                {relatedInvoice && (
                  <div className="p-3 rounded-lg border border-border bg-card space-y-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Linked Invoice Details ({relatedInvoice.invoiceNumber})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">
                          Status
                        </span>
                        <span className="font-semibold uppercase text-foreground">
                          {relatedInvoice.status.replace("_", " ")}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">
                          Invoice Date
                        </span>
                        <span className="font-medium text-foreground">
                          {new Date(
                            relatedInvoice.invoiceDate,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">
                          Due Date
                        </span>
                        <span className="font-medium text-foreground">
                          {new Date(
                            relatedInvoice.dueDate,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">
                          Total Bill
                        </span>
                        <span className="font-semibold text-foreground">
                          ₹{relatedInvoice.totalAmount.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">
                          Total Paid
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          ₹{(relatedInvoice.amountPaid || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">
                          Balance Due
                        </span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          ₹
                          {Math.max(
                            0,
                            relatedInvoice.totalAmount -
                              (relatedInvoice.amountPaid || 0),
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {viewingPayment.referenceNote && (
                  <div className="p-3 rounded-lg bg-muted/20 border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-1">
                      Reference / Notes
                    </span>
                    <p className="text-foreground wrap-break-word">
                      {viewingPayment.referenceNote}
                    </p>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingPayment(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            );
          })()}
        </Dialog>
      )}
    </div>
  );
}
