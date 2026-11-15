import { Metadata } from "next";
import { PayrollDashboardView } from "@/features/payroll/components/PayrollDashboardView";

export const metadata: Metadata = {
  title: "Salary & Payroll | Unisex Parlour ERP",
  description: "Salon staff salary calculation, compensation structures and payment disbursal",
};

export default function PayrollPage() {
  return <PayrollDashboardView />;
}
