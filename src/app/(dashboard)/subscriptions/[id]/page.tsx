import React from "react";
import { SubscriptionDetailsPage } from "@/features/subscriptions/components/SubscriptionDetailsPage";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Subscription Details | Unisex Parlour ERP",
  description: "View and manage prepaid customer subscription entitlements and redemption history.",
};

export default async function SubscriptionDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <SubscriptionDetailsPage id={id} />;
}
