import React from "react";
import EmployeeDetailsPage from "@/features/employees/components/EmployeeDetailsPage";

interface PageProps {
  params: Promise<{ employeeId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { employeeId } = await params;
  return <EmployeeDetailsPage employeeId={employeeId} />;
}
