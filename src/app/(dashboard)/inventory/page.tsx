import React from "react";
import { InventoryDashboardView } from "@/features/inventory/components/InventoryDashboardView";

export const metadata = {
  title: "Inventory Management | Unisex Parlour ERP",
  description: "Manage salon consumables, retail products, stock levels, and staff consumption."
};

export default function InventoryPage() {
  return <InventoryDashboardView />;
}
