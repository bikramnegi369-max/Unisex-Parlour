"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerMembershipsTab } from "@/features/memberships/components/CustomerMembershipsTab";
import { MembershipPlansTab } from "@/features/memberships/components/MembershipPlansTab";
import { CreditCard, Users, Layers } from "lucide-react";

export default function MembershipsPage() {
  const [activeTab, setActiveTab] = useState("memberships");

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Memberships</h1>
          <p className="text-muted-foreground mt-1">
            Manage membership privilege tiers, multi-beneficiary assignments, and customer privileges.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="memberships" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Customer Memberships</span>
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <span>Membership Plans</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="memberships" className="space-y-4">
          <CustomerMembershipsTab />
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <MembershipPlansTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
