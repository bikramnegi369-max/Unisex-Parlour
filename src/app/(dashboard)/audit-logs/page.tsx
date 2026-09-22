import React from "react";
import AuditLogList from "@/features/audit-logs/components/AuditLogList";

export const metadata = {
  title: "Audit Logs | Unisex Parlour ERP",
  description: "View system audit logs and historical event records.",
};

export default function AuditLogsPage() {
  return <AuditLogList />;
}
