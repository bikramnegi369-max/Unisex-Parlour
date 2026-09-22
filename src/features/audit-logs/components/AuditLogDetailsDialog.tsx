"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/formatters";
import type { AuditLog } from "../types/auditLog.types";
import { Clock, User, Shield, Layers, Database, Copy, Check, Info } from "lucide-react";
import { toast } from "sonner";

interface AuditLogDetailsDialogProps {
  auditLog: AuditLog | null;
  isOpen: boolean;
  onClose: () => void;
  branchName?: string;
}

export function AuditLogDetailsDialog({
  auditLog,
  isOpen,
  onClose,
  branchName,
}: AuditLogDetailsDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!auditLog) return null;

  const handleCopyMetadata = () => {
    if (!auditLog.metadata) return;
    navigator.clipboard.writeText(JSON.stringify(auditLog.metadata, null, 2));
    setCopied(true);
    toast.success("Metadata copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const hasMetadata =
    auditLog.metadata &&
    typeof auditLog.metadata === "object" &&
    Object.keys(auditLog.metadata).length > 0;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Audit Log Details">
      <div className="space-y-6 pt-1 text-sm">
        {/* Header Key Attributes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border/70">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" /> Timestamp
            </span>
            <p className="font-medium text-foreground">
              {formatDateTime(auditLog.createdAt)}
            </p>
            <p className="text-[11px] font-mono text-muted-foreground">
              {auditLog.createdAt}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" /> Performed By
            </span>
            <p className="font-semibold text-foreground">
              {auditLog.actor?.name || "System"}
            </p>
            {auditLog.actor?.email && (
              <p className="text-xs text-muted-foreground">{auditLog.actor.email}</p>
            )}
            {auditLog.actor?.id && (
              <p className="text-[10px] font-mono text-muted-foreground/80">
                ID: {auditLog.actor.id}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-primary" /> Action
            </span>
            <div>
              <Badge variant="outline" className="font-mono text-xs">
                {auditLog.action}
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" /> Target Entity
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="font-semibold">
                {auditLog.entityType}
              </Badge>
              {auditLog.entityId && (
                <span className="text-xs font-mono text-muted-foreground">
                  ({auditLog.entityId})
                </span>
              )}
            </div>
          </div>

          {branchName && (
            <div className="space-y-1 sm:col-span-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-primary" /> Branch Scope
              </span>
              <p className="font-medium text-foreground">{branchName}</p>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-muted-foreground" /> Description
          </label>
          <div className="p-3 bg-card border border-border/70 rounded-lg text-foreground leading-relaxed text-sm">
            {auditLog.description || "No description provided."}
          </div>
        </div>

        {/* Metadata Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Event Metadata
            </label>
            {hasMetadata && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyMetadata}
                className="h-7 px-2 text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy JSON
                  </>
                )}
              </Button>
            )}
          </div>

          {hasMetadata ? (
            <div className="relative">
              <pre className="p-3.5 bg-slate-950 text-slate-100 dark:bg-slate-900/90 rounded-xl text-xs font-mono overflow-x-auto max-h-60 border border-border">
                {JSON.stringify(auditLog.metadata, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic bg-muted/20 p-3 rounded-lg border border-border/50">
              No additional metadata recorded for this action.
            </p>
          )}
        </div>

        {/* Footer Close */}
        <div className="flex justify-end pt-2 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={onClose} className="cursor-pointer">
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
