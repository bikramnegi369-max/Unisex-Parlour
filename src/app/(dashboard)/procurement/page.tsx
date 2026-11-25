import React from "react";
import ProcurementHubView from "@/features/procurement/components/ProcurementHubView";

export const metadata = {
  title: "Procurement | Unisex Parlour ERP",
  description:
    "Manage purchase orders, goods receiving (GRN), supplier directory, and vendor settlements.",
};

export default function ProcurementPage() {
  return <ProcurementHubView />;
}

