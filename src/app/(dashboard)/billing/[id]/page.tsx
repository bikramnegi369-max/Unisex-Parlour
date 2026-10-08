import React from "react";
import { InvoiceDetailsPage } from "@/features/billing/components/InvoiceDetailsPage";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Invoice Details | Unisex Parlour ERP",
  description: "View invoice breakdown, line items, and payment transactions.",
};

export default async function InvoicePage({ params }: PageProps) {
  const { id } = await params;
  return <InvoiceDetailsPage id={id} />;
}
