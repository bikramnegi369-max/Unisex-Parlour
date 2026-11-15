"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  receiveGoodsFormSchema,
  ReceiveGoodsFormValues,
} from "../schemas/procurement.schemas";
import {
  useReceiveGoods,
  useGoodsReceipts,
  usePurchaseOrders,
} from "../hooks/useProcurement";
import { PurchaseOrder, GoodsReceiptNote } from "../types/procurement.types";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import {
  PackageCheck,
  CheckCircle,
  Truck,
  Building,
  AlertCircle,
  FileCheck,
  History,
  Calendar,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface GoodsReceivingViewProps {
  selectedPO?: PurchaseOrder | null;
  onReceiptCompleted?: () => void;
}

export default function GoodsReceivingView({
  selectedPO: initialSelectedPO,
  onReceiptCompleted,
}: GoodsReceivingViewProps) {
  const { user } = useAuth();
  const { currentBranchId } = useBranchContext();
  const canUpdate = hasPermission(user, "procurement.orders.update");

  const [activeTab, setActiveTab] = useState<"receive" | "history">("receive");
  const [activePO, setActivePO] = useState<PurchaseOrder | null>(initialSelectedPO || null);

  // Load eligible purchase orders for receiving (ordered or partially_received)
  const { data: eligibleOrdersData, isLoading: ordersLoading } = usePurchaseOrders({
    branchId: currentBranchId,
    limit: 50,
  });

  const eligibleOrders: PurchaseOrder[] = (eligibleOrdersData?.data || []).filter((po) =>
    ["ordered", "partially_received"].includes(po.status)
  );

  // Sync prop changes into activePO
  useEffect(() => {
    if (initialSelectedPO) {
      setActivePO(initialSelectedPO);
    } else if (!activePO && eligibleOrders.length > 0) {
      setActivePO(eligibleOrders[0]);
    }
  }, [initialSelectedPO, eligibleOrders]);

  const { data: receiptsData, isLoading: receiptsLoading } = useGoodsReceipts({
    branchId: currentBranchId,
    purchaseOrderId: activePO?.id,
  });

  const receiveMutation = useReceiveGoods(activePO?.id || "");

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReceiveGoodsFormValues>({
    resolver: zodResolver(receiveGoodsFormSchema),
    defaultValues: {
      notes: "",
      items: [],
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "items",
  });

  // Re-initialize form whenever activePO changes
  useEffect(() => {
    if (activePO && activePO.items) {
      reset({
        notes: "",
        items: activePO.items.map((it) => ({
          productId: it.productId,
          receivedQuantity: Math.max(0, it.orderedQuantity - it.receivedQuantity),
          targetDomain: it.targetDomain,
        })),
      });
    }
  }, [activePO, reset]);

  const onSubmit = async (values: ReceiveGoodsFormValues) => {
    if (!activePO) return;
    try {
      const itemsToSubmit = values.items.filter((it) => Number(it.receivedQuantity) > 0);
      await receiveMutation.mutateAsync({
        ...values,
        items: itemsToSubmit,
      });
      onReceiptCompleted?.();
    } catch {
      // Error handled by mutation/toast notification; do not trigger completion
    }
  };

  const receipts: GoodsReceiptNote[] = receiptsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <PackageCheck className="h-6 w-6 text-primary" />
            Goods Receiving & Physical Inwarding (GRN)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Log physical arrival of stock against authorized POs. Automatically increments branch inventory and appends purchase_in movements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "receive" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("receive")}
            className="text-xs font-semibold"
          >
            Inward Stock
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("history")}
            className="text-xs font-semibold"
          >
            <History className="h-3.5 w-3.5 mr-1" />
            Receipt History
          </Button>
        </div>
      </div>

      {activeTab === "receive" ? (
        <div className="space-y-6">
          {/* Order Selector Card */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-foreground">
                  Select Purchase Order to Inward
                </label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Showing eligible purchase orders in &apos;ordered&apos; or &apos;partially_received&apos; status.
                </p>
              </div>

              <div className="w-full sm:w-80">
                <select
                  value={activePO?.id || ""}
                  onChange={(e) => {
                    const found = eligibleOrders.find((p) => p.id === e.target.value);
                    if (found) setActivePO(found);
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-semibold"
                >
                  {eligibleOrders.length === 0 ? (
                    <option value="">No pending orders available</option>
                  ) : (
                    eligibleOrders.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.poNumber} — {po.supplier?.name} (₹{po.totalAmount.toLocaleString()})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          {activePO ? (
            <div className="bg-card rounded-2xl border border-border p-6 shadow-xs space-y-6">
              {/* Purchase Order Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-foreground">
                      {activePO.poNumber}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 capitalize">
                      {activePO.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>Vendor: {activePO.supplier?.name}</span>
                    <span>•</span>
                    <span>Destination: {activePO.branch?.name || "Target Branch"}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-muted-foreground">Order Valuation</span>
                  <p className="text-base font-bold text-foreground">
                    ₹{activePO.totalAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Receiving Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-3">
                  <span className="text-xs font-bold text-foreground">
                    Verify Physical Count & Destination Domain
                  </span>

                  <div className="space-y-3">
                    {fields.map((field, idx) => {
                      const poLine = activePO.items[idx];
                      if (!poLine) return null;
                      const remaining = Math.max(
                        0,
                        poLine.orderedQuantity - poLine.receivedQuantity
                      );

                      return (
                        <div
                          key={field.id}
                          className="p-4 rounded-xl border border-border bg-muted/10 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs"
                        >
                          <div className="sm:col-span-4 space-y-0.5">
                            <span className="font-bold text-foreground">
                              {poLine.product?.name || "Product"}
                            </span>
                            <p className="text-[11px] text-muted-foreground">
                              SKU: {poLine.product?.sku} | Unit: {poLine.product?.stockUnit}
                            </p>
                          </div>

                          <div className="sm:col-span-3">
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                                poLine.targetDomain === "salon_consumables"
                                  ? "bg-purple-500/10 text-purple-600"
                                  : "bg-blue-500/10 text-blue-600"
                              }`}
                            >
                              Destination:{" "}
                              {poLine.targetDomain === "salon_consumables"
                                ? "Salon Consumables"
                                : "Retail Products"}
                            </span>
                          </div>

                          <div className="sm:col-span-2 text-muted-foreground text-[11px]">
                            <div>Ordered: {poLine.orderedQuantity}</div>
                            <div>Previously Received: {poLine.receivedQuantity}</div>
                            <div className="font-semibold text-foreground">
                              Remaining: {remaining}
                            </div>
                          </div>

                          <div className="sm:col-span-3">
                            <label className="text-[10px] font-semibold text-foreground">
                              Qty Receiving Now
                            </label>
                            <Input
                              type="number"
                              step="any"
                              max={remaining}
                              min={0}
                              {...register(`items.${idx}.receivedQuantity`, {
                                valueAsNumber: true,
                              })}
                              className="h-8 mt-0.5 text-xs font-bold"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {errors.items && (
                    <p className="text-red-500 text-xs mt-1">{errors.items.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">
                    Receiving Delivery Notes
                  </label>
                  <Input
                    {...register("notes")}
                    className="mt-1 text-xs"
                    placeholder="Delivery courier, bill of lading, package integrity notes"
                  />
                </div>

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3 text-xs">
                  <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    Confirming inward stock will write authoritative{" "}
                    <strong className="text-foreground">purchase_in</strong> records to the inventory ledger and increment the branch balance for these products. This action is atomic and irreversible.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={receiveMutation.isPending || !canUpdate}
                    className="font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    {receiveMutation.isPending ? "Recording Receipt..." : "Confirm & Inward Stock"}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-12 text-center bg-card rounded-2xl border border-dashed border-border space-y-3">
              <PackageCheck className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">No pending purchase orders</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                All purchase orders have been received or cancelled. To inward stock, draft and issue a new purchase order first.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Receipt History Tab */
        <div className="space-y-3">
          {receiptsLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground bg-card rounded-xl border border-border animate-pulse">
              Loading goods receipt notes...
            </div>
          ) : receipts.length === 0 ? (
            <div className="p-12 text-center bg-card rounded-2xl border border-border space-y-3">
              <FileCheck className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">No receipts on record</h3>
              <p className="text-xs text-muted-foreground">
                Inward delivery receipts will appear here once goods are accepted.
              </p>
            </div>
          ) : (
            receipts.map((grn: GoodsReceiptNote) => (
              <div
                key={grn.id}
                className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{grn.grnNumber}</span>
                    <span className="text-[10px] text-muted-foreground">
                      Ref PO: {grn.purchaseOrder?.poNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>Vendor: {grn.supplier?.name}</span>
                    <span>•</span>
                    <span>{grn.items?.length || 0} items received</span>
                    <span>•</span>
                    <span className="font-semibold text-foreground">
                      ₹{grn.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="text-right text-muted-foreground">
                  <div className="flex items-center gap-1 sm:justify-end">
                    <Calendar className="h-3 w-3" />
                    {new Date(grn.receivedAt).toLocaleDateString()}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    By {grn.receiver?.name || "Staff"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
