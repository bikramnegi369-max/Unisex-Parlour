import React from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { stockAdjustmentSchema, StockAdjustmentInput } from "../schemas/inventory.schema";
import { Product } from "../types/inventory.types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRecordAdjustment } from "../hooks/useInventory";
import { toast } from "sonner";
import { useBranchContext } from "@/hooks/useBranchContext";

interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  preselectedProduct?: Product | null;
  currentStockOnHand?: number;
}

export const AdjustmentModal: React.FC<AdjustmentModalProps> = ({
  isOpen,
  onClose,
  products,
  preselectedProduct,
  currentStockOnHand
}) => {
  const { currentBranchId } = useBranchContext();
  const adjustmentMutation = useRecordAdjustment();

  // Stable idempotency key for the current logical adjustment submission
  const idempotencyKeyRef = React.useRef<string | null>(null);
  const lastSubmittedPayloadRef = React.useRef<StockAdjustmentInput | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `adjust_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      }
    } else {
      idempotencyKeyRef.current = null;
      lastSubmittedPayloadRef.current = null;
    }
  }, [isOpen]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<StockAdjustmentInput>({
    resolver: zodResolver(stockAdjustmentSchema) as unknown as Resolver<StockAdjustmentInput>,
    defaultValues: {
      branchId: currentBranchId || "",
      productId: preselectedProduct?.id || "",
      quantityDelta: 0,
      reason: "",
      notes: ""
    }
  });

  const selectedProductId = watch("productId");
  const activeProduct = React.useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || preselectedProduct;
  }, [products, selectedProductId, preselectedProduct]);

  React.useEffect(() => {
    if (currentBranchId) {
      setValue("branchId", currentBranchId);
    }
    if (preselectedProduct) {
      setValue("productId", preselectedProduct.id);
    }
  }, [currentBranchId, preselectedProduct, setValue]);

  const onSubmit = async (data: StockAdjustmentInput) => {
    try {
      if (
        lastSubmittedPayloadRef.current &&
        (lastSubmittedPayloadRef.current.productId !== data.productId ||
          lastSubmittedPayloadRef.current.quantityDelta !== data.quantityDelta ||
          lastSubmittedPayloadRef.current.branchId !== data.branchId)
      ) {
        idempotencyKeyRef.current = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `adjust_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      }

      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `adjust_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      }

      const keyToUse = idempotencyKeyRef.current;
      lastSubmittedPayloadRef.current = { ...data };

      await adjustmentMutation.mutateAsync({ payload: data, idempotencyKey: keyToUse });
      toast.success(
        `Successfully recorded adjustment of ${data.quantityDelta > 0 ? "+" : ""}${data.quantityDelta} ${activeProduct?.stockUnit || "units"}.`
      );
      reset();
      onClose();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to record stock adjustment";
      toast.error(errorMsg);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Adjust Stock Balance">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Product *</label>
          <select
            {...register("productId")}
            className="w-full h-10 px-3 py-2 border rounded-md text-sm bg-background mt-1"
          >
            <option value="">-- Choose product --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku}) — [{p.stockUnit}]
              </option>
            ))}
          </select>
          {errors.productId && (
            <p className="text-xs text-red-500 mt-1">{errors.productId.message}</p>
          )}
        </div>

        {currentStockOnHand !== undefined && (
          <div className="bg-slate-50 border p-2.5 rounded text-xs flex justify-between">
            <span className="text-muted-foreground">Current Stock on Hand:</span>
            <span className="font-semibold text-slate-800">
              {currentStockOnHand} {activeProduct?.stockUnit}
            </span>
          </div>
        )}

        <div>
          <label className="text-sm font-medium">
            Quantity Delta * (use positive to add, negative to deduct)
          </label>
          <Input
            type="number"
            step={
              activeProduct && ["ml", "l", "g", "kg"].includes(activeProduct.stockUnit)
                ? "0.001"
                : "1"
            }
            {...register("quantityDelta")}
            placeholder="e.g. +10 or -3"
            className="mt-1"
          />
          {errors.quantityDelta && (
            <p className="text-xs text-red-500 mt-1">{errors.quantityDelta.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Adjustment Reason *</label>
          <select
            {...register("reason")}
            className="w-full h-10 px-3 py-2 border rounded-md text-sm bg-background mt-1"
          >
            <option value="">-- Select reason --</option>
            <option value="Physical Stock Audit Reconciliation">Physical Stock Audit Reconciliation</option>
            <option value="Damaged / Broken Goods">Damaged / Broken Goods</option>
            <option value="Expired / Degraded Product">Expired / Degraded Product</option>
            <option value="Theft or Unaccounted Loss">Theft or Unaccounted Loss</option>
            <option value="Internal Demo / Sample Usage">Internal Demo / Sample Usage</option>
            <option value="Manual Balance Correction">Manual Balance Correction</option>
          </select>
          {errors.reason && (
            <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Auditor Notes</label>
          <Textarea
            {...register("notes")}
            placeholder="Additional audit context or reference numbers"
            rows={2}
            className="mt-1"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !currentBranchId}>
            {isSubmitting ? "Adjusting..." : "Commit Adjustment"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
