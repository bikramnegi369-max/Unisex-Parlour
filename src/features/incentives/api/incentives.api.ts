import { apiClient } from "@/lib/api/axios";
import {
  IncentiveScheme,
  SchemeAssignment,
  CalculationPreviewRequest,
  CalculationPreviewResponse,
  IncentiveLedgerEntry,
  IncentiveRecoveryObligation,
  IncentiveRecoveryPaymentAttempt,
  IncentivesSummaryMetrics,
  CreateIncentiveSchemeRequest,
  SchemeAssignmentRequest,
  AttendanceIncentiveEvaluation,
} from "../types/incentives.types";

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SingleResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

type ApiDocument<T extends { id?: string }> = Omit<T, "id"> & {
  id?: string;
  _id?: string;
};

const normalizeDocumentId = <T extends { id?: string; _id?: string }>(
  document: T,
): T & { id: string } => {
  const id = document._id || document.id;
  if (!id) {
    throw new Error("Incentive API response is missing its document ID.");
  }
  return { ...document, id };
};

export const incentivesApi = {
  // 1. Financial Overview Summary
  async getSummary(branchId?: string): Promise<IncentivesSummaryMetrics> {
    const response = await apiClient.get<SingleResponse<IncentivesSummaryMetrics>>(
      "/incentives/summary",
      { params: branchId ? { branchId } : undefined },
    );
    return response.data.data;
  },

  // 2. Schemes
  async listSchemes(params?: {
    page?: number;
    limit?: number;
    status?: string;
    schemeType?: string;
    search?: string;
  }): Promise<PaginatedResponse<IncentiveScheme>> {
    const response = await apiClient.get<PaginatedResponse<ApiDocument<IncentiveScheme>>>(
      "/incentives/schemes",
      { params }
    );
    return {
      ...response.data,
      data: (response.data.data || []).map(normalizeDocumentId),
    };
  },

  async getSchemeById(id: string): Promise<IncentiveScheme> {
    const response = await apiClient.get<SingleResponse<ApiDocument<IncentiveScheme>>>(
      `/incentives/schemes/${id}`
    );
    return normalizeDocumentId(response.data.data);
  },

  async createScheme(payload: CreateIncentiveSchemeRequest): Promise<IncentiveScheme> {
    const response = await apiClient.post<SingleResponse<ApiDocument<IncentiveScheme>>>(
      "/incentives/schemes",
      payload
    );
    return normalizeDocumentId(response.data.data);
  },

  async updateScheme(
    id: string,
    payload: CreateIncentiveSchemeRequest,
  ): Promise<IncentiveScheme> {
    const response = await apiClient.patch<SingleResponse<ApiDocument<IncentiveScheme>>>(
      `/incentives/schemes/${id}`,
      payload
    );
    return normalizeDocumentId(response.data.data);
  },

  async activateScheme(id: string): Promise<IncentiveScheme> {
    const response = await apiClient.post<SingleResponse<ApiDocument<IncentiveScheme>>>(
      `/incentives/schemes/${id}/activate`
    );
    return normalizeDocumentId(response.data.data);
  },

  async pauseScheme(id: string): Promise<IncentiveScheme> {
    const response = await apiClient.post<SingleResponse<ApiDocument<IncentiveScheme>>>(
      `/incentives/schemes/${id}/pause`
    );
    return normalizeDocumentId(response.data.data);
  },

  async archiveScheme(id: string): Promise<IncentiveScheme> {
    const response = await apiClient.post<SingleResponse<ApiDocument<IncentiveScheme>>>(
      `/incentives/schemes/${id}/archive`
    );
    return normalizeDocumentId(response.data.data);
  },

  // 3. Assignments
  async listAssignments(params?: {
    schemeId?: string;
    scopeType?: string;
    scopeId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<SchemeAssignment>> {
    const response = await apiClient.get<PaginatedResponse<ApiDocument<SchemeAssignment>>>(
      "/incentives/assignments",
      { params }
    );
    return {
      ...response.data,
      data: (response.data.data || []).map(normalizeDocumentId),
    };
  },

  async createAssignment(payload: SchemeAssignmentRequest): Promise<SchemeAssignment> {
    const response = await apiClient.post<SingleResponse<ApiDocument<SchemeAssignment>>>(
      "/incentives/assignments",
      payload
    );
    return normalizeDocumentId(response.data.data);
  },

  // 4. Preview
  async previewCalculation(
    payload: CalculationPreviewRequest
  ): Promise<CalculationPreviewResponse> {
    const response = await apiClient.post<SingleResponse<CalculationPreviewResponse>>(
      "/incentives/preview",
      payload
    );
    return response.data.data;
  },

  async computeAttendanceEvaluation(payload: {
    staffId: string;
    schemeId: string;
    monthYear: string;
  }): Promise<AttendanceIncentiveEvaluation> {
    const response = await apiClient.post<SingleResponse<AttendanceIncentiveEvaluation>>(
      "/incentives/attendance-evaluations/compute",
      payload,
      { branchScope: "current" },
    );
    return response.data.data;
  },

  async finalizeAttendanceEvaluation(id: string): Promise<{
    evaluation: AttendanceIncentiveEvaluation;
    ledgerEntry: IncentiveLedgerEntry | null;
  }> {
    const response = await apiClient.post<SingleResponse<{
      evaluation: AttendanceIncentiveEvaluation;
      ledgerEntry: IncentiveLedgerEntry | null;
    }>>(
      `/incentives/attendance-evaluations/${id}/finalize`,
      undefined,
      { branchScope: "current" },
    );
    return response.data.data;
  },

  // 5. Immutable Ledger
  async listLedgerEntries(params?: {
    staffId?: string;
    branchId?: string;
    entryType?: "ACCRUAL" | "CLAWBACK";
    fulfillmentStatus?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<IncentiveLedgerEntry>> {
    const response = await apiClient.get<PaginatedResponse<ApiDocument<IncentiveLedgerEntry>>>(
      "/incentives/ledger",
      { params }
    );
    return {
      ...response.data,
      data: (response.data.data || []).map(normalizeDocumentId),
    };
  },

  // 6. Recovery Obligations
  async listRecoveryObligations(params?: {
    staffId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<IncentiveRecoveryObligation>> {
    const response = await apiClient.get<PaginatedResponse<ApiDocument<IncentiveRecoveryObligation>>>(
      "/incentives/recovery-obligations",
      { params, branchScope: "current" }
    );
    return {
      ...response.data,
      data: (response.data.data || []).map(normalizeDocumentId),
    };
  },

  async recordRecoveryPayment(
    obligationId: string,
    payload: {
      amountInPaise: number;
      paymentMethod: "bank_transfer" | "cash" | "cheque" | "upi";
      paymentReference: string;
      paymentDate: string;
      reason: string;
      idempotencyKey: string;
    },
  ): Promise<{ obligation: IncentiveRecoveryObligation; payment: IncentiveRecoveryPaymentAttempt; isIdempotentReplay: boolean }> {
    const response = await apiClient.post<SingleResponse<{
      obligation: IncentiveRecoveryObligation;
      payment: IncentiveRecoveryPaymentAttempt;
      isIdempotentReplay: boolean;
    }>>(`/incentives/recovery-obligations/${obligationId}/payments`, payload, {
      branchScope: "current",
    });
    return response.data.data;
  },

  async confirmRecoveryPayment(
    obligationId: string,
    paymentId: string,
  ): Promise<{ obligation: IncentiveRecoveryObligation; payment: IncentiveRecoveryPaymentAttempt; isIdempotentReplay: boolean }> {
    const response = await apiClient.post<SingleResponse<{
      obligation: IncentiveRecoveryObligation;
      payment: IncentiveRecoveryPaymentAttempt;
      isIdempotentReplay: boolean;
    }>>(
      `/incentives/recovery-obligations/${obligationId}/payments/${paymentId}/confirm`,
      { confirmActualPayment: true },
      { branchScope: "current" },
    );
    return response.data.data;
  },

  async failRecoveryPayment(
    obligationId: string,
    paymentId: string,
    failureReason: string,
  ): Promise<{ obligation: IncentiveRecoveryObligation; payment: IncentiveRecoveryPaymentAttempt; isIdempotentReplay: boolean }> {
    const response = await apiClient.post<SingleResponse<{
      obligation: IncentiveRecoveryObligation;
      payment: IncentiveRecoveryPaymentAttempt;
      isIdempotentReplay: boolean;
    }>>(
      `/incentives/recovery-obligations/${obligationId}/payments/${paymentId}/fail`,
      { failureReason },
      { branchScope: "current" },
    );
    return response.data.data;
  },

  async reverseRecoveryPayment(
    obligationId: string,
    paymentId: string,
    reversalReason: string,
  ): Promise<{ obligation: IncentiveRecoveryObligation; payment: IncentiveRecoveryPaymentAttempt; isIdempotentReplay: boolean }> {
    const response = await apiClient.post<SingleResponse<{
      obligation: IncentiveRecoveryObligation;
      payment: IncentiveRecoveryPaymentAttempt;
      isIdempotentReplay: boolean;
    }>>(
      `/incentives/recovery-obligations/${obligationId}/payments/${paymentId}/reverse`,
      { confirmActualReversal: true, reversalReason },
      { branchScope: "current" },
    );
    return response.data.data;
  },
};
