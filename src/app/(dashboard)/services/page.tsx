import React from "react";
import ServicesList from "@/features/services/components/common/ServicesList";

export const metadata = {
  title: "Services Catalogue | Unisex Parlour ERP",
  description: "Configure service menu, treatment durations, and catalog pricing configurations.",
};

export default function ServicesPage() {
  return <ServicesList />;
}
