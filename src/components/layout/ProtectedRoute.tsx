"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { routePermissions, RoutePath } from "@/lib/permissions/routePermissions";
import Unauthorized from "./Unauthorized";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-medium text-muted-foreground">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Evaluate RBAC permissions for the current path
  // Sort keys by descending length to match more specific routes (e.g. /services/categories) before parent routes (e.g. /services)
  const matchingKey = (Object.keys(routePermissions) as RoutePath[])
    .sort((a, b) => b.length - a.length)
    .find((path) => {
      return pathname === path || pathname.startsWith(path + "/");
    });

  if (!matchingKey) {
    // Fail-closed for unmapped routes
    return <Unauthorized />;
  }

  const requiredPermission = routePermissions[matchingKey];
  const isAuthorized = requiredPermission === null || hasPermission(user, requiredPermission);

  if (!isAuthorized) {
    return <Unauthorized />;
  }

  return <>{children}</>;
}

