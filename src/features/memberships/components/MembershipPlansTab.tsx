"use client";

import React, { useState } from "react";
import { useMembershipPlans } from "../hooks/useMemberships";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, Sparkles, Percent, Calendar } from "lucide-react";

export function MembershipPlansTab() {
  const { data, isLoading } = useMembershipPlans();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Configured Membership Plans</h2>
          <p className="text-sm text-muted-foreground">Manage membership tiers, discounts, perks and beneficiary limits.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading plans...</div>
      ) : !data?.data || data.data.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent className="space-y-2">
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No membership plans configured yet</p>
            <p className="text-sm text-muted-foreground">Configure standard, gold or platinum tiers with perks.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.data.map((plan) => (
            <Card key={plan.id} className="relative overflow-hidden border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant="outline" className="mb-1 text-primary border-primary/30">
                      {plan.tier} Tier
                    </Badge>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {plan.code && <CardDescription className="font-mono text-xs">Code: {plan.code}</CardDescription>}
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold">₹{plan.price}</span>
                    <span className="text-xs text-muted-foreground block">/ {plan.validityMonths} mos</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4 text-primary" />
                  <span>Allows up to <strong>{plan.maxBeneficiaries || 1}</strong> beneficiaries</span>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-lg border text-xs">
                  <div>
                    <span className="text-muted-foreground block">Service Discount</span>
                    <strong className="text-emerald-600 font-semibold">{plan.benefits?.serviceDiscountPercentage || 0}% OFF</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Product Discount</span>
                    <strong className="text-emerald-600 font-semibold">{plan.benefits?.productDiscountPercentage || 0}% OFF</strong>
                  </div>
                </div>
                {plan.benefits?.complimentaryPerks && plan.benefits.complimentaryPerks.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Included Perks:</span>
                    <ul className="text-xs space-y-0.5 list-disc list-inside text-muted-foreground">
                      {plan.benefits.complimentaryPerks.map((perk, i) => (
                        <li key={i}>{perk}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
