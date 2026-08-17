import React from "react";
import { BranchList } from "@/features/branches/components/BranchList";

export const metadata = {
  title: "Branch Management | Unisex Parlour ERP",
  description: "Manage physical and logical branch locations across your organization.",
};

export default function BranchesPage() {
  return <BranchList />;
}
