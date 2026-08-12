import React from "react";
import LeaveDetailsPage from "@/features/leaves/components/LeaveDetailsPage";

interface PageProps {
  params: Promise<{ leaveId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { leaveId } = await params;
  return <LeaveDetailsPage leaveId={leaveId} />;
}
