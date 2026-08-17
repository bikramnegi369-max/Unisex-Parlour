import React from "react";
import { Badge } from "@/components/ui/badge";

interface BranchStatusBadgeProps {
  isActive: boolean;
}

export function BranchStatusBadge({ isActive }: BranchStatusBadgeProps) {
  if (isActive) {
    return <Badge variant="success">Active</Badge>;
  }
  return <Badge variant="destructive">Inactive</Badge>;
}
