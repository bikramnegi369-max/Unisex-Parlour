import React from "react";
import { Badge } from "@/components/ui/badge";
import { SchemeStatus } from "../types/incentives.types";

interface SchemeStatusBadgeProps {
  status: SchemeStatus;
}

export const SchemeStatusBadge: React.FC<SchemeStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case "active":
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
          Active
        </Badge>
      );
    case "draft":
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium">
          Draft
        </Badge>
      );
    case "paused":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
          Paused
        </Badge>
      );
    case "archived":
      return (
        <Badge variant="outline" className="bg-zinc-100 text-zinc-600 border-zinc-200 font-medium">
          Archived
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};
