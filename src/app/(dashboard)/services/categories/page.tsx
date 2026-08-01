import React from "react";
import ServiceCategoriesList from "@/features/services/components/common/ServiceCategoriesList";

export const metadata = {
  title: "Service Categories | Unisex Parlour ERP",
  description: "Configure and manage category hierarchies to structure parlours service menu catalogs.",
};

export default function ServiceCategoriesPage() {
  return <ServiceCategoriesList />;
}
