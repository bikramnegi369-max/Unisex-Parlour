import { apiClient } from "@/lib/api/axios";
import type { PaginatedResponse } from "@/types/api.types";
import type {
  Leave,
  LeaveListQuery,
  CreateLeavePayload,
  UpdateLeavePayload,
  LeaveListResponse,
  LeaveDetailsResponse,
  LeaveMutateResponse,
} from "../types/leaves.types";

const mapLeaveKeys = (leave: Omit<Leave, "id"> & { _id?: string; id?: string }): Leave => ({
  ...leave,
  id: leave._id || leave.id || "",
} as Leave);

export const getLeaves = async (params: LeaveListQuery = {}): Promise<PaginatedResponse<Leave>> => {
  const { data } = await apiClient.get<LeaveListResponse>("/leaves", {
    params,
    branchScope: "current",
  });

  return {
    ...data,
    data: (data.data || []).map(mapLeaveKeys),
  };
};

export const getLeave = async (id: string): Promise<Leave> => {
  const { data } = await apiClient.get<LeaveDetailsResponse>(`/leaves/${id}`, {
    branchScope: "current",
  });
  return mapLeaveKeys(data.data);
};

export const createLeave = async (payload: CreateLeavePayload): Promise<Leave> => {
  const { data } = await apiClient.post<LeaveMutateResponse>("/leaves", payload, {
    branchScope: "current",
  });
  return mapLeaveKeys(data.data);
};

export const updateLeave = async (id: string, payload: UpdateLeavePayload): Promise<Leave> => {
  const { data } = await apiClient.put<LeaveMutateResponse>(`/leaves/${id}`, payload, {
    branchScope: "current",
  });
  return mapLeaveKeys(data.data);
};

export const approveLeave = async (id: string, reviewNote?: string): Promise<Leave> => {
  const { data } = await apiClient.post<LeaveMutateResponse>(
    `/leaves/${id}/approve`,
    { reviewNote },
    { branchScope: "current" }
  );
  return mapLeaveKeys(data.data);
};

export const rejectLeave = async (id: string, reviewNote: string): Promise<Leave> => {
  const { data } = await apiClient.post<LeaveMutateResponse>(
    `/leaves/${id}/reject`,
    { reviewNote },
    { branchScope: "current" }
  );
  return mapLeaveKeys(data.data);
};

export const cancelLeave = async (id: string, cancelReason: string): Promise<Leave> => {
  const { data } = await apiClient.post<LeaveMutateResponse>(
    `/leaves/${id}/cancel`,
    { cancelReason },
    { branchScope: "current" }
  );
  return mapLeaveKeys(data.data);
};
