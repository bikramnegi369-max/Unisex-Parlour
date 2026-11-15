import { Metadata } from "next";
import { CouponsView } from "@/features/coupons/components/CouponsView";

export const metadata: Metadata = {
  title: "Coupons | Salon ERP",
  description: "Manage promotional coupons, discounts, validity periods, and branch exclusions.",
};

export default function CouponsPage() {
  return <CouponsView />;
}

