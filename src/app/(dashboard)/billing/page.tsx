import React from "react";
import { InvoiceList } from "@/features/billing/components/InvoiceList";

export const metadata = {
  title: "Billing & POS | Unisex Parlour ERP",
  description: "Checkout invoices, record manual payments, and monitor billing transactions.",
};

export default function BillingPage() {
  return <InvoiceList />;
}
