"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Save, Loader2, Info, Check, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import PermissionGate from "@/components/layout/PermissionGate";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { Role, PermissionItem, PaginationMeta } from "../types/roles.types";

interface RoleMatrixTableProps {
  selectedRole: Role | null;
  allPermissions: PermissionItem[];
  dynamicModules?: string[];
  meta?: PaginationMeta;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (limit: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedModule: string;
  onModuleChange: (module: string) => void;
  onSavePermissions: (updatedPermissions: string[]) => void;
  isSaving: boolean;
  isLoadingPermissions?: boolean;
  isErrorPermissions?: boolean;
  onRetryPermissions?: () => void;
  isLoadingModules?: boolean;
}

export default function RoleMatrixTable({
  selectedRole,
  allPermissions,
  dynamicModules = [],
  meta,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  searchQuery,
  onSearchChange,
  selectedModule,
  onModuleChange,
  onSavePermissions,
  isSaving,
  isLoadingPermissions = false,
  isErrorPermissions = false,
  onRetryPermissions,
  isLoadingModules = false,
}: RoleMatrixTableProps) {
  const { user } = useAuth();
  const canUpdateRole = hasPermission(user, "roles.update");

  const [activePermissions, setActivePermissions] = useState<string[]>([]);

  useEffect(() => {
    if (selectedRole) {
      setActivePermissions(selectedRole.permissions || []);
    } else {
      setActivePermissions([]);
    }
  }, [selectedRole]);

  if (!selectedRole) {
    return (
      <Card className="border border-border/80 shadow-sm p-8 sm:p-12 text-center bg-card">
        <EmptyState
          icon={ShieldCheck}
          title="No Role Selected"
          description="Select a role profile from the left navigation panel to inspect and configure its capability matrix."
        />
      </Card>
    );
  }

  // Module filter options are backend-authoritative from GET /rbac/modules API
  const availableModules = dynamicModules.length > 0
    ? dynamicModules
    : Array.from(new Set(allPermissions.map((p) => p.module || "General"))).sort();

  // Group permissions dynamically by module
  const groupedPermissions: Record<string, PermissionItem[]> = {};
  allPermissions.forEach((perm) => {
    const mod = perm.module || "General";
    if (!groupedPermissions[mod]) {
      groupedPermissions[mod] = [];
    }
    groupedPermissions[mod].push(perm);
  });

  const modules = Object.keys(groupedPermissions);

  const handleToggle = (key: string) => {
    if (!canUpdateRole) return;
    setActivePermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSave = () => {
    onSavePermissions(activePermissions);
  };

  const effectiveMeta: PaginationMeta = meta || {
    total: allPermissions.length,
    page: currentPage,
    limit: pageSize,
    totalPages: Math.ceil(allPermissions.length / pageSize) || 1,
  };

  return (
    <Card className="border border-border/80 shadow-sm overflow-hidden w-full max-w-full">
      <CardHeader className="p-4 sm:p-6 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary shrink-0" />
            <span className="truncate">{selectedRole.name} Authorization Matrix</span>
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            {selectedRole.description || `Configure capability flags for ${selectedRole.name}`}
          </CardDescription>
        </div>

        <PermissionGate permission="roles.update">
          <Button
            disabled={isSaving || !canUpdateRole}
            onClick={handleSave}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/10 rounded-xl cursor-pointer font-semibold text-sm shrink-0 w-full sm:w-auto"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Permissions
              </>
            )}
          </Button>
        </PermissionGate>
      </CardHeader>

      {/* Filter and Search Controls Bar */}
      <div className="p-3.5 sm:p-4 border-b border-border/60 bg-muted/10 flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <Filter size={14} className="text-muted-foreground shrink-0" />
          <div className="w-full sm:w-48">
            <Select
              value={selectedModule}
              onChange={(e) => onModuleChange(e.target.value)}
              disabled={isLoadingModules}
              className="h-9 text-xs"
            >
              <option value="all">
                {isLoadingModules ? "Loading modules..." : `All Modules (${availableModules.length})`}
              </option>
              {availableModules.map((mod) => (
                <option key={mod} value={mod}>
                  {mod}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <CardContent className="p-0 w-full max-w-full overflow-x-hidden">
        {isLoadingPermissions ? (
          <div className="p-5 sm:p-6 space-y-6 animate-pulse">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-32 bg-muted rounded-md" />
                <div className="h-4 w-16 bg-muted/60 rounded-md" />
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-20 bg-muted/40 rounded-xl border border-border/40" />
                ))}
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-border/40">
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 bg-muted rounded-md" />
                <div className="h-4 w-16 bg-muted/60 rounded-md" />
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 bg-muted/40 rounded-xl border border-border/40" />
                ))}
              </div>
            </div>
          </div>
        ) : isErrorPermissions ? (
          <div className="p-8">
            <ErrorState
              title="Failed to Load Permissions"
              description="An error occurred while fetching canonical permissions data."
              retryAction={
                onRetryPermissions
                  ? { label: "Retry", onClick: onRetryPermissions }
                  : undefined
              }
            />
          </div>
        ) : allPermissions.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Info size={32} className="text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">No Permissions Found</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              No permission records match your search or filter parameters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {modules.map((moduleName) => {
              const moduleItems = groupedPermissions[moduleName];
              return (
                <div key={moduleName} className="p-4 sm:p-6 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />
                      <span className="truncate">{moduleName} Panel</span>
                    </h3>
                    <span className="text-[11px] font-medium text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md border border-border/50 shrink-0">
                      {moduleItems.filter((i) => activePermissions.includes(i.key)).length} / {moduleItems.length} active
                    </span>
                  </div>

                  {/* Auto-fit Responsive Cards Grid */}
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3 w-full max-w-full">
                    {moduleItems.map((item) => {
                      const isChecked = activePermissions.includes(item.key);
                      return (
                        <div
                          key={item.key}
                          onClick={() => handleToggle(item.key)}
                          className={`group flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border text-left transition-all duration-150 w-full min-w-0 max-w-full overflow-hidden ${
                            isChecked
                              ? "bg-primary/[0.04] border-primary/30 text-foreground shadow-2xs"
                              : "bg-card border-border/80 hover:border-border hover:bg-muted/30 text-muted-foreground"
                          } ${canUpdateRole ? "cursor-pointer" : "cursor-not-allowed opacity-80"}`}
                        >
                          <div className="mt-0.5 shrink-0 flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              disabled={!canUpdateRole || isSaving}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                            />
                          </div>

                          <div className="min-w-0 flex-1 space-y-1 overflow-hidden">
                            <div className="flex items-center justify-between gap-1.5 min-w-0">
                              <p className="text-xs font-semibold leading-tight text-foreground truncate">
                                {item.name}
                              </p>
                              {isChecked && (
                                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                              )}
                            </div>

                            <div>
                              <span className="text-[10px] font-mono text-muted-foreground/90 bg-muted/50 px-1.5 py-0.5 rounded border border-border/40 inline-block max-w-full truncate">
                                {item.key}
                              </span>
                            </div>

                            {item.description && (
                              <p className="text-[11px] text-muted-foreground/80 leading-normal pt-0.5 line-clamp-2 break-words">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Pagination Bar */}
        <div className="p-4 border-t border-border/80 bg-card overflow-x-auto">
          <Pagination
            currentPage={effectiveMeta.page}
            totalPages={effectiveMeta.totalPages}
            totalItems={effectiveMeta.total}
            pageSize={effectiveMeta.limit}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            pageSizeOptions={[10, 25, 50, 100]}
            itemLabel="permissions"
          />
        </div>
      </CardContent>
    </Card>
  );
}
