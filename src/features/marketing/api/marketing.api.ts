import { apiClient } from "@/lib/api/axios";
import { ApiResponse, PaginatedResponse } from "@/types/api.types";

export interface Campaign {
  id: string;
  _id?: string;
  name: string;
  campaignCode: string;
  channel: string;
  status: "draft" | "active" | "paused" | "completed" | "archived";
  startDate: string;
  endDate?: string | null;
  budget: number;
  budgetPaise?: number;
  targetAudience?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  attributionWindowDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignPerformanceMetrics {
  attributedGrossRevenue: number;
  attributedGrossRevenuePaise: number;
  attributedRefunds: number;
  attributedRefundsPaise: number;
  refundCount: number;
  attributedNetRevenue: number;
  attributedNetRevenuePaise: number;
  invoiceCount: number;
  expenseObligations: number;
  settledExpenses: number;
  unpaidExpenses: number;
  expenseCount: number;
  netAttributedContribution: number;
  netAttributedContributionPaise: number;
  attributedRevenueToSpendRatio: number;
}

export interface CampaignPerformanceResponse {
  campaign: {
    id: string;
    name: string;
    campaignCode: string;
    channel: string;
    status: string;
    budget: number;
  };
  financialMetrics: CampaignPerformanceMetrics;
  disclosureNotice: string;
}

export const marketingApi = {
  async getCampaigns(params?: {
    channel?: string;
    status?: string;
    branchId?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Campaign>> {
    const { data } = await apiClient.get<PaginatedResponse<Campaign>>(
      "/marketing/campaigns",
      {
        params,
        branchScope: params?.branchId
          ? { type: "branch", branchId: params.branchId }
          : "current",
      }
    );
    return data;
  },

  async getCampaignById(id: string, branchId?: string): Promise<ApiResponse<Campaign>> {
    const { data } = await apiClient.get<ApiResponse<Campaign>>(
      `/marketing/campaigns/${id}`,
      {
        branchScope: branchId ? { type: "branch", branchId } : "current",
      }
    );
    return data;
  },

  async createCampaign(
    payload: {
      name: string;
      campaignCode: string;
      channel: string;
      startDate: string;
      endDate?: string;
      budget?: number;
      targetAudience?: string;
      attributionWindowDays?: number;
      branchId?: string;
    }
  ): Promise<ApiResponse<Campaign>> {
    const { data } = await apiClient.post<ApiResponse<Campaign>>(
      "/marketing/campaigns",
      payload,
      {
        branchScope: payload.branchId
          ? { type: "branch", branchId: payload.branchId }
          : "current",
      }
    );
    return data;
  },

  async getCampaignPerformance(
    id: string,
    params?: { startDate?: string; endDate?: string; branchId?: string }
  ): Promise<ApiResponse<CampaignPerformanceResponse>> {
    const { data } = await apiClient.get<ApiResponse<CampaignPerformanceResponse>>(
      `/marketing/campaigns/${id}/performance`,
      {
        params: {
          startDate: params?.startDate,
          endDate: params?.endDate,
        },
        branchScope: params?.branchId
          ? { type: "branch", branchId: params.branchId }
          : "current",
      }
    );
    return data;
  },
};
