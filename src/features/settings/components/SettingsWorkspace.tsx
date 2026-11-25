"use client";

import React, { useState } from "react";
import {
  Building2,
  Calendar,
  CalendarOff,
  Download,
  GitBranch,
  Layers,
  Settings,
} from "lucide-react";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission, type PermissionType } from "@/lib/permissions";
import { OrganizationSettingsPanel } from "./OrganizationSettingsPanel";
import { BranchSettingsPanel } from "./BranchSettingsPanel";
import { EffectiveSettingsPanel } from "./EffectiveSettingsPanel";
import { HolidayCalendarPanel } from "./HolidayCalendarPanel";
import { LeavePoliciesPanel } from "./LeavePoliciesPanel";
import { ExportsPanel } from "./ExportsPanel";

type SettingsTab =
  | "organization"
  | "branch"
  | "effective"
  | "holidays"
  | "leave-policies"
  | "exports";

const TABS: Array<{
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: PermissionType;
}> = [
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "branch", label: "Branch & Hours", icon: GitBranch },
  { id: "effective", label: "Effective Settings", icon: Layers },
  { id: "holidays", label: "Holiday Calendar", icon: Calendar },
  { id: "leave-policies", label: "Leave Policies", icon: CalendarOff },
  { id: "exports", label: "Exports & Backups", icon: Download, permission: "settings.backups" },
];

export function SettingsWorkspace() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("organization");

  const visibleTabs = TABS.filter(
    (tab) => !tab.permission || hasPermission(user, tab.permission)
  );

  return (
    <div className="space-y-6">
      <PageHeaderBanner
        title="Settings"
        description="Manage organization defaults, branch operating hours, holiday calendars, leave policies, and data exports."
        icon={Settings}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-3 space-y-4">
          <Card className="p-2">
            <nav aria-label="Settings sections" role="tablist" className="flex lg:flex-col gap-1 overflow-x-auto">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer text-left",
                      active
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </Card>
        </aside>

        <section className="lg:col-span-9 min-w-0">
          {activeTab === "organization" && <OrganizationSettingsPanel />}
          {activeTab === "branch" && <BranchSettingsPanel />}
          {activeTab === "effective" && <EffectiveSettingsPanel />}
          {activeTab === "holidays" && <HolidayCalendarPanel />}
          {activeTab === "leave-policies" && <LeavePoliciesPanel />}
          {activeTab === "exports" && <ExportsPanel />}
        </section>
      </div>
    </div>
  );
}
