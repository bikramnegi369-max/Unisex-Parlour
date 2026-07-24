"use client";

import React from "react";
import { PermissionType, hasPermission } from "@/lib/permissions";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface PermissionGateProps {
  permission: PermissionType;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function PermissionGate({
  permission,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { user } = useAuth();
  const hasAccess = hasPermission(user, permission);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
