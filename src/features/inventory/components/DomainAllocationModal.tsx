import React from "react";
import { useForm, useWatch, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { domainAllocationSchema, DomainAllocationInput } from "../schemas/inventory.schema";
import { StockBalance } from "../types/inventory.types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { inventoryApi } from "../api/inventory.api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldAlert, Split } from "lucide-react";
import { getErrorMessage } from "@/lib/api/errors";

interface DomainAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: StockBalance | null;
}

const newAllocationIdempotencyKey = (balanceId?: string) =>
  `alloc_${balanceId || "stock"}_${crypto.randomUUID()}`;

export const DomainAllocationModal: React.FC<DomainAllocationModalProps> = ({
  isOpen,
  onClose,
  balance,
}) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [idempotencyKey, setIdempotencyKey] = React.useState(() =>
    newAllocationIdempotencyKey(balance?.id),
  );

  const product = balance?.product;
  const unallocated = balance?.onHandUnallocated ?? Math.max(
    0,
    (balance?.onHand || 0) - ((balance?.onHandConsumables || 0) + (balance?.onHandRetail || 0))
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<DomainAllocationInput>({
    resolver: zodResolver(domainAllocationSchema) as unknown as Resolver<DomainAllocationInput>,
    defaultValues: {
      retailQuantity: 0,
      consumablesQuantity: 0,
      reason: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({
        retailQuantity: 0,
        consumablesQuantity: 0,
        reason: "",
        notes: "",
      });
    }
  }, [balance?.id, isOpen, reset]);

  const retailQuantity = useWatch({ control, name: "retailQuantity" });
  const consumablesQuantity = useWatch({ control, name: "consumablesQuantity" });

  if (!balance || !product) return null;

  const retailVal = Number(retailQuantity || 0);
  const consumablesVal = Number(consumablesQuantity || 0);
  const totalAllocating = retailVal + consumablesVal;
  const remainingAfter = Math.max(0, unallocated - totalAllocating);
  const isExcessive = totalAllocating > unallocated;
  const isZero = totalAllocating <= 0;

  const handleClose = () => {
    setIdempotencyKey(newAllocationIdempotencyKey(balance?.id));
    onClose();
  };

  const onSubmit = async (values: DomainAllocationInput) => {
    if (isExcessive || isZero) return;
    setIsSubmitting(true);
    try {
      await inventoryApi.allocateDomain(
        {
          branchId: balance.branchId,
          productId: balance.productId,
          retailQuantity: values.retailQuantity,
          consumablesQuantity: values.consumablesQuantity,
          reason: values.reason,
          notes: values.notes,
        },
        idempotencyKey
      );

      toast.success(
        `Successfully allocated ${totalAllocating} ${product.stockUnit} (Retail: ${values.retailQuantity}, Consumables: ${values.consumablesQuantity})`
      );
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      handleClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Domain allocation failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Allocate Historical Stock Domains">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
        {/* Banner */}
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-start gap-2.5">
          <Split className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-foreground">
              Manager Stock Domain Assignment
            </span>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              Dual-usage product: <strong>{product.name}</strong> ({product.sku}).
              Unallocated stock is strictly isolated from POS checkout and salon consumption until confirmed.
            </p>
          </div>
        </div>

        {/* Current status display */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-lg border border-border bg-muted/20 text-center">
          <div>
            <div className="text-[10px] text-muted-foreground font-semibold">Unallocated</div>
            <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {unallocated} {product.stockUnit}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground font-semibold">Confirmed Retail</div>
            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {balance.onHandRetail || 0} {product.stockUnit}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground font-semibold">Confirmed Consumables</div>
            <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
              {balance.onHandConsumables || 0} {product.stockUnit}
            </div>
          </div>
        </div>

        {/* Input Quantities */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-[11px] font-bold text-foreground">
              Assign to Retail (POS Sale)
            </label>
            <Input
              type="number"
              step="any"
              min={0}
              max={unallocated}
              {...register("retailQuantity", { valueAsNumber: true })}
              className="mt-1 h-8 text-xs font-bold"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-foreground">
              Assign to Consumables (Service Use)
            </label>
            <Input
              type="number"
              step="any"
              min={0}
              max={unallocated}
              {...register("consumablesQuantity", { valueAsNumber: true })}
              className="mt-1 h-8 text-xs font-bold"
            />
          </div>
        </div>

        {/* Allocation preview bar */}
        <div className="p-3 rounded-lg bg-card border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-muted-foreground">
              Total Assigning: <strong className="text-foreground">{totalAllocating}</strong> {product.stockUnit}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-muted-foreground">
              Remaining Unallocated: <strong className={remainingAfter > 0 ? "text-amber-600" : "text-foreground"}>{remainingAfter}</strong> {product.stockUnit}
            </span>
          </div>
        </div>

        {isExcessive && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-[11px] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Total allocated quantity exceeds available unallocated stock ({unallocated} {product.stockUnit}).</span>
          </div>
        )}

        {/* Reason / Audit fields */}
        <div>
          <label className="text-[11px] font-bold text-foreground">
            Audit Reason / Authorization Note *
          </label>
          <Input
            placeholder="e.g. Physical inventory count verified by Store Manager"
            {...register("reason")}
            className="mt-1 h-8 text-xs"
          />
          {errors.reason && (
            <p className="text-red-500 text-[10px] mt-0.5">{errors.reason.message}</p>
          )}
        </div>

        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">
            Additional Audit Notes (Optional)
          </label>
          <Textarea
            placeholder="Shelf location, physical batch tags, counted by..."
            {...register("notes")}
            className="mt-1 text-xs resize-none"
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || isExcessive || isZero}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
          >
            {isSubmitting ? "Allocating..." : "Confirm Allocation"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
