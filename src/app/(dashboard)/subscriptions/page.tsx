import React from "react";
import { SubscriptionList } from "@/features/subscriptions/components/SubscriptionList";

export const metadata = {
  title: "Subscriptions | Unisex Parlour ERP",
  description: "Manage customer prepaid subscriptions and service entitlement balances.",
};

export default function SubscriptionsPage() {
  return <SubscriptionList />;
}
