import React from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { manualConsumptionSchema, ManualConsumptionInput } from "../schemas/inventory.schema";
import { Product } from "../types/inventory.types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRecordConsumption } from "../hooks/useInventory";
import { toast } from "sonner";
import { useBranchContext } from "@/hooks/useBranchContext";

interface ConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  preselectedProduct?: Product | null;
}

export const ConsumptionModal: React.FC<ConsumptionModalProps> = ({
  isOpen,
  onClose,
  products,
  preselectedProduct
}) => {
  const { currentBranchId } = useBranchContext();
  const consumptionMutation = useRecordConsumption();

  // Stable idempotency key for the current logical consumption submission
  const idempotencyKeyRef = React.useRef<string | null>(null);
  const lastSubmittedPayloadRef = React.useRef<ManualConsumptionInput | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `consume_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      }
    } else {
      idempotencyKeyRef.current = null;
      lastSubmittedPayloadRef.current = null;
    }
  }, [isOpen]);

  // Filter products permitted for salon consumption (salon_consumption or both)
  const consumableProducts = React.useMemo(() => {
    return products.filter((p) => p.usageType === "salon_consumption" || p.usageType === "both");
  }, [products]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ManualConsumptionInput>({
    resolver: zodResolver(manualConsumptionSchema) as unknown as Resolver<ManualConsumptionInput>,
    defaultValues: {
      branchId: currentBranchId || "",
      productId: preselectedProduct?.id || "",
      quantity: 1,
      notes: ""
    }
  });

  const selectedProductId = watch("productId");
  const activeProduct = React.useMemo(() => {
    return consumableProducts.find((p) => p.id === selectedProductId) || preselectedProduct;
  }, [consumableProducts, selectedProductId, preselectedProduct]);

  React.useEffect(() => {
    if (currentBranchId) {
      setValue("branchId", currentBranchId);
    }
    if (preselectedProduct) {
      setValue("productId", preselectedProduct.id);
    }
  }, [currentBranchId, preselectedProduct, setValue]);

  const onSubmit = async (data: ManualConsumptionInput) => {
    try {
      // If the user modified the core operation payload after a previous failure, treat as a new logical operation
      if (
        lastSubmittedPayloadRef.current &&
        (lastSubmittedPayloadRef.current.productId !== data.productId ||
          lastSubmittedPayloadRef.current.quantity !== data.quantity ||
          lastSubmittedPayloadRef.current.branchId !== data.branchId)
      ) {
        idempotencyKeyRef.current = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `consume_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      }

      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `consume_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      }

      const keyToUse = idempotencyKeyRef.current;
      lastSubmittedPayloadRef.current = { ...data };

      await consumptionMutation.mutateAsync({ payload: data, idempotencyKey: keyToUse });
      toast.success(`Successfully logged consumption of ${data.quantity} ${activeProduct?.stockUnit || "units"}.`);
      reset();
      onClose();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to record salon consumption";
      toast.error(errorMsg);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Log Salon Consumption">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Select Consumable Product *</label>
          <select
            {...register("productId")}
            className="w-full h-10 px-3 py-2 border rounded-md text-sm bg-background mt-1"
          >
            <option value="">-- Choose consumable --</option>
            {consumableProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku}) — [{p.stockUnit}]
              </option>
            ))}
          </select>
          {errors.productId && (
            <p className="text-xs text-red-500 mt-1">{errors.productId.message}</p>
          )}
          {activeProduct && activeProduct.usageType === "retail_sale" && (
            <p className="text-xs text-red-600 mt-1">
              Retail-only products cannot be consumed internally.
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">
            Quantity Consumed * {activeProduct && `(in ${activeProduct.stockUnit})`}
          </label>
          <Input
            type="number"
            step={
              activeProduct && ["ml", "l", "g", "kg"].includes(activeProduct.stockUnit)
                ? "0.001"
                : "1"
            }
            {...register("quantity")}
            placeholder="e.g. 25 or 1"
            className="mt-1"
          />
          {errors.quantity && (
            <p className="text-xs text-red-500 mt-1">{errors.quantity.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Notes & Reference (Optional)</label>
          <Textarea
            {...register("notes")}
            placeholder="e.g. Consumed for customer deep-conditioning treatment"
            rows={3}
            className="mt-1"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !currentBranchId}>
            {isSubmitting ? "Recording..." : "Deduct Stock"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
