import React from "react";
import CustomerList from "@/features/customers/components/CustomerList";

export const metadata = {
  title: "Customers | Unisex Parlour ERP",
  description: "Manage customer profiles, visit preferences, and branch visibility scopes.",
};

export default function CustomersPage() {
  return <CustomerList />;
}
