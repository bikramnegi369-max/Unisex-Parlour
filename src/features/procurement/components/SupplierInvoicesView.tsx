"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
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
  Building,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";

export default function SupplierInvoicesView() {
  const { user } = useAuth();
  const { currentBranchId } = useBranchContext();
  const canManageInvoices = hasPermission(user, "procurement.invoices.manage");
  const canManagePayments = hasPermission(user, "procurement.payments.manage");

  const [activeTab, setActiveTab] = useState<"invoices" | "payments">("invoices");
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);

  const { data: invoicesData, isLoading: invoicesLoading } = useSupplierInvoices({
    branchId: currentBranchId,
  });

  const { data: paymentsData, isLoading: paymentsLoading } = useSupplierPayments({
    branchId: currentBranchId,
  });

  const { data: suppliersData } = useSuppliers({ status: "active", limit: 100 });
  const { data: ordersData } = usePurchaseOrders({ branchId: currentBranchId, limit: 100 });

  const suppliers: Supplier[] = suppliersData?.data || [];
  const orders: PurchaseOrder[] = ordersData?.data || [];

  const createInvoiceMutation = useCreateSupplierInvoice();
  const recordPaymentMutation = useRecordSupplierPayment();

  // Invoice Form
  const invoiceForm = useForm<SupplierInvoiceFormValues>({
    resolver: zodResolver(supplierInvoiceFormSchema),
    defaultValues: {
      supplierId: "",
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
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
    paymentForm.reset({
      supplierId: inv.supplierId,
      supplierInvoiceId: inv.id,
      amount: outstanding,
      paymentMethod: "bank_transfer",
      paymentDate: new Date().toISOString().split("T")[0],
      referenceNote: `Settlement for #${inv.invoiceNumber}`,
    });
    setIsPaymentModalOpen(true);
  };

  const onInvoiceSubmit = async (values: SupplierInvoiceFormValues) => {
    const payload = {
      ...values,
      branchId: currentBranchId || undefined,
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
            Track vendor bills, payment due dates, and record cash/bank settlements with automatic outstanding balance reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
                  dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
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
              <h3 className="text-sm font-semibold text-foreground">No invoices on file</h3>
              <p className="text-xs text-muted-foreground">
                Record distributor invoices against purchase orders to manage payables.
              </p>
            </div>
          ) : (
            invoices.map((inv: SupplierInvoice) => {
              const outstanding = Math.max(0, inv.totalAmount - (inv.amountPaid || 0));

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
                      <span>Vendor: {inv.supplier?.name}</span>
                      <span>•</span>
                      <span>Due: {new Date(inv.dueDate).toLocaleDateString()}</span>
                      {inv.purchaseOrder?.poNumber && (
                        <>
                          <span>•</span>
                          <span>PO: {inv.purchaseOrder.poNumber}</span>
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
              );
            })
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
              <h3 className="text-sm font-semibold text-foreground">No payments recorded</h3>
              <p className="text-xs text-muted-foreground">
                Vendor settlement disbursements will be logged here.
              </p>
            </div>
          ) : (
            payments.map((pay: SupplierPayment) => (
              <div
                key={pay.id}
                className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{pay.paymentNumber}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {pay.paymentMethod.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    Vendor: {pay.supplier?.name} • Invoice:{" "}
                    {pay.supplierInvoice?.invoiceNumber || "N/A"}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{pay.amount.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(pay.paymentDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
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
              <label className="font-medium text-foreground">Supplier Bill / Ref #</label>
              <Input
                {...invoiceForm.register("supplierInvoiceRef")}
                className="mt-1"
                placeholder="e.g. INV-9901"
              />
            </div>
            <div>
              <label className="font-medium text-foreground">Related Purchase Order</label>
              <select
                {...invoiceForm.register("purchaseOrderId")}
                className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="">None / Standalone</option>
                {orders.map((po: PurchaseOrder) => (
                  <option key={po.id} value={po.id}>
                    {po.poNumber} (₹{po.totalAmount})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-foreground">Invoice Date *</label>
              <Input type="date" {...invoiceForm.register("invoiceDate")} className="mt-1" />
            </div>
            <div>
              <label className="font-medium text-foreground">Payment Due Date *</label>
              <Input type="date" {...invoiceForm.register("dueDate")} className="mt-1" />
            </div>
          </div>

          <div>
            <label className="font-medium text-foreground">Total Bill Amount (₹) *</label>
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
            <Button type="submit" size="sm" disabled={createInvoiceMutation.isPending}>
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
          onSubmit={paymentForm.handleSubmit(onPaymentSubmit)}
          className="space-y-3 py-2 text-xs"
        >
          <div className="p-3 rounded-lg bg-muted/20 border border-border text-xs space-y-1">
            <span className="font-bold text-foreground">
              Invoice #{selectedInvoice?.invoiceNumber}
            </span>
            <p className="text-muted-foreground">
              Total: ₹{selectedInvoice?.totalAmount} | Outstanding: ₹
              {selectedInvoice ? selectedInvoice.totalAmount - (selectedInvoice.amountPaid || 0) : 0}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-foreground">Payment Amount (₹) *</label>
              <Input
                type="number"
                step="any"
                {...paymentForm.register("amount", { valueAsNumber: true })}
                className="mt-1 font-bold"
              />
            </div>

            <div>
              <label className="font-medium text-foreground">Payment Method *</label>
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
            <label className="font-medium text-foreground">Transaction Reference / UTR #</label>
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
            <Button type="submit" size="sm" disabled={recordPaymentMutation.isPending}>
              Confirm Payment
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
