"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateExpense } from "../hooks";
import {
  expenseFormSchema,
  ExpenseFormValues,
} from "../schemas/expense.schema";
import { EXPENSES_CONFIG } from "../config/expenses.config";
import { useSuppliers, useSupplierInvoices } from "@/features/procurement/hooks/useProcurement";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import ImageUpload from "@/components/forms/ImageUpload";
import { Receipt, AlertCircle, Sparkles, Link2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useBranchContext } from "@/hooks/useBranchContext";
import { getErrorMessage, mapBackendValidationErrors } from "@/lib/api/errors";

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialValues?: Partial<ExpenseFormValues>;
}

export default function ExpenseFormDialog({
  open,
  onOpenChange,
  onSuccess,
  initialValues,
}: ExpenseFormDialogProps) {
  const { currentBranch } = useBranchContext();
  const [receiptUrl, setReceiptUrl] = useState<string>(
    initialValues?.receiptUrl || "",
  );
  const [formError, setFormError] = useState<string | null>(null);

  // Linkage state
  const [sourceType, setSourceType] = useState<
    | "manual"
    | "procurement_invoice"
    | "procurement_payment"
    | "inventory_consumption"
    | "payroll"
    | "other"
  >(initialValues?.sourceType || "manual");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    initialValues?.supplierId || "",
  );
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    initialValues?.supplierInvoiceId || "",
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      category: initialValues?.category || "utilities",
      paymentMethod: initialValues?.paymentMethod || "petty_cash",
      amount: initialValues?.amount || undefined,
      payeeName: initialValues?.payeeName || "",
      invoiceNumber: initialValues?.invoiceNumber || "",
      description: initialValues?.description || "",
      sourceType: initialValues?.sourceType || "manual",
      sourceReference: initialValues?.sourceReference || "",
      expenseDate:
        initialValues?.expenseDate || new Date().toISOString().slice(0, 10),
    },
  });

  const enteredAmount = Number(watch("amount")) || 0;
  const selectedPaymentMethod = watch("paymentMethod");

  // Fetch Suppliers for Assisted Linkage via Canonical Hook
  const shouldFetchSuppliers =
    open &&
    (sourceType === "procurement_invoice" ||
      sourceType === "procurement_payment");
  const { data: suppliersData } = useSuppliers(
    shouldFetchSuppliers ? { limit: 100, status: "active" } : undefined
  );

  // Fetch Invoices when supplier selected via Canonical Hook
  const shouldFetchInvoices =
    open && !!selectedSupplierId && sourceType === "procurement_invoice";
  const { data: supplierInvoicesData } = useSupplierInvoices(
    shouldFetchInvoices
      ? {
          supplierId: selectedSupplierId,
          limit: 50,
        }
      : undefined
  );

  // Sync initial values when opened
  useEffect(() => {
    if (open) {
      if (initialValues) {
        reset({
          category: initialValues.category || "utilities",
          paymentMethod: initialValues.paymentMethod || "petty_cash",
          amount: initialValues.amount || undefined,
          payeeName: initialValues.payeeName || "",
          invoiceNumber: initialValues.invoiceNumber || "",
          description: initialValues.description || "",
          sourceType: initialValues.sourceType || "manual",
          sourceReference: initialValues.sourceReference || "",
          expenseDate:
            initialValues.expenseDate || new Date().toISOString().slice(0, 10),
        });
        setReceiptUrl(initialValues.receiptUrl || "");
        setSourceType(initialValues.sourceType || "manual");
        setSelectedSupplierId(initialValues.supplierId || "");
        setSelectedInvoiceId(initialValues.supplierInvoiceId || "");
      } else {
        reset({
          category: "utilities",
          paymentMethod: "petty_cash",
          expenseDate: new Date().toISOString().slice(0, 10),
        });
        setReceiptUrl("");
        setSourceType("manual");
        setSelectedSupplierId("");
        setSelectedInvoiceId("");
      }
      setFormError(null);
    }
  }, [open, initialValues, reset]);

  // When supplier selected, auto-fill payee name
  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const suppId = e.target.value;
    setSelectedSupplierId(suppId);
    setSelectedInvoiceId("");
    setValue("supplierId", suppId);
    const supplier = suppliersData?.data?.find((s) => s.id === suppId);
    if (supplier) {
      setValue("payeeName", supplier.name);
    }
  };

  // When supplier invoice selected, auto-fill invoice number, amount, reference
  const handleInvoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const invId = e.target.value;
    setSelectedInvoiceId(invId);
    setValue("supplierInvoiceId", invId);
    const invoice = supplierInvoicesData?.data?.find((i) => i.id === invId);
    if (invoice) {
      setValue(
        "invoiceNumber",
        invoice.supplierInvoiceRef || invoice.invoiceNumber,
      );
      setValue("sourceReference", `PO/INV: ${invoice.invoiceNumber}`);
      if (invoice.outstandingAmount > 0) {
        setValue("amount", invoice.outstandingAmount);
      } else {
        setValue("amount", invoice.totalAmount);
      }
      setValue(
        "description",
        `Supplier invoice payment for ${invoice.supplier?.name || "vendor"}`,
      );
    }
  };

  // Canonical mutation hook
  const createMutation = useCreateExpense();

  const onSubmit = (data: ExpenseFormValues) => {
    setFormError(null);
    createMutation.mutate(
      {
        ...data,
        amount: Number(data.amount),
        receiptUrl: receiptUrl || undefined,
        sourceType,
        sourceReference: data.sourceReference || undefined,
        supplierId: selectedSupplierId || undefined,
        supplierInvoiceId: selectedInvoiceId || undefined,
      },
      {
        onSuccess: () => {
          onSuccess();
          onOpenChange(false);
        },
        onError: (err: unknown) => {
          const handled = mapBackendValidationErrors(err, setError);
          if (!handled) {
            setFormError(
              getErrorMessage(
                err,
                "Unable to save expense. Please verify all fields.",
              ),
            );
          }
        },
      },
    );
  };

  return (
    <Dialog
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Record Operating Expense"
      maxWidth="2xl"
    >
      <div className="p-6 space-y-6">
        {/* Purpose banner / Context */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
          <Receipt className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-foreground">
              Branch: {currentBranch?.name || "Active Salon Location"}
            </span>
            <p>
              Log salon operational expenses, supplies, refreshments, or connect
              directly to a supplier invoice. All expenses under the branch
              approval threshold will settle immediately.
            </p>
          </div>
        </div>

        {formError && (
          <div className="p-3.5 bg-destructive/10 text-destructive text-xs rounded-xl border border-destructive/20 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Section 1: Source & Linkage */}
          <div className="p-4 rounded-xl border border-border/70 bg-card/40 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-primary" />
                Origin / ERP Linkage
              </label>
              <span className="text-[11px] text-muted-foreground">
                Optional connection to source module
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Origin Type
                </label>
                <Select
                  value={sourceType}
                  onChange={(e) => {
                    const st = e.target.value as any;
                    setSourceType(st);
                    setValue("sourceType", st);
                    if (st === "manual") {
                      setSelectedSupplierId("");
                      setSelectedInvoiceId("");
                      setValue("supplierId", "");
                      setValue("supplierInvoiceId", "");
                    }
                  }}
                  className="w-full h-9 text-xs"
                >
                  <option value="manual">Direct Salon Expense (Manual)</option>
                  <option value="procurement_invoice">
                    Supplier Bill / Invoice
                  </option>
                  <option value="procurement_payment">
                    Procurement Out-of-pocket
                  </option>
                  <option value="inventory_consumption">
                    Salon Consumables Use
                  </option>
                  <option value="other">Other Operations</option>
                </Select>
              </div>

              {(sourceType === "procurement_invoice" ||
                sourceType === "procurement_payment") && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Select Supplier
                  </label>
                  <Select
                    value={selectedSupplierId}
                    onChange={handleSupplierChange}
                    className="w-full h-9 text-xs"
                  >
                    <option value="">Choose Supplier...</option>
                    {suppliersData?.data?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {sourceType === "procurement_invoice" && selectedSupplierId && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Link Supplier Invoice
                  </label>
                  <Select
                    value={selectedInvoiceId}
                    onChange={handleInvoiceChange}
                    className="w-full h-9 text-xs"
                  >
                    <option value="">Choose Invoice...</option>
                    {supplierInvoicesData?.data?.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {formatCurrency(inv.totalAmount)}{" "}
                        ({inv.status})
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            {sourceType !== "manual" && (
              <div className="pt-1">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Source Reference Note
                </label>
                <Input
                  {...register("sourceReference")}
                  placeholder="e.g. PO-2026-0042, Delivery Note #12"
                  className="h-8 text-xs font-mono"
                />
              </div>
            )}
          </div>

          {/* Section 2: Core Expense Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="category"
                className="text-xs font-medium text-foreground"
              >
                Expense Category *
              </label>
              <Select
                id="category"
                {...register("category")}
                className="h-9 text-xs"
              >
                {EXPENSES_CONFIG.categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
              {errors.category && (
                <span className="text-[11px] text-destructive">
                  {errors.category.message}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="expenseDate"
                className="text-xs font-medium text-foreground"
              >
                Date of Expense *
              </label>
              <Input
                id="expenseDate"
                type="date"
                {...register("expenseDate")}
                className="h-9 text-xs"
              />
              {errors.expenseDate && (
                <span className="text-[11px] text-destructive">
                  {errors.expenseDate.message}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="payeeName"
                className="text-xs font-medium text-foreground"
              >
                Who was paid? (Payee or Vendor) *
              </label>
              <Input
                id="payeeName"
                placeholder="e.g. Fresh Milk Dairy, Metro Electric, Kumar Repairs"
                {...register("payeeName")}
                className="h-9 text-xs"
              />
              {errors.payeeName && (
                <span className="text-[11px] text-destructive">
                  {errors.payeeName.message}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="invoiceNumber"
                className="text-xs font-medium text-foreground"
              >
                Bill / Invoice Number (Optional)
              </label>
              <Input
                id="invoiceNumber"
                placeholder="e.g. BILL-9941"
                {...register("invoiceNumber")}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          {/* Section 3: Payment & Amount */}
          <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="amount"
                  className="text-xs font-medium text-foreground"
                >
                  Amount Paid (₹) *
                </label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  {...register("amount", { valueAsNumber: true })}
                  className="h-10 text-base font-semibold font-mono"
                />
                {errors.amount && (
                  <span className="text-[11px] text-destructive">
                    {errors.amount.message}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="paymentMethod"
                  className="text-xs font-medium text-foreground"
                >
                  Payment Tender *
                </label>
                <Select
                  id="paymentMethod"
                  {...register("paymentMethod")}
                  className="h-10 text-xs font-medium"
                >
                  <option value="petty_cash">Cash Drawer (Petty Cash)</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="card">Company Debit / Credit Card</option>
                  <option value="bank_transfer">
                    Direct Bank Transfer (NEFT/IMPS)
                  </option>
                </Select>
                {errors.paymentMethod && (
                  <span className="text-[11px] text-destructive">
                    {errors.paymentMethod.message}
                  </span>
                )}
              </div>
            </div>

            {/* Live Threshold & Cash Drawer Notice */}
            <div className="text-xs rounded-lg p-3 bg-card border border-border">
              {selectedPaymentMethod === "petty_cash" ? (
                enteredAmount >
                EXPENSES_CONFIG.defaults.defaultApprovalThreshold ? (
                  <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">
                        Requires Manager Approval:
                      </span>{" "}
                      Amounts over ₹5,000 will remain in{" "}
                      <em>Waiting for Manager Approval</em> status. Cash will
                      not be deducted from the drawer until a manager signs off.
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <div>
                      <span className="font-semibold">Instant Settlement:</span>{" "}
                      ₹{enteredAmount.toFixed(2)} will immediately be disbursed
                      and recorded in the Cash Drawer History.
                    </div>
                  </div>
                )
              ) : (
                <div className="text-muted-foreground">
                  Non-cash payments settle directly against operating accounts
                  and will not affect the physical Cash Drawer balance.
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Description & Receipt Upload */}
          <div className="space-y-1.5">
            <label
              htmlFor="description"
              className="text-xs font-medium text-foreground"
            >
              Notes & Description (Optional)
            </label>
            <Textarea
              id="description"
              placeholder="Provide context regarding this operational expense..."
              rows={2}
              {...register("description")}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Receipt / Bill Photo (Optional)
            </label>
            <ImageUpload
              value={receiptUrl}
              onChange={(url) => setReceiptUrl(url || "")}
            />
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              size="sm"
              className="text-xs h-9 font-semibold px-5"
            >
              {createMutation.isPending
                ? "Recording Expense..."
                : "Confirm & Save Expense"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
