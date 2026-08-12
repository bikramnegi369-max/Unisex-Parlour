import React from "react";
import LeaveList from "@/features/leaves/components/LeaveList";

export const metadata = {
  title: "Staff Leaves | Unisex Parlour ERP",
  description: "Request, review, approve, or cancel employee leave requests.",
};

export default function LeavesPage() {
  return <LeaveList />;
}
