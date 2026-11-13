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
        <Badge
          variant="outline"
          className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 flex items-center gap-1.5 font-medium px-2 py-0.5 rounded-md"
        >
          <Scissors className="w-3.5 h-3.5" />
          Salon Consumable
        </Badge>
      );
    case "retail_sale":
      return (
        <Badge
          variant="outline"
          className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 flex items-center gap-1.5 font-medium px-2 py-0.5 rounded-md"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Retail Product
        </Badge>
      );
    case "both":
      return (
        <Badge
          variant="outline"
          className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 flex items-center gap-1.5 font-medium px-2 py-0.5 rounded-md"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Dual Purpose (Both)
        </Badge>
      );
    default:
      return <Badge variant="secondary">{usageType}</Badge>;
  }
};
