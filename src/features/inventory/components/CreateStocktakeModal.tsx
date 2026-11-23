import React, { useState } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useCreateStocktake } from "../hooks/useInventory";
import { createStocktakeSchema, CreateStocktakeFormValues } from "../schemas/inventory.schema";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api/errors";
import { ClipboardList, AlertCircle } from "lucide-react";

interface CreateStocktakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newStocktake: any) => void;
}

export const CreateStocktakeModal: React.FC<CreateStocktakeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentBranchId, currentBranch } = useBranchContext();
  const createMutation = useCreateStocktake();
  const [idempotencyKey, setIdempotencyKey] = useState(() => `stk_init_${crypto.randomUUID()}`);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateStocktakeFormValues>({
    resolver: zodResolver(createStocktakeSchema) as unknown as Resolver<CreateStocktakeFormValues>,
    defaultValues: {
      title: "Physical Stocktake",
      targetDomain: "all",
      notes: "",
      branchId: currentBranchId || "",
    },
  });

  const selectedTargetDomain = watch("targetDomain");

  React.useEffect(() => {
    if (isOpen) {
      setValue("title", "Physical Stocktake");
      setValue("targetDomain", "all");
      setValue("notes", "");
      setValue("branchId", currentBranchId || "");
      setIdempotencyKey(`stk_init_${crypto.randomUUID()}`);
    }
  }, [isOpen, currentBranchId, setValue]);

  const onSubmit = async (values: CreateStocktakeFormValues) => {
    const effectiveBranchId = values.branchId || currentBranchId;
    if (!effectiveBranchId) {
      toast.error("A branch must be selected to initiate a stocktake");
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        payload: {
          title: values.title,
          targetDomain: values.targetDomain,
          notes: values.notes,
          branchId: effectiveBranchId,
        },
        idempotencyKey,
      });

      toast.success("Stocktake session created and inventory snapshot captured");
      onSuccess(created);
      onClose();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Failed to create stocktake session"));
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="lg">
      <div className="p-6 max-w-lg w-full bg-white dark:bg-zinc-900 rounded-lg shadow-xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-full text-indigo-600 dark:text-indigo-400">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Initiate Stocktake Session
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Branch: <span className="font-semibold text-gray-700 dark:text-gray-200">{currentBranch?.name || "Current Branch"}</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stocktake Title
            </label>
            <Input
              {...register("title")}
              placeholder="e.g. End of Month Inventory Audit"
              className="w-full"
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Scope & Domain
            </label>
            <Select
              value={selectedTargetDomain}
              onChange={(e) => setValue("targetDomain", e.target.value as any)}
              className="w-full"
            >
              <option value="all">All Inventory (Retail + Salon Consumables)</option>
              <option value="salon_consumables">Salon Consumables Only</option>
              <option value="retail_products">Retail Products Only</option>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Snapshots all active SKUs in the selected domain. Historical unallocated stock is strictly isolated.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes / Audit Remarks (Optional)
            </label>
            <Textarea
              {...register("notes")}
              placeholder="e.g. Conducted by morning shift team..."
              rows={3}
              className="w-full"
            />
            {errors.notes && (
              <p className="text-xs text-red-500 mt-1">{errors.notes.message}</p>
            )}
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Creating this session captures a live inventory snapshot. Entering physical counts and reviewing discrepancies is required before final posting.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200 dark:border-zinc-800">
            <Button type="button" variant="outline" onClick={onClose} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit(onSubmit)} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Capturing Snapshot..." : "Start Stocktake"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};