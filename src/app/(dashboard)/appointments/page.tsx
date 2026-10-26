import React from "react";
import { AppointmentsClient } from "@/features/appointments/components/AppointmentsClient";

export const metadata = {
  title: "Appointments | Unisex Parlour ERP",
  description: "Manage salon appointments, staff allocations, scheduling, and walk-in bookings.",
};

export default function AppointmentsPage() {
  return <AppointmentsClient />;
}
