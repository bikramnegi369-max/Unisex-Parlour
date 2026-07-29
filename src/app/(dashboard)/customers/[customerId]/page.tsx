import React from "react";
import CustomerDetailsPage from "@/features/customers/components/CustomerDetailsPage";

interface PageProps {
  params: Promise<{ customerId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { customerId } = await params;
  return <CustomerDetailsPage customerId={customerId} />;
}
