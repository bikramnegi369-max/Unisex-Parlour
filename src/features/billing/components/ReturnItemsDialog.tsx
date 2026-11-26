import { useMemo, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/formatters";
import { useReturnInvoiceItems } from "../hooks/useBillingMutations";
import type { Invoice, InvoiceLineItem } from "../types/billing.types";

interface ReturnItemsDialogProps {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LineReturnDraft {
  selected: boolean;
  quantity: number;
  condition: "unopened" | "damaged" | "defective";
  acceptPhysicalRestock: boolean;
}

export function ReturnItemsDialog({
  invoice,
  open,
  onOpenChange,
}: ReturnItemsDialogProps) {
  const returnMutation = useReturnInvoiceItems();
  const [refundPaymentMethod, setRefundPaymentMethod] = useState<
    "cash" | "card" | "upi" | "other"
  >("cash");
  const [reason, setReason] = useState("");
  const [drafts, setDrafts] = useState<Record<string, LineReturnDraft>>({});

  const returnableLines = useMemo(() => {
    return (invoice.lines || invoice.items || []).filter((line) => {
      const lineId = line.id || line._id;
      if (!lineId) return false;
      if (line.lineType === "membership") return false;
      const remaining =
        Number(line.quantity || 1) - Number(line.returnedQuantity || 0);
      return remaining > 0;
    });
  }, [invoice.lines, invoice.items]);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      const initial: Record<string, LineReturnDraft> = {};
      for (const line of returnableLines) {
        const lineId = (line.id || line._id)!;
        const remaining =
          Number(line.quantity || 1) - Number(line.returnedQuantity || 0);
        initial[lineId] = {
          selected: false,
          quantity: remaining,
          condition: "unopened",
          acceptPhysicalRestock: line.lineType === "product",
        };
      }
      setDrafts(initial);
      setReason("");
      setRefundPaymentMethod("cash");
    }
  }

  const selectedItems = useMemo(() => {
    return returnableLines
      .map((line) => {
        const lineId = (line.id || line._id)!;
        const draft = drafts[lineId];
        if (!draft?.selected) return null;
        return { line, lineId, draft };
      })
      .filter(Boolean) as Array<{
      line: InvoiceLineItem;
      lineId: string;
      draft: LineReturnDraft;
    }>;
  }, [returnableLines, drafts]);

  const handleSubmit = async () => {
    const branchId = invoice.branchId || invoice.branch?.id;
    if (!branchId) {
      toast.error("Branch context is missing for this invoice.");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Select at least one item to return.");
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("Return reason must be at least 3 characters.");
      return;
    }

    try {
      const idempotencyKey = `return:${invoice.id}:${Date.now()}`;
      await returnMutation.mutateAsync({
        invoiceId: invoice.id,
        payload: {
          branchId,
          items: selectedItems.map(({ lineId, draft, line }) => ({
            lineId,
            quantity: draft.quantity,
            condition: draft.condition,
            acceptPhysicalRestock:
              line.lineType === "product" ? draft.acceptPhysicalRestock : false,
          })),
          refundPaymentMethod,
          reason: reason.trim(),
          idempotencyKey,
        },
      });
      toast.success("Return & refund recorded successfully.");
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Unable to process return & refund.";
      toast.error(message);
    }
  };

  return (
    <Dialog
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Return Items & Issue Refund"
      className="max-w-xl"
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <RotateCcw className="h-3.5 w-3.5 text-rose-600 shrink-0" />
          <span>
            Select items to return from invoice{" "}
            <span className="font-mono font-semibold text-foreground">
              {invoice.invoiceNumber}
            </span>
            . Product returns can optionally restock inventory.
          </span>
        </p>

        <div className="space-y-2.5 max-h-65 overflow-y-auto pr-1">
          {returnableLines.map((line) => {
            const lineId = (line.id || line._id)!;
            const remaining =
              Number(line.quantity || 1) - Number(line.returnedQuantity || 0);
            const draft = drafts[lineId] || {
              selected: false,
              quantity: remaining,
              condition: "unopened" as const,
              acceptPhysicalRestock: line.lineType === "product",
            };

            return (
              <div
                key={lineId}
                className="rounded-xl border border-border/70 p-3 space-y-2.5 bg-muted/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.selected}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [lineId]: { ...draft, selected: e.target.checked },
                        }))
                      }
                      className="mt-1 h-4 w-4 rounded border-border accent-rose-600"
                    />
                    <div>
                      <p className="text-sm font-semibold leading-tight">
                        {line.name || "Item"}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {line.lineType} • Max returnable: {remaining} •{" "}
                        {formatCurrency(line.lineTotal ?? line.unitPrice ?? 0)}
                      </p>
                    </div>
                  </label>
                </div>

                {draft.selected && (
                  <div className="grid grid-cols-2 gap-2.5 pl-6 pt-1">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Return Qty</label>
                      <Input
                        type="number"
                        min={1}
                        max={remaining}
                        value={draft.quantity}
                        onChange={(e) => {
                          const val = Math.min(
                            remaining,
                            Math.max(1, Number(e.target.value) || 1),
                          );
                          setDrafts((prev) => ({
                            ...prev,
                            [lineId]: { ...draft, quantity: val },
                          }));
                        }}
                        className="h-8 text-xs"
                      />
                    </div>

                    {line.lineType === "product" && (
                      <>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">
                            Condition
                          </label>
                          <select
                            value={draft.condition}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [lineId]: {
                                  ...draft,
                                  condition: e.target.value as
                                    | "unopened"
                                    | "damaged"
                                    | "defective",
                                },
                              }))
                            }
                            className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs"
                          >
                            <option value="unopened">Unopened</option>
                            <option value="damaged">Damaged</option>
                            <option value="defective">Defective</option>
                          </select>
                        </div>

                        <label className="col-span-2 flex items-center gap-2 pt-1 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={draft.acceptPhysicalRestock}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [lineId]: {
                                  ...draft,
                                  acceptPhysicalRestock: e.target.checked,
                                },
                              }))
                            }
                            className="h-3.5 w-3.5 rounded border-border accent-rose-600"
                          />
                          <span>
                            Restock returned product into branch inventory
                          </span>
                        </label>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Refund Method</label>
            <select
              value={refundPaymentMethod}
              onChange={(e) =>
                setRefundPaymentMethod(
                  e.target.value as "cash" | "card" | "upi" | "other",
                )
              }
              className="h-9 w-full rounded-xl border border-input bg-background px-3 text-xs"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold">
            Reason <span className="text-rose-500">*</span>
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why these items are being returned/refunded..."
            className="min-h-18 text-xs rounded-xl"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={returnMutation.isPending}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={
              returnMutation.isPending ||
              selectedItems.length === 0 ||
              reason.trim().length < 3
            }
            className="rounded-xl gap-1.5"
          >
            {returnMutation.isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            Confirm Return & Refund
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
