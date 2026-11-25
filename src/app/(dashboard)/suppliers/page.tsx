import React from "react";
import ProcurementHubView from "@/features/procurement/components/ProcurementHubView";

export const metadata = {
  title: "Suppliers & Procurement | Unisex Parlour ERP",
  description:
    "Manage supplier directory, purchase orders, goods receiving (GRN), and vendor invoice settlements.",
};

export default function SuppliersPage() {
  return <ProcurementHubView />;
}

