"use client";

import React from "react";
import type { UserResponseDTO } from "../types/users.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Trash2, UserCheck } from "lucide-react";
import { capitalizeWords } from "@/lib/formatters";

interface UserMobileCardProps {
  user: UserResponseDTO;
  canEdit: boolean;
  canDelete: boolean;
  onView: (user: UserResponseDTO) => void;
  onEdit: (user: UserResponseDTO) => void;
  onDeactivate: (user: UserResponseDTO) => void;
  onReactivate: (user: UserResponseDTO) => void;
}

export function UserMobileCard({
  user,
  canEdit,
  canDelete,
  onView,
  onEdit,
  onDeactivate,
  onReactivate,
}: UserMobileCardProps) {
  const formattedName = capitalizeWords(user.name);
  const isActive = user.status === "active";

  const roleName =
    typeof user.role === "object" && user.role !== null
      ? user.role.name
      : user.role;

  let statusVariant: "success" | "destructive" | "muted" | "warning" =
    "success";
  if (user.status === "inactive") statusVariant = "muted";
  if (user.status === "suspended") statusVariant = "destructive";
  if (user.status === "locked") statusVariant = "warning";

  return (
    <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
            {formattedName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-semibold text-foreground text-sm">
                {formattedName}
              </h4>
              <Badge variant={statusVariant}>
                <span className="capitalize">{user.status}</span>
              </Badge>
            </div>
            <span className="text-[10px] bg-primary/5 text-primary border border-primary/10 px-1.5 py-0.5 rounded font-semibold mt-1 inline-block">
              {roleName || "User"}
            </span>
            {user.hasOrgWideAccess && (
              <span className="inline-flex mt-0.5 ml-1 items-center px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[9px] font-semibold border border-amber-500/20">
                Org-Wide
              </span>
            )}
          </div>
        </div>

        {/* Mobile Actions with touch targets */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            className="h-10 w-10 flex items-center justify-center cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onView(user);
            }}
            aria-label={`View details of ${formattedName}`}
          >
            <Eye size={15} />
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              className="h-10 w-10 flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(user);
              }}
              aria-label={`Edit profile of ${formattedName}`}
            >
              <Edit size={15} />
            </Button>
          )}
          {canDelete && isActive && (
            <Button
              variant="destructive"
              className="h-10 w-10 bg-destructive/10 text-destructive border-transparent flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onDeactivate(user);
              }}
              aria-label={`Deactivate profile of ${formattedName}`}
            >
              <Trash2 size={15} />
            </Button>
          )}
          {canEdit && !isActive && (
            <Button
              variant="outline"
              className="h-10 w-10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-500 dark:hover:bg-emerald-500/20 flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onReactivate(user);
              }}
              aria-label={`Reactivate profile of ${formattedName}`}
            >
              <UserCheck size={15} />
            </Button>
          )}
        </div>
      </div>

      <div className="text-xs space-y-1.5 pt-2.5 border-t border-border/50 text-muted-foreground">
        <div className="flex justify-between">
          <span>Email:</span>
          <a
            href={`mailto:${user.email}`}
            className="font-medium text-foreground hover:underline"
          >
            {user.email}
          </a>
        </div>
        <div className="flex justify-between">
          <span>Phone:</span>
          {user.phone ? (
            <a
              href={`tel:${user.phone}`}
              className="font-semibold text-foreground hover:underline"
            >
              {user.phone}
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        {!user.hasOrgWideAccess && (
          <div className="flex justify-between items-center">
            <span>Branches:</span>
            <span className="flex flex-wrap gap-1 justify-end max-w-[60%]">
              {user.branchAccess.filter((b) => b.isActive).length > 0 ? (
                user.branchAccess
                  .filter((b) => b.isActive)
                  .slice(0, 2)
                  .map((b) => (
                    <Badge
                      key={b.branchId}
                      variant="outline"
                      className="text-[9px] px-1.5 py-0"
                    >
                      {b.branchName}
                    </Badge>
                  ))
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
              {user.branchAccess.filter((b) => b.isActive).length > 2 && (
                <span className="text-[10px] font-semibold text-muted-foreground">
                  +{user.branchAccess.filter((b) => b.isActive).length - 2} more
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
