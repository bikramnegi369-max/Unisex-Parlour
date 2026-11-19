import { apiClient } from "@/lib/api/axios";
import type { PaginatedResponse } from "@/types/api.types";
import type {
  MembershipPlan,
  CustomerMembership,
  CustomerActiveBenefits,
  CreateMembershipPlanPayload,
  UpdateMembershipPlanPayload,
  QueryMembershipPlansParams,
  QueryCustomerMembershipsParams,
} from "../types/membership.types";

export const mapPlanKeys = (p: any): MembershipPlan => ({
  ...p,
  id: p._id || p.id || "",
  maxBeneficiaries: p.maxBeneficiaries || 1,
});

export const mapCustomerMembershipKeys = (m: any): CustomerMembership => {
  const customerObj = typeof m.customerId === "object" && m.customerId !== null ? m.customerId : null;
  const payerObj = typeof m.payerCustomerId === "object" && m.payerCustomerId !== null ? m.payerCustomerId : null;

  return {
    ...m,
    id: m._id || m.id || "",
    customerId: customerObj ? customerObj._id || customerObj.id : m.customerId,
    customer: customerObj
      ? {
          id: customerObj._id || customerObj.id,
          name: customerObj.name || "",
          phone: customerObj.phone || "",
          email: customerObj.email,
        }
      : undefined,
    payerCustomerId: payerObj ? payerObj._id || payerObj.id : m.payerCustomerId || m.customerId,
    payer: payerObj
      ? {
          id: payerObj._id || payerObj.id,
          name: payerObj.name || "",
          phone: payerObj.phone || "",
          email: payerObj.email,
        }
      : undefined,
  };
};

/**
 * 1. Membership Plans
 */
export const getMembershipPlans = async (
  params: QueryMembershipPlansParams = {}
): Promise<{ data: MembershipPlan[]; total: number; page: number; totalPages: number }> => {
  const { data } = await apiClient.get<{
    success: boolean;
    data: any[];
    pagination: { total: number; page: number; totalPages: number };
  }>("/memberships/plans", {
    params,
    branchScope: "none",
  });

  return {
    data: (data.data || []).map(mapPlanKeys),
    total: data.pagination?.total || 0,
    page: data.pagination?.page || 1,
    totalPages: data.pagination?.totalPages || 1,
  };
};

export const getMembershipPlan = async (id: string): Promise<MembershipPlan> => {
  const { data } = await apiClient.get<{ success: boolean; data: any }>(
    `/memberships/plans/${id}`,
    { branchScope: "none" }
  );
  return mapPlanKeys(data.data);
};

export const createMembershipPlan = async (
  payload: CreateMembershipPlanPayload
): Promise<MembershipPlan> => {
  const { data } = await apiClient.post<{ success: boolean; data: any }>(
    "/memberships/plans",
    payload,
    { branchScope: "none" }
  );
  return mapPlanKeys(data.data);
};

export const updateMembershipPlan = async (
  id: string,
  payload: UpdateMembershipPlanPayload
): Promise<MembershipPlan> => {
  const { data } = await apiClient.put<{ success: boolean; data: any }>(
    `/memberships/plans/${id}`,
    payload,
    { branchScope: "none" }
  );
  return mapPlanKeys(data.data);
};

export const deleteMembershipPlan = async (id: string): Promise<void> => {
  await apiClient.delete(`/memberships/plans/${id}`, { branchScope: "none" });
};

export const duplicateMembershipPlan = async (id: string): Promise<MembershipPlan> => {
  const { data } = await apiClient.post<{ success: boolean; data: any }>(
    `/memberships/plans/${id}/duplicate`,
    {},
    { branchScope: "none" }
  );
  return mapPlanKeys(data.data);
};

/**
 * 2. Customer Memberships
 */
export const getCustomerMemberships = async (
  params: QueryCustomerMembershipsParams = {}
): Promise<{ data: CustomerMembership[]; total: number; page: number; totalPages: number }> => {
  const { data } = await apiClient.get<{
    success: boolean;
    data: any[];
    pagination: { total: number; page: number; totalPages: number };
  }>("/memberships", {
    params,
    branchScope: "none",
  });

  return {
    data: (data.data || []).map(mapCustomerMembershipKeys),
    total: data.pagination?.total || 0,
    page: data.pagination?.page || 1,
    totalPages: data.pagination?.totalPages || 1,
  };
};

export const getCustomerMembership = async (id: string): Promise<CustomerMembership> => {
  const { data } = await apiClient.get<{ success: boolean; data: any }>(
    `/memberships/${id}`,
    { branchScope: "none" }
  );
  return mapCustomerMembershipKeys(data.data);
};

export const cancelBeneficiaryMembership = async (
  id: string,
  reason: string
): Promise<CustomerMembership> => {
  const { data } = await apiClient.patch<{ success: boolean; data: any }>(
    `/memberships/${id}/cancel`,
    { reason },
    { branchScope: "none" }
  );
  return mapCustomerMembershipKeys(data.data);
};

export const getCustomerActiveBenefits = async (
  customerId: string,
  branchId?: string
): Promise<CustomerActiveBenefits> => {
  const { data } = await apiClient.get<{ success: boolean; data: any }>(
    `/memberships/customer/${customerId}/benefits`,
    {
      params: branchId ? { branchId } : {},
      branchScope: "none",
    }
  );
  return data.data;
};
