import { redirect } from "next/navigation";

export default function ActivityLogsRedirectPage() {
  redirect("/audit-logs");
}
