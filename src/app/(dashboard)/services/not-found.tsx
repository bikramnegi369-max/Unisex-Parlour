import React from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Scissors } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex-1 py-12">
      <EmptyState
        icon={Scissors}
        title="Catalogue record not found"
        description="The requested service treatment or category does not exist in this catalog configuration."
      />
    </div>
  );
}
