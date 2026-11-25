import React from "react";
import { SettingsWorkspace } from "@/features/settings/components/SettingsWorkspace";

export const metadata = {
  title: "Settings | Unisex Parlour ERP",
  description: "Organization, branch, calendar, leave policy, and system administration settings.",
};

export default function SettingsPage() {
  return <SettingsWorkspace />;
}
