"use client";

import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { SectionTabs, SectionTabItem } from "@/components/ui/section-tabs";

import React, { useState } from "react";
import { useProcurementOverview } from "../hooks/useProcurement";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import {
  Truck,
  FileText,
  PackageCheck,
  Receipt,
  CreditCard,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SupplierDirectoryView from "./SupplierDirectoryView";
import PurchaseOrdersView from "./PurchaseOrdersView";
import GoodsReceivingView from "./GoodsReceivingView";
import SupplierInvoicesView from "./SupplierInvoicesView";
import { PurchaseOrder } from "../types/procurement.types";

export default function ProcurementHubView() {
  const { user } = useAuth();
  const { currentBranchId } = useBranchContext();
  const [activeTab, setActiveTab] = useState<
    "overview" | "suppliers" | "orders" | "receiving" | "invoices"
  >("overview");
  const [selectedPOForReceiving, setSelectedPOForReceiving] =
    useState<PurchaseOrder | null>(null);

  const { data: overview, isLoading } = useProcurementOverview(currentBranchId);

  const canViewSuppliers = hasPermission(user, "procurement.suppliers.view");
  const canViewOrders = hasPermission(user, "procurement.orders.view");

  const handleStartReceiving = (po: PurchaseOrder) => {
    setSelectedPOForReceiving(po);
    setActiveTab("receiving");
  };

  const tabItems: SectionTabItem<
    "overview" | "suppliers" | "orders" | "receiving" | "invoices"
  >[] = [
    { key: "overview", label: "Overview & Metrics" },
    ...(canViewSuppliers
      ? [
          {
            key: "suppliers" as const,
            label: "Suppliers",
            icon: <Truck className="h-4 w-4" />,
          },
        ]
      : []),
    ...(canViewOrders
      ? [
          {
            key: "orders" as const,
            label: "Purchase Orders",
            icon: <FileText className="h-4 w-4" />,
          },
          {
            key: "receiving" as const,
            label: "Goods Receiving (GRN)",
            icon: <PackageCheck className="h-4 w-4" />,
          },
          {
            key: "invoices" as const,
            label: "Invoices & Bills",
            icon: <Receipt className="h-4 w-4" />,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeaderBanner
        title="Suppliers & Procurement"
        description="Manage supplier directory, purchase orders, goods receiving (GRN), and vendor invoice settlements."
        icon={Truck}
      />

      {/* Top Navigation Tabs */}
      <SectionTabs
        ariaLabel="Suppliers and procurement sections"
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        items={tabItems}
      />

      {/* Main Tab Views */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-card p-4 rounded-xl border border-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-between">
                Active Suppliers
                <Truck className="h-3.5 w-3.5 text-primary" />
              </span>
              <p className="text-xl font-bold text-foreground">
                {overview?.activeSuppliersCount || 0}
              </p>
            </div>

            <div className="bg-card p-4 rounded-xl border border-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-between">
                Draft Orders
                <Clock className="h-3.5 w-3.5 text-amber-500" />
              </span>
              <p className="text-xl font-bold text-foreground">
                {overview?.draftOrdersCount || 0}
              </p>
            </div>

            <div className="bg-card p-4 rounded-xl border border-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-between">
                Awaiting Delivery
                <PackageCheck className="h-3.5 w-3.5 text-blue-500" />
              </span>
              <p className="text-xl font-bold text-foreground">
                {isLoading ? (
                  <span className="inline-block h-6 w-12 rounded bg-muted animate-pulse" />
                ) : (
                  overview?.awaitingDeliveryCount || 0
                )}
              </p>
            </div>

            <div className="bg-card p-4 rounded-xl border border-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-between">
                Partially Received
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              </span>
              <p className="text-xl font-bold text-foreground">
                {isLoading ? (
                  <span className="inline-block h-6 w-12 rounded bg-muted animate-pulse" />
                ) : (
                  overview?.partiallyReceivedCount || 0
                )}
              </p>
            </div>

            <div className="bg-card p-4 rounded-xl border border-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-between">
                Unpaid Invoices
                <Receipt className="h-3.5 w-3.5 text-rose-500" />
              </span>
              <p className="text-xl font-bold text-foreground">
                {isLoading ? (
                  <span className="inline-block h-6 w-12 rounded bg-muted animate-pulse" />
                ) : (
                  overview?.unpaidInvoicesCount || 0
                )}
              </p>
            </div>

            <div className="bg-card p-4 rounded-xl border border-border space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-between">
                Outstanding Balance
                <CreditCard className="h-3.5 w-3.5 text-primary" />
              </span>
              <p className="text-xl font-bold text-primary">
                {isLoading ? (
                  <span className="inline-block h-6 w-20 rounded bg-muted animate-pulse" />
                ) : (
                  `₹${(overview?.outstandingSupplierBalance || 0).toLocaleString()}`
                )}
              </p>
            </div>
          </div>

          {/* Quick Action Banner */}
          <div className="bg-primary/5 rounded-2xl border border-primary/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground">
                Stock Domain Separation Enforced
              </h3>
              <p className="text-xs text-muted-foreground max-w-xl">
                When drafting purchase orders and confirming goods arrival,
                items are explicitly routed into{" "}
                <strong className="text-foreground">Salon Consumables</strong>{" "}
                (service station consumption) or{" "}
                <strong className="text-foreground">Retail Products</strong>{" "}
                (POS store shelves) to prevent inventory drift.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setActiveTab("orders")}
                className="text-xs"
              >
                New Purchase Order
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("suppliers")}
                className="text-xs"
              >
                View Suppliers
              </Button>
            </div>
          </div>

          {/* Recent Orders & Inward Deliveries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="font-bold text-xs text-foreground">
                  Recent Purchase Orders
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("orders")}
                  className="h-7 text-xs text-primary"
                >
                  View All
                </Button>
              </div>

              <div className="space-y-2">
                {(overview?.recentOrders || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No recent orders
                  </p>
                ) : (
                  overview?.recentOrders.map((po: PurchaseOrder) => (
                    <div
                      key={po.id ?? (po as { _id?: string })._id ?? po.poNumber}
                      className="p-3 rounded-lg border border-border bg-muted/10 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-foreground">
                          {po.poNumber}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {po.supplier?.name} • ₹
                          {po.totalAmount.toLocaleString()}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize bg-muted text-muted-foreground">
                        {po.status.replace("_", " ")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Goods Receipts */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="font-bold text-xs text-foreground">
                  Recent Inward Goods (GRN)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("receiving")}
                  className="h-7 text-xs text-primary"
                >
                  View All
                </Button>
              </div>

              <div className="space-y-2">
                {(overview?.recentReceipts || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No recent inward receipts
                  </p>
                ) : (
                  overview?.recentReceipts.map(
                    (grn: {
                      id?: string;
                      _id?: string;
                      grnNumber: string;
                      supplier?: { name?: string };
                      totalAmount: number;
                    }) => (
                    <div
                      key={
                        grn.id ?? (grn as { _id?: string })._id ?? grn.grnNumber
                      }
                      className="p-3 rounded-lg border border-border bg-muted/10 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-foreground">
                          {grn.grnNumber}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {grn.supplier?.name} • ₹
                          {grn.totalAmount.toLocaleString()}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                        Received
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "suppliers" && <SupplierDirectoryView />}
      {activeTab === "orders" && (
        <PurchaseOrdersView onSelectPOForReceiving={handleStartReceiving} />
      )}
      {activeTab === "receiving" && (
        <GoodsReceivingView
          selectedPO={selectedPOForReceiving}
          onReceiptCompleted={() => setSelectedPOForReceiving(null)}
        />
      )}
      {activeTab === "invoices" && <SupplierInvoicesView />}
    </div>
  );
}
