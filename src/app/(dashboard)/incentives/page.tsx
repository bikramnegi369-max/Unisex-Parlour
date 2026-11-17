import { Metadata } from "next";
import { IncentivesDashboardView } from "@/features/incentives/components/IncentivesDashboardView";

export const metadata: Metadata = {
  title: "Incentives & Performance | Unisex Parlour ERP",
  description: "Configure staff commission schemes, performance tiers, and target bonuses",
};

export default function IncentivesPage() {
  return <IncentivesDashboardView />;
}
