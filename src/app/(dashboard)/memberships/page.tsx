import React from "react";
import type { Metadata } from "next";
import { MembershipsClient } from "@/features/memberships/components/MembershipsClient";

export const metadata: Metadata = {
  title: "Memberships | Unisex Parlour ERP",
  description: "Enterprise memberships dashboard, multi-beneficiary privileged sales, and tailored customer plans.",
};

export default function MembershipsPage() {
  return <MembershipsClient />;
}
