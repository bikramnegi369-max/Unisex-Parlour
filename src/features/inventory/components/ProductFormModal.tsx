import React from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProductSchema, CreateProductInput } from "../schemas/inventory.schema";
import { Product } from "../types/inventory.types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateProduct, useUpdateProduct } from "../hooks/useInventory";
import { toast } from "sonner";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit
}) => {
  const isEditing = Boolean(productToEdit);
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema) as unknown as Resolver<CreateProductInput>,
    defaultValues: productToEdit
      ? {
          name: productToEdit.name,
          sku: productToEdit.sku,
          category: productToEdit.category,
          usageType: productToEdit.usageType,
          stockUnit: productToEdit.stockUnit,
          costPrice: productToEdit.costPrice,
          sellingPrice: productToEdit.sellingPrice,
          reorderLevel: productToEdit.reorderLevel,
          status: productToEdit.status
        }
      : {
          name: "",
          sku: "",
          category: "",
          usageType: "both",
          stockUnit: "piece",
          costPrice: 0,
          sellingPrice: 0,
          reorderLevel: 5,
          status: "active"
        }
  });

  React.useEffect(() => {
    if (productToEdit) {
      reset({
        name: productToEdit.name,
        sku: productToEdit.sku,
        category: productToEdit.category,
        usageType: productToEdit.usageType,
        stockUnit: productToEdit.stockUnit,
        costPrice: productToEdit.costPrice,
        sellingPrice: productToEdit.sellingPrice,
        reorderLevel: productToEdit.reorderLevel,
        status: productToEdit.status
      });
    } else {
      reset({
        name: "",
        sku: "",
        category: "",
        usageType: "both",
        stockUnit: "piece",
        costPrice: 0,
        sellingPrice: 0,
        reorderLevel: 5,
        status: "active"
      });
    }
  }, [productToEdit, reset]);

  const onSubmit = async (data: CreateProductInput) => {
    try {
      if (isEditing && productToEdit) {
        await updateMutation.mutateAsync({ id: productToEdit.id, data });
        toast.success(`Product "${data.name}" updated successfully`);
      } else {
        await createMutation.mutateAsync(data);
        toast.success(`Product "${data.name}" added to catalogue`);
      }
      onClose();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to save product";
      toast.error(errorMsg);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={isEditing ? "Edit Product Catalogue" : "Add New Product"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Product Name *</label>
            <Input {...register("name")} placeholder="e.g. Keratin Shampoo 500ml" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">SKU (Stock Keeping Unit) *</label>
            <Input {...register("sku")} placeholder="e.g. KER-SHAMP-500" className="uppercase" />
            {errors.sku && <p className="text-xs text-red-500 mt-1">{errors.sku.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Category *</label>
            <Input {...register("category")} placeholder="e.g. Hair Care, Skin, Styling" />
            {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Usage Type *</label>
            <select
              {...register("usageType")}
              className="w-full h-10 px-3 py-2 border rounded-md text-sm bg-background"
            >
              <option value="both">Both (Salon Service & Retail POS)</option>
              <option value="salon_consumption">Salon Consumable Only (Internal)</option>
              <option value="retail_sale">Retail Product Only (Client Sale)</option>
            </select>
            {errors.usageType && <p className="text-xs text-red-500 mt-1">{errors.usageType.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Stock Unit *</label>
            <select
              {...register("stockUnit")}
              className="w-full h-10 px-3 py-2 border rounded-md text-sm bg-background"
            >
              <optgroup label="Discrete Units (Integers)">
                <option value="piece">Piece (pc)</option>
                <option value="bottle">Bottle</option>
                <option value="box">Box</option>
                <option value="pack">Pack</option>
                <option value="kit">Kit</option>
              </optgroup>
              <optgroup label="Continuous Units (Up to 3 Decimals)">
                <option value="ml">Millilitre (ml)</option>
                <option value="l">Litre (l)</option>
                <option value="g">Gram (g)</option>
                <option value="kg">Kilogram (kg)</option>
              </optgroup>
            </select>
            {errors.stockUnit && <p className="text-xs text-red-500 mt-1">{errors.stockUnit.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Reorder Level *</label>
            <Input type="number" step="any" {...register("reorderLevel")} placeholder="5" />
            {errors.reorderLevel && (
              <p className="text-xs text-red-500 mt-1">{errors.reorderLevel.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Cost Price (₹)</label>
            <Input type="number" step="0.01" {...register("costPrice")} placeholder="0.00" />
            {errors.costPrice && <p className="text-xs text-red-500 mt-1">{errors.costPrice.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Selling Price (₹)</label>
            <Input type="number" step="0.01" {...register("sellingPrice")} placeholder="0.00" />
            {errors.sellingPrice && (
              <p className="text-xs text-red-500 mt-1">{errors.sellingPrice.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Product"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
