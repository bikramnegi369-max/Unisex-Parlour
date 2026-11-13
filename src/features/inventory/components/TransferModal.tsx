import React from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { stockTransferSchema, StockTransferInput } from "../schemas/inventory.schema";
import { Product } from "../types/inventory.types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRecordTransfer } from "../hooks/useInventory";
import { toast } from "sonner";
import { useBranchContext } from "@/hooks/useBranchContext";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  preselectedProduct?: Product | null;
  availableBranches: Array<{ id: string; name: string }>;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  products,
  preselectedProduct,
  availableBranches
}) => {
  const { currentBranchId } = useBranchContext();
  const transferMutation = useRecordTransfer();

  // Stable idempotency key for the current logical transfer submission
  const idempotencyKeyRef = React.useRef<string | null>(null);
  const lastSubmittedPayloadRef = React.useRef<StockTransferInput | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `transfer_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
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
  } = useForm<StockTransferInput>({
    resolver: zodResolver(stockTransferSchema) as unknown as Resolver<StockTransferInput>,
    defaultValues: {
      fromBranchId: currentBranchId || "",
      toBranchId: "",
      productId: preselectedProduct?.id || "",
      quantity: 1,
      notes: ""
    }
  });

  const selectedProductId = watch("productId");
  const fromBranchId = watch("fromBranchId");
  const activeProduct = React.useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || preselectedProduct;
  }, [products, selectedProductId, preselectedProduct]);

  React.useEffect(() => {
    if (currentBranchId) {
      setValue("fromBranchId", currentBranchId);
    }
    if (preselectedProduct) {
      setValue("productId", preselectedProduct.id);
    }
  }, [currentBranchId, preselectedProduct, setValue]);

  const onSubmit = async (data: StockTransferInput) => {
    try {
      if (
        lastSubmittedPayloadRef.current &&
        (lastSubmittedPayloadRef.current.productId !== data.productId ||
          lastSubmittedPayloadRef.current.quantity !== data.quantity ||
          lastSubmittedPayloadRef.current.fromBranchId !== data.fromBranchId ||
          lastSubmittedPayloadRef.current.toBranchId !== data.toBranchId)
      ) {
        idempotencyKeyRef.current = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `transfer_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      }

      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `transfer_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      }

      const keyToUse = idempotencyKeyRef.current;
      lastSubmittedPayloadRef.current = { ...data };

      await transferMutation.mutateAsync({ payload: data, idempotencyKey: keyToUse });
      toast.success(
        `Successfully transferred ${data.quantity} ${activeProduct?.stockUnit || "units"} between branches.`
      );
      reset();
      onClose();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to record inter-branch transfer";
      toast.error(errorMsg);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Inter-Branch Stock Transfer">
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Source Branch *</label>
            <select
              {...register("fromBranchId")}
              className="w-full h-10 px-3 py-2 border rounded-md text-sm bg-background mt-1"
            >
              <option value="">-- Source --</option>
              {availableBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {errors.fromBranchId && (
              <p className="text-xs text-red-500 mt-1">{errors.fromBranchId.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Destination Branch *</label>
            <select
              {...register("toBranchId")}
              className="w-full h-10 px-3 py-2 border rounded-md text-sm bg-background mt-1"
            >
              <option value="">-- Destination --</option>
              {availableBranches
                .filter((b) => b.id !== fromBranchId)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
            {errors.toBranchId && (
              <p className="text-xs text-red-500 mt-1">{errors.toBranchId.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">
            Quantity to Transfer * {activeProduct && `(in ${activeProduct.stockUnit})`}
          </label>
          <Input
            type="number"
            step={
              activeProduct && ["ml", "l", "g", "kg"].includes(activeProduct.stockUnit)
                ? "0.001"
                : "1"
            }
            {...register("quantity")}
            placeholder="e.g. 5"
            className="mt-1"
          />
          {errors.quantity && (
            <p className="text-xs text-red-500 mt-1">{errors.quantity.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Transfer Notes</label>
          <Textarea
            {...register("notes")}
            placeholder="Dispatch courier info or reason for inter-branch relocation"
            rows={2}
            className="mt-1"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Transferring..." : "Dispatch Transfer"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
