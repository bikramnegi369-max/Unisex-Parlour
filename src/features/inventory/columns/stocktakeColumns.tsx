import React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Clock, FileText, Lock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/formatters";
import type {
  Stocktake,
  StocktakeStatus,
  StocktakeTargetDomain,
} from "../types/inventory.types";

interface BuildStocktakeColumnsOptions {
  canManageStocktake: boolean;
  onEnterCounts: (stocktakeId: string) => void;
  onReviewOrView: (stocktakeId: string) => void;
}

export function getStocktakeStatusBadge(status: StocktakeStatus) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="success" className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold">
          <CheckCircle2 className="w-3 h-3" /> Completed
        </Badge>
      );
    case "in_progress":
      return (
        <Badge className="bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1 text-[10px] uppercase font-semibold">
          <Clock className="w-3 h-3" /> In Progress
        </Badge>
      );
    case "posting":
      return (
        <Badge className="bg-amber-600 hover:bg-amber-700 text-white inline-flex items-center gap-1 text-[10px] uppercase font-semibold animate-pulse">
          <Lock className="w-3 h-3" /> Posting...
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="destructive" className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold">
          <XCircle className="w-3 h-3" /> Cancelled
        </Badge>
      );
    case "draft":
    default:
      return (
        <Badge variant="secondary" className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold">
          <FileText className="w-3 h-3" /> Draft
        </Badge>
      );
  }
}

export function getStocktakeDomainBadge(domain: StocktakeTargetDomain) {
  switch (domain) {
    case "salon_consumables":
      return (
        <Badge
          variant="outline"
          className="bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[11px]"
        >
          Consumables Only
        </Badge>
      );
    case "retail_products":
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[11px]"
        >
          Retail Products Only
        </Badge>
      );
    case "all":
    default:
      return (
        <Badge variant="outline" className="text-[11px]">
          All Domains
        </Badge>
      );
  }
}

export const buildStocktakeColumns = ({
  canManageStocktake,
  onEnterCounts,
  onReviewOrView,
}: BuildStocktakeColumnsOptions): ColumnDef<Stocktake>[] => [
  {
    accessorKey: "stocktakeNumber",
    header: "Stocktake #",
    cell: ({ row }) => (
      <span className="font-mono font-semibold text-xs text-foreground whitespace-nowrap">
        {row.original.stocktakeNumber}
      </span>
    ),
  },
  {
    accessorKey: "title",
    header: "Title & Remarks",
    cell: ({ row }) => {
      const st = row.original;
      return (
        <div className="min-w-44 max-w-xs">
          <div className="font-semibold text-xs text-foreground truncate">
            {st.title || "Physical Stocktake"}
          </div>
          {st.notes && (
            <div className="text-[11px] text-muted-foreground truncate">
              {st.notes}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "targetDomain",
    header: "Domain Scope",
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        {getStocktakeDomainBadge(row.original.targetDomain)}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        {getStocktakeStatusBadge(row.original.status)}
      </div>
    ),
  },
  {
    id: "progress",
    header: "Progress",
    cell: ({ row }) => {
      const total = row.original.totalItems || 0;
      const counted = row.original.countedItemsCount || 0;
      const pct = total > 0 ? Math.round((counted / total) * 100) : 0;

      return (
        <div className="flex items-center gap-2 min-w-32">
          <div className="w-20 bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-mono text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            {counted}/{total}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "discrepancyCount",
    header: "Discrepancies",
    cell: ({ row }) => {
      const st = row.original;
      const isCompleted = st.status === "completed";
      return (
        <div className="font-mono text-xs font-semibold whitespace-nowrap">
          {isCompleted ? (
            <span className="text-foreground">
              {st.discrepancyCount} reconciled
            </span>
          ) : st.discrepancyCount > 0 ? (
            <span className="text-amber-600 dark:text-amber-400">
              {st.discrepancyCount} pending
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Initiated",
    cell: ({ row }) => {
      const st = row.original;
      const actorName =
        typeof st.initiatedBy === "object" ? st.initiatedBy?.name : "User";
      return (
        <div className="text-[11px] whitespace-nowrap">
          <div className="font-mono text-muted-foreground">
            {formatDateTime(st.createdAt)}
          </div>
          <div className="text-muted-foreground/80">{actorName || "User"}</div>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const st = row.original;
      const stocktakeId = (st.id || (st as any)._id || "") as string;
      const isCompleted = st.status === "completed";
      const isCancelled = st.status === "cancelled";

      return (
        <div className="flex justify-end items-center gap-2 whitespace-nowrap">
          {!isCompleted && !isCancelled && canManageStocktake && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => onEnterCounts(stocktakeId)}
            >
              Enter Counts
            </Button>
          )}
          {!isCancelled && (
            <Button
              variant={isCompleted ? "outline" : "default"}
              size="sm"
              className={`text-xs h-7 ${
                !isCompleted
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : ""
              }`}
              onClick={() => onReviewOrView(stocktakeId)}
            >
              {isCompleted ? "View Audit" : "Review & Post"}
            </Button>
          )}
        </div>
      );
    },
  },
];
