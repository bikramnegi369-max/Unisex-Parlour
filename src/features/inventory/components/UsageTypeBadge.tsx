import React from "react";
import { Badge } from "@/components/ui/badge";
import { ProductUsageType } from "../types/inventory.types";
import { Scissors, ShoppingBag, Sparkles } from "lucide-react";

interface UsageTypeBadgeProps {
  usageType: ProductUsageType;
}

export const UsageTypeBadge: React.FC<UsageTypeBadgeProps> = ({ usageType }) => {
  switch (usageType) {
    case "salon_consumption":
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1 font-medium">
          <Scissors className="w-3 h-3" />
          Salon Consumable
        </Badge>
      );
    case "retail_sale":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 font-medium">
          <ShoppingBag className="w-3 h-3" />
          Retail Product
        </Badge>
      );
    case "both":
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 font-medium">
          <Sparkles className="w-3 h-3" />
          Dual Purpose (Both)
        </Badge>
      );
    default:
      return <Badge variant="secondary">{usageType}</Badge>;
  }
};
