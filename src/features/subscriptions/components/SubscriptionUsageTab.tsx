"use client";

import React, { useState } from "react";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useSubscriptionUsage } from "../hooks/useSubscriptionUsage";
import { getSubscriptionUsageColumns } from "../columns/usage.columns";
import { useBranchContext } from "@/hooks/useBranchContext";
import { History } from "lucide-react";

interface SubscriptionUsageTabProps {
  subscriptionId: string;
}

export function SubscriptionUsageTab({ subscriptionId }: SubscriptionUsageTabProps) {
  const [page, setPage] = useState(1);
  const limit = 10;
  const { getBranchName } = useBranchContext();

  const { data, isLoading, isError, refetch } = useSubscriptionUsage(subscriptionId, {
    page,
    limit,
  });

  const columns = React.useMemo(
    () => getSubscriptionUsageColumns({ getBranchName }),
    [getBranchName]
  );

  const usageRecords = data?.data || [];
  const meta = data?.meta;

  if (isError) {
    return (
      <ErrorState
        title="Failed to Load Usage History"
        description="Could not load the redemption ledger for this subscription."
        retryAction={{
          label: "Retry",
          onClick: () => refetch(),
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={usageRecords}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={History}
            title="No Redemption History"
            description="No service entitlements have been redeemed against this subscription yet."
          />
        }
      />

      {meta && meta.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={meta.totalPages}
          totalItems={meta.total}
          onPageChange={setPage}
          pageSize={limit}
          itemLabel="redemptions"
        />
      )}
    </div>
  );
}
