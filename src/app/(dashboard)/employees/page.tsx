import React from "react";
import EmployeeList from "@/features/employees/components/EmployeeList";

export const metadata = {
  title: "Employees & Staff | Unisex Parlour ERP",
  description: "Manage employee profiles, credentials, role permissions, and branch visibility scopes.",
};

export default function EmployeesPage() {
  return <EmployeeList />;
}
