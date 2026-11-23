"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { marketingApi, Campaign } from "../api/marketing.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, PlusCircle, AlertCircle } from "lucide-react";

export function CampaignAttributionView() {
  const { currentBranchId } = useBranchContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canView = hasPermission(user, "finance.view");
  const canManage =
    hasPermission(user, "finance.create") ||
    hasPermission(user, "finance.edit");

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states for Campaign Creation
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [channel, setChannel] = useState<string>("instagram");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [windowDays, setWindowDays] = useState("30");

  // Fetch campaigns
  const { data: campaignResponse, isLoading: loadingCampaigns } = useQuery({
    queryKey: [
      "marketing-campaigns",
      currentBranchId,
      filterChannel,
      filterStatus,
    ],
    queryFn: () =>
      marketingApi.getCampaigns({
        branchId: currentBranchId || undefined,
        channel: filterChannel !== "all" ? filterChannel : undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
      }),
    enabled: canView,
  });

  // Fetch performance metrics for selected campaign
  const { data: performanceResponse, isLoading: loadingAttribution } = useQuery(
    {
      queryKey: ["campaign-performance", selectedCampaignId, currentBranchId],
      queryFn: () =>
        selectedCampaignId
          ? marketingApi.getCampaignPerformance(selectedCampaignId, {
              branchId: currentBranchId || undefined,
            })
          : null,
      enabled: !!selectedCampaignId && canView,
    },
  );

  // Create campaign mutation
  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof marketingApi.createCampaign>[0]) =>
      marketingApi.createCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: unknown) => {
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to create campaign",
      );
    },
  });

  const resetForm = () => {
    setName("");
    setCode("");
    setChannel("instagram");
    setStartDate("");
    setEndDate("");
    setBudget("");
    setWindowDays("30");
    setErrorMessage(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !startDate) {
      setErrorMessage("Please complete all required fields.");
      return;
    }

    const budgetRupees = parseFloat(budget);
    const budgetValue =
      isNaN(budgetRupees) || budgetRupees <= 0 ? 0 : budgetRupees;
    const attributionWindowDays = parseInt(windowDays, 10) || 30;

    createMutation.mutate({
      name: name.trim(),
      campaignCode: code.trim().toUpperCase(),
      channel,
      startDate,
      endDate: endDate || undefined,
      budget: budgetValue,
      attributionWindowDays,
      branchId: currentBranchId || undefined,
    });
  };

  if (!canView) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6 text-center text-amber-800">
          <AlertCircle className="mx-auto h-8 w-8 text-amber-600 mb-2" />
          <p className="font-semibold">Access Restricted</p>
          <p className="text-sm">
            You do not have permission to view marketing campaigns and financial
            attribution.
          </p>
        </CardContent>
      </Card>
    );
  }

  const campaigns: Campaign[] = campaignResponse?.data || [];
  const performance = performanceResponse?.data;
  const metrics = performance?.financialMetrics;

  return (
    <div className="space-y-6">
      {/* Title & Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Marketing Financial Attribution
          </h1>
          <p className="text-sm text-gray-500">
            Track campaign expenditure, attributed gross & net sales, and
            verified return on marketing spend.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            disabled={!canManage}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Campaign Grid & Attribution Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Campaign Registry */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  Campaigns
                </CardTitle>
                <div className="flex gap-1">
                  <select
                    value={filterChannel}
                    onChange={(e) => setFilterChannel(e.target.value)}
                    className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium"
                  >
                    <option value="all">All Channels</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="google_ads">Google Ads</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="influencer">Influencer</option>
                    <option value="flyer">Flyer</option>
                    <option value="walk_in_board">Walk-In Board</option>
                  </select>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-150 overflow-y-auto">
              {loadingCampaigns ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : campaigns.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  No campaigns found.
                </div>
              ) : (
                campaigns.map((c: Campaign) => {
                  const campaignId = c._id || c.id;
                  const isSelected = selectedCampaignId === campaignId;
                  return (
                    <div
                      key={campaignId}
                      onClick={() => setSelectedCampaignId(campaignId)}
                      className={`cursor-pointer rounded-lg border p-3 transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/40 shadow-xs"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-xs text-gray-900">
                            {c.name}
                          </div>
                          <div className="text-[11px] font-mono text-gray-500">
                            {c.campaignCode}
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            c.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-gray-100 text-gray-600"
                          }
                        >
                          {c.status}
                        </Badge>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                        <span className="capitalize">
                          {c.channel.replace("_", " ")}
                        </span>
                        <span>₹{Number(c.budget || 0).toFixed(2)} budget</span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Financial Attribution Intelligence */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedCampaignId ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
              <Target className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="font-semibold text-sm text-gray-900">
                Select a Campaign
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                Choose a marketing campaign from the left list to review its
                authoritative revenue attribution, authoritative refunds, and
                settled expense ROI.
              </p>
            </Card>
          ) : loadingAttribution ? (
            <Card className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-4 gap-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            </Card>
          ) : !performance ? (
            <Card className="p-6 text-center text-sm text-gray-500">
              No attribution metrics available for this campaign.
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Campaign Header Banner */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg font-bold text-gray-900">
                          {performance.campaign.name}
                        </CardTitle>
                        <Badge variant="outline" className="font-mono text-xs">
                          {performance.campaign.campaignCode}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs mt-0.5">
                        Channel:{" "}
                        {performance.campaign.channel.replace("_", " ")} •
                        Status: {performance.campaign.status}
                      </CardDescription>
                    </div>

                    <div className="text-xs text-gray-500">
                      Budget: ₹
                      {Number(performance.campaign.budget || 0).toFixed(2)}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* KPI Metrics Matrix */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-gray-50 p-3 border border-gray-100">
                      <div className="text-[11px] font-medium text-gray-500">
                        Attributed Gross Revenue
                      </div>
                      <div className="text-lg font-bold font-mono text-gray-900 mt-1">
                        ₹
                        {(
                          (metrics?.attributedGrossRevenuePaise || 0) / 100
                        ).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {metrics?.invoiceCount || 0} invoices
                      </div>
                    </div>

                    <div className="rounded-lg bg-rose-50/50 p-3 border border-rose-100">
                      <div className="text-[11px] font-medium text-rose-700">
                        Authoritative Refunds
                      </div>
                      <div className="text-lg font-bold font-mono text-rose-600 mt-1">
                        -₹
                        {((metrics?.attributedRefundsPaise || 0) / 100).toFixed(
                          2,
                        )}
                      </div>
                      <div className="text-[10px] text-rose-400 mt-0.5">
                        {metrics?.refundCount || 0} completed refunds
                      </div>
                    </div>

                    <div className="rounded-lg bg-emerald-50/50 p-3 border border-emerald-100">
                      <div className="text-[11px] font-medium text-emerald-700">
                        Attributed Net Revenue
                      </div>
                      <div className="text-lg font-bold font-mono text-emerald-600 mt-1">
                        ₹
                        {(
                          (metrics?.attributedNetRevenuePaise || 0) / 100
                        ).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-emerald-500 mt-0.5">
                        Gross - Refunds
                      </div>
                    </div>

                    <div className="rounded-lg bg-indigo-50/50 p-3 border border-indigo-100">
                      <div className="text-[11px] font-medium text-indigo-700">
                        Settled Expense ROI
                      </div>
                      <div className="text-lg font-bold font-mono text-indigo-600 mt-1">
                        {metrics?.attributedRevenueToSpendRatio !== undefined &&
                        metrics?.attributedRevenueToSpendRatio !== null
                          ? `${metrics.attributedRevenueToSpendRatio}x`
                          : "—"}
                      </div>
                      <div className="text-[10px] text-indigo-500 mt-0.5">
                        Settled: ₹
                        {Number(metrics?.settledExpenses || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Financial Disclosure & Methodological Notes */}
                  <div className="mt-4 rounded-lg bg-amber-50/60 p-3 text-xs text-amber-900 border border-amber-200/60">
                    <div className="font-semibold flex items-center gap-1.5 mb-1">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                      Attribution Rules & Accounting Disclosure
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-800">
                      <li>
                        <strong>Settled vs. Approved Expenses:</strong> ROI
                        reflects settled cash disbursements (₹
                        {Number(metrics?.settledExpenses || 0).toFixed(2)}).
                        Approved unpaid obligations (₹
                        {Number(metrics?.unpaidExpenses || 0).toFixed(2)}) are
                        excluded from cash ROI until paid.
                      </li>
                      <li>
                        <strong>Authoritative Refunds:</strong> Deductions
                        derive strictly from completed non-deleted Payment
                        records where <code>type === &quot;refund&quot;</code>{" "}
                        linked to attributed invoices.
                      </li>
                      <li>
                        <strong>Non-Incremental Contribution:</strong> Figures
                        reflect attributed gross revenue and do not isolate
                        organic baseline demand or promotional discounts.
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Campaign Creation Dialog */}
      {isCreateOpen && (
        <Dialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create Marketing Campaign"
          maxWidth="lg"
        >
          <div className="p-6">
            <p className="text-xs text-gray-500 mb-4">
              Register a campaign to track marketing expenses and attribute
              customer invoices across retail and salon services.
            </p>

            {errorMessage && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="text-xs font-semibold text-gray-700"
                >
                  Campaign Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="name"
                  placeholder="e.g. Summer Hair Spa Blitz"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="code"
                    className="text-xs font-semibold text-gray-700"
                  >
                    Campaign Code <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="code"
                    placeholder="e.g. SUMMER26"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="mt-1 text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="channel"
                    className="text-xs font-semibold text-gray-700"
                  >
                    Marketing Channel <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="channel"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none"
                    required
                  >
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="google_ads">Google Ads</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="influencer">Influencer</option>
                    <option value="flyer">Flyer</option>
                    <option value="walk_in_board">Walk-In Board</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="start"
                    className="text-xs font-semibold text-gray-700"
                  >
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 text-xs"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="end"
                    className="text-xs font-semibold text-gray-700"
                  >
                    End Date (Optional)
                  </label>
                  <Input
                    id="end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="budget"
                    className="text-xs font-semibold text-gray-700"
                  >
                    Budget (₹)
                  </label>
                  <Input
                    id="budget"
                    type="number"
                    step="1"
                    min="0"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <label
                    htmlFor="window"
                    className="text-xs font-semibold text-gray-700"
                  >
                    Attribution Window (Days)
                  </label>
                  <Input
                    id="window"
                    type="number"
                    step="1"
                    min="1"
                    max="90"
                    value={windowDays}
                    onChange={(e) => setWindowDays(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {createMutation.isPending ? "Saving..." : "Create Campaign"}
                </Button>
              </div>
            </form>
          </div>
        </Dialog>
      )}
    </div>
  );
}
