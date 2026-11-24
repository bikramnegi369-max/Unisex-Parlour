import React from "react";
import type { Metadata } from "next";
import EmployeeDetailsPage from "@/features/employees/components/EmployeeDetailsPage";

interface PageProps {
  params: Promise<{ employeeId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { employeeId } = await params;
  return {
    title: "Employee Details | Unisex Parlour ERP",
    description: `Enterprise employee profile, branch assignments, service capabilities, compensation, and performance incentives for staff member ${employeeId}.`,
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
    openGraph: {
      title: "Employee Profile & Incentives | Unisex Parlour ERP",
      description: "Enterprise staff directory, work authorization, payroll, and incentives ledger.",
      type: "website",
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { employeeId } = await params;
  return <EmployeeDetailsPage employeeId={employeeId} />;
}
