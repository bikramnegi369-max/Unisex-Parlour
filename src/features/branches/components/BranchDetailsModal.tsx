"use client";

import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, Phone, MapPin, Calendar } from "lucide-react";
import { BranchStatusBadge } from "./BranchStatusBadge";
import type { Branch } from "@/types/branch";

interface BranchDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: Branch | null;
}

export function BranchDetailsModal({
  isOpen,
  onClose,
  branch,
}: BranchDetailsModalProps) {
  if (!branch) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Branch Details">
      <div className="space-y-5 pt-2">
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">{branch.name}</h3>
              <p className="text-xs text-muted-foreground">ID: {branch.id}</p>
            </div>
          </div>
          <BranchStatusBadge isActive={branch.isActive} />
        </div>

        <div className="grid grid-cols-1 gap-3.5 text-xs">
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-background">
            <MapPin size={16} className="text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-muted-foreground block mb-0.5">Address</span>
              <span className="text-foreground">{branch.address || "Not specified"}</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-background">
            <Phone size={16} className="text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-muted-foreground block mb-0.5">Phone</span>
              <span className="text-foreground">{branch.phone || "Not specified"}</span>
            </div>
          </div>

          {branch.createdAt && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-background">
              <Calendar size={16} className="text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-muted-foreground block mb-0.5">Created At</span>
                <span className="text-foreground">
                  {new Date(branch.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
