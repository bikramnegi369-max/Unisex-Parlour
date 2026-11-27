"use client";

import React, { useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  purchaseOrderFormSchema,
  PurchaseOrderFormValues,
} from "../schemas/procurement.schemas";
import {
  usePurchaseOrders,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrderStatus,
  useSuppliers,
} from "../hooks/useProcurement";
import { useProducts } from "@/features/inventory/hooks/useInventory";
import { Product } from "@/features/inventory/types/inventory.types";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { PurchaseOrder, Supplier } from "../types/procurement.types";
import {
  FileText,
  Plus,
  Search,
  Trash2,
  PackageCheck,
  RefreshCw,
  Truck,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";

interface PurchaseOrdersViewProps {
  onSelectPOForReceiving?: (po: PurchaseOrder) => void;
}

export default function PurchaseOrdersView({
  onSelectPOForReceiving,
}: PurchaseOrdersViewProps) {
  const { user } = useAuth();
  const { currentBranchId } = useBranchContext();
  const canCreate = hasPermission(user, "procurement.orders.create");
  const canUpdate = hasPermission(user, "procurement.orders.update");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const {
    data: ordersData,
    isLoading: ordersLoading,
    isFetching: ordersFetching,
    refetch: refetchOrders,
  } = usePurchaseOrders({
    branchId: currentBranchId,
    status: statusFilter,
    search: debouncedSearch || undefined,
    page,
    limit,
  });

  const { data: suppliersData } = useSuppliers({
    status: "active",
    limit: 100,
  });
  const { data: productsData } = useProducts({ limit: 100 });
  const products: Product[] = productsData?.data || [];
  const suppliers: Supplier[] = suppliersData?.data || [];

  const createMutation = useCreatePurchaseOrder();
  const updateStatusMutation = useUpdatePurchaseOrderStatus(
    selectedPO?.id || "",
  );

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: {
      branchId: currentBranchId || undefined,
      items: [
        {
          productId: "",
          targetDomain: "retail_products",
          orderedQuantity: 1,
          unitCostPrice: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = useWatch({ control, name: "items" }) || [];
  const calculatedTotal = watchedItems.reduce((acc, it) => {
    const qty = Number(it.orderedQuantity) || 0;
    const cost = Number(it.unitCostPrice) || 0;
    return acc + qty * cost;
  }, 0);

  const handleOpenCreate = () => {
    reset({
      supplierId: suppliers?.[0]?.id || "",
      branchId: currentBranchId || undefined,
      notes: "",
      items: [
        {
          productId: products?.[0]?.id || "",
          targetDomain:
            products?.[0]?.usageType === "salon_consumption"
              ? "salon_consumables"
              : "retail_products",
          orderedQuantity: 1,
          unitCostPrice: products?.[0]?.costPrice || 0,
        },
      ],
    });
    setIsCreateOpen(true);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      setValue(`items.${index}.productId`, prod.id);
      setValue(`items.${index}.unitCostPrice`, prod.costPrice || 0);
      if (prod.usageType === "salon_consumption") {
        setValue(`items.${index}.targetDomain`, "salon_consumables");
      } else {
        setValue(`items.${index}.targetDomain`, "retail_products");
      }
    }
  };

  const onSubmit = async (values: PurchaseOrderFormValues) => {
    const payload = {
      ...values,
      branchId: currentBranchId || undefined,
    };
    await createMutation.mutateAsync(payload);
    setIsCreateOpen(false);
  };

  const handleStatusChange = async (status: "ordered" | "cancelled") => {
    if (!selectedPO) return;
    await updateStatusMutation.mutateAsync({ status });
    setSelectedPO(null);
  };

  const orders: PurchaseOrder[] = ordersData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FileText className="h-6 w-6 text-primary" />
            Purchase Orders
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Issue orders to vendors with explicit stock-domain tagging (Salon
            Consumables vs Retail Products).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchOrders()}
            disabled={ordersFetching}
            className="flex items-center gap-2 text-xs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${ordersFetching ? "animate-spin" : ""}`}
            />
            Sync
          </Button>
          {canCreate && (
            <Button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 font-semibold shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Draft Purchase Order
            </Button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search PO Number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            "draft",
            "ordered",
            "partially_received",
            "received",
            "cancelled",
          ].map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setStatusFilter(statusFilter === st ? undefined : st)
              }
              className="text-[11px] capitalize h-8"
            >
              {st.replace("_", " ")}
            </Button>
          ))}
        </div>
      </div>

      {/* Order List & Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {ordersLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground bg-card rounded-xl border border-border animate-pulse">
              Loading purchase orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center bg-card rounded-2xl border border-border space-y-3">
              <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">
                No purchase orders found
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No orders match your filter criteria. Create a new purchase
                order to replenish stock.
              </p>
              {canCreate && (
                <Button size="sm" onClick={handleOpenCreate} className="mt-2">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Create PO
                </Button>
              )}
            </div>
          ) : (
            orders.map((po: PurchaseOrder) => (
              <div
                key={po.id}
                onClick={() => setSelectedPO(po)}
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-150 flex items-center justify-between gap-4 ${
                  selectedPO?.id === po.id
                    ? "bg-primary/5 border-primary shadow-xs"
                    : "bg-card border-border hover:border-primary/40"
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">
                      {po.poNumber}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                        po.status === "received"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : po.status === "partially_received"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : po.status === "ordered"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : po.status === "cancelled"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {po.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      {po.supplier?.name || "Supplier"}
                    </span>
                    <span>{po.items?.length || 0} product lines</span>
                    <span className="font-semibold text-foreground">
                      ₹{po.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {canUpdate &&
                    ["ordered", "partially_received"].includes(po.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPOForReceiving?.(po);
                        }}
                        className="text-xs h-8 border-primary text-primary hover:bg-primary/10"
                      >
                        <PackageCheck className="h-3.5 w-3.5 mr-1" />
                        Receive Goods
                      </Button>
                    )}
                </div>
              </div>
            ))
          )}

          {ordersData?.meta && (
            <Pagination
              currentPage={Number(ordersData.meta.page)}
              totalPages={ordersData.meta.totalPages}
              totalItems={ordersData.meta.total}
              onPageChange={setPage}
              pageSize={limit}
              onPageSizeChange={(newSize) => {
                setLimit(newSize);
                setPage(1);
              }}
              itemLabel="purchase orders"
            />
          )}
        </div>

        {/* Selected PO Details Pane */}
        <div className="lg:col-span-1">
          {selectedPO ? (
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-xs sticky top-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    {selectedPO.poNumber}
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    Destination: {selectedPO.branch?.name || "Branch"}
                  </span>
                </div>
                <span className="text-xs font-bold text-primary">
                  ₹{selectedPO.totalAmount.toLocaleString()}
                </span>
              </div>

              {/* Lifecycle Actions */}
              {canUpdate && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {selectedPO.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange("ordered")}
                      disabled={updateStatusMutation.isPending}
                      className="flex-1 min-w-32.5 text-xs"
                    >
                      Issue / Mark as Ordered
                    </Button>
                  )}
                  {["draft", "ordered"].includes(selectedPO.status) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleStatusChange("cancelled")}
                      disabled={updateStatusMutation.isPending}
                      className="flex-1 min-w-27.5 text-xs"
                    >
                      Cancel PO
                    </Button>
                  )}
                  {["ordered", "partially_received"].includes(
                    selectedPO.status,
                  ) && (
                    <Button
                      size="sm"
                      onClick={() => onSelectPOForReceiving?.(selectedPO)}
                      className="flex-1 min-w-35 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <PackageCheck className="h-3.5 w-3.5 mr-1 shrink-0" />
                      Receive Goods (GRN)
                    </Button>
                  )}
                </div>
              )}

              {/* Items Breakdown */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Order Line Items ({selectedPO.items.length})
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDetailsModalOpen(true)}
                    className="h-6 px-2 text-[11px] text-primary hover:text-primary"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    View Full Order
                  </Button>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {selectedPO.items.map((line, idx) => {
                    const populatedProduct =
                      typeof line.productId === "object" &&
                      line.productId !== null
                        ? (line.productId as {
                            name?: string;
                            sku?: string;
                            stockUnit?: string;
                          })
                        : undefined;
                    const productName =
                      populatedProduct?.name || line.product?.name || "Product";
                    const productSku =
                      populatedProduct?.sku || line.product?.sku;
                    const productUnit =
                      populatedProduct?.stockUnit || line.product?.stockUnit;

                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-border bg-muted/20 text-xs space-y-1.5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <span className="font-semibold text-foreground wrap-break-word block">
                              {productName}
                            </span>
                            {(productSku || productUnit) && (
                              <span className="text-[10px] text-muted-foreground block wrap-break-word">
                                {productSku ? `SKU: ${productSku}` : ""}
                                {productSku && productUnit ? " • " : ""}
                                {productUnit ? `Unit: ${productUnit}` : ""}
                              </span>
                            )}
                          </div>
                          <span
                            className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              line.targetDomain === "salon_consumables"
                                ? "bg-purple-500/10 text-purple-600"
                                : "bg-blue-500/10 text-blue-600"
                            }`}
                          >
                            {line.targetDomain === "salon_consumables"
                              ? "Salon Consumable"
                              : "Retail Stock"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span>
                            Ordered: {line.orderedQuantity} | Received:{" "}
                            {line.receivedQuantity}
                          </span>
                          <span className="font-medium text-foreground">
                            ₹{line.unitCostPrice.toLocaleString()} ×{" "}
                            {line.orderedQuantity} = ₹
                            {line.lineTotal.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedPO.notes && (
                <div className="pt-2 border-t border-border text-xs">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Notes
                  </span>
                  <p className="text-muted-foreground mt-0.5">
                    {selectedPO.notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card/50 rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              Select a purchase order to review ordered vs received items,
              lifecycle state, or receive incoming stock.
            </div>
          )}
        </div>
      </div>

      {/* Create Purchase Order Dialog */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Draft New Purchase Order"
        maxWidth="2xl"
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 py-2 text-xs"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-foreground">Supplier *</label>
              <select
                {...register("supplierId")}
                className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                {suppliers.map((s: Supplier) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.supplierId && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors.supplierId.message}
                </p>
              )}
            </div>

            <div>
              <label className="font-medium text-foreground">
                Expected Delivery Date
              </label>
              <Input
                type="date"
                {...register("expectedDeliveryDate")}
                className="mt-1"
              />
            </div>
          </div>

          {/* Product Lines */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground text-xs">
                Products to Order
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    productId: products?.[0]?.id || "",
                    targetDomain: "retail_products",
                    orderedQuantity: 1,
                    unitCostPrice: products?.[0]?.costPrice || 0,
                  })
                }
                className="h-7 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Line
              </Button>
            </div>

            <div className="space-y-2.5">
              {fields.map((field, index) => {
                const currentProdId = watchedItems[index]?.productId || "";
                const selectedProduct = products.find(
                  (p) => p.id === currentProdId,
                );

                return (
                  <div
                    key={field.id}
                    className="p-3 rounded-xl border border-border bg-card space-y-2"
                  >
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <label className="text-[10px] text-muted-foreground font-semibold">
                          Product
                        </label>
                        <select
                          value={currentProdId}
                          onChange={(e) =>
                            handleProductSelect(index, e.target.value)
                          }
                          className="w-full mt-0.5 h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku}) [{p.usageType}]
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <label className="text-[10px] text-muted-foreground font-semibold">
                          Stock Domain *
                        </label>
                        <select
                          {...register(`items.${index}.targetDomain`)}
                          className="w-full mt-0.5 h-8 rounded-md border border-input bg-background px-2 text-[11px] font-semibold"
                        >
                          {["retail_sale", "both"].includes(
                            selectedProduct?.usageType || "",
                          ) && (
                            <option value="retail_products">
                              Retail Products
                            </option>
                          )}
                          {["salon_consumption", "both"].includes(
                            selectedProduct?.usageType || "",
                          ) && (
                            <option value="salon_consumables">
                              Salon Consumables
                            </option>
                          )}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-muted-foreground font-semibold">
                          Qty
                        </label>
                        <Input
                          type="number"
                          step="any"
                          {...register(`items.${index}.orderedQuantity`, {
                            valueAsNumber: true,
                          })}
                          className="h-8 mt-0.5 text-xs"
                        />
                      </div>

                      <div className="col-span-2 flex items-center justify-between gap-1">
                        <div>
                          <label className="text-[10px] text-muted-foreground font-semibold">
                            Cost (₹)
                          </label>
                          <Input
                            type="number"
                            {...register(`items.${index}.unitCostPrice`, {
                              valueAsNumber: true,
                            })}
                            className="h-8 mt-0.5 text-xs"
                          />
                        </div>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            className="h-8 w-8 p-0 mt-3.5 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-2 px-1 text-xs">
              <span className="font-semibold text-muted-foreground">
                Estimated Order Total:
              </span>
              <span className="font-bold text-base text-primary">
                ₹{calculatedTotal.toLocaleString()}
              </span>
            </div>
          </div>

          <div>
            <label className="font-medium text-foreground">Order Notes</label>
            <Input
              {...register("notes")}
              className="mt-1"
              placeholder="Delivery instructions"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={createMutation.isPending}>
              Save Draft Purchase Order
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Full Purchase Order Details Modal */}
      {selectedPO && (
        <Dialog
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          title={`Purchase Order — ${selectedPO.poNumber}`}
          maxWidth="3xl"
        >
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Vendor: {selectedPO.supplier?.name || "—"} • Status:{" "}
              {selectedPO.status.replace("_", " ").toUpperCase()} •{" "}
              {selectedPO.items.length} line item(s)
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Product</th>
                    <th className="px-3 py-2.5 font-semibold">Domain</th>
                    <th className="px-3 py-2.5 font-semibold text-right">
                      Ordered
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-right">
                      Received
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-right">
                      Unit Cost
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-right">
                      Line Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedPO.items.map((line, idx) => {
                    const populatedProduct =
                      typeof line.productId === "object" &&
                      line.productId !== null
                        ? (line.productId as {
                            name?: string;
                            sku?: string;
                            stockUnit?: string;
                          })
                        : undefined;
                    const productName =
                      populatedProduct?.name || line.product?.name || "Product";
                    const productSku =
                      populatedProduct?.sku || line.product?.sku;
                    const productUnit =
                      populatedProduct?.stockUnit || line.product?.stockUnit;

                    return (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-foreground wrap-break-word">
                            {productName}
                          </div>
                          {(productSku || productUnit) && (
                            <div className="text-[10px] text-muted-foreground">
                              {productSku ? `SKU: ${productSku}` : ""}
                              {productSku && productUnit ? " • " : ""}
                              {productUnit ? `Unit: ${productUnit}` : ""}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              line.targetDomain === "salon_consumables"
                                ? "bg-purple-500/10 text-purple-600"
                                : "bg-blue-500/10 text-blue-600"
                            }`}
                          >
                            {line.targetDomain === "salon_consumables"
                              ? "Salon Consumable"
                              : "Retail Stock"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium">
                          {line.orderedQuantity}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium">
                          {line.receivedQuantity}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          ₹{line.unitCostPrice.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-foreground">
                          ₹{line.lineTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border text-xs">
              <span className="text-muted-foreground">
                {selectedPO.notes ? `Notes: ${selectedPO.notes}` : ""}
              </span>
              <div className="text-sm font-bold text-foreground">
                Total: ₹{selectedPO.totalAmount.toLocaleString()}
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
