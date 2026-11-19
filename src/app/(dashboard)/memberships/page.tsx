"use client";

import React, { useState } from "react";
import { CustomerMembershipsTab } from "@/features/memberships/components/CustomerMembershipsTab";
import { MembershipPlansTab } from "@/features/memberships/components/MembershipPlansTab";
import { CreditCard, Users, Layers } from "lucide-react";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";

export default function MembershipsPage() {
  const [activeTab, setActiveTab] = useState<"memberships" | "plans">("memberships");

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      <PageHeaderBanner
        title="Memberships"
        description="Manage membership privilege tiers, multi-beneficiary assignments, and customer privileges."
        icon={CreditCard}
      />

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("memberships")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            activeTab === "memberships"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Customer Memberships
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("plans")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            activeTab === "plans"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4" />
          Membership Plans
        </button>
      </div>

      <div>
        {activeTab === "memberships" ? (
          <CustomerMembershipsTab />
        ) : (
          <MembershipPlansTab />
        )}
      </div>
    </div>
  );
}
