import React from "react";
import ServiceProfilePage from "@/features/services/components/common/ServiceProfilePage";

interface PageProps {
  params: Promise<{ serviceId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { serviceId } = await params;
  return <ServiceProfilePage serviceId={serviceId} />;
}
