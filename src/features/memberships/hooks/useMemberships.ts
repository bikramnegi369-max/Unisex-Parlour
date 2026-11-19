import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMembershipPlans,
  getMembershipPlan,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
  duplicateMembershipPlan,
  getCustomerMemberships,
  getCustomerMembership,
  cancelBeneficiaryMembership,
  getCustomerActiveBenefits,
} from "../api/memberships.api";
import type {
  CreateMembershipPlanPayload,
  UpdateMembershipPlanPayload,
  QueryMembershipPlansParams,
  QueryCustomerMembershipsParams,
} from "../types/membership.types";

export const membershipKeys = {
  all: ["memberships"] as const,
  plans: (params?: QueryMembershipPlansParams) => [...membershipKeys.all, "plans", params] as const,
  plan: (id: string) => [...membershipKeys.all, "plan", id] as const,
  customerMemberships: (params?: QueryCustomerMembershipsParams) =>
    [...membershipKeys.all, "customer-memberships", params] as const,
  customerMembership: (id: string) => [...membershipKeys.all, "customer-membership", id] as const,
  customerBenefits: (customerId: string, branchId?: string) =>
    [...membershipKeys.all, "customer-benefits", customerId, branchId] as const,
};

export const useMembershipPlans = (params: QueryMembershipPlansParams = {}) => {
  return useQuery({
    queryKey: membershipKeys.plans(params),
    queryFn: () => getMembershipPlans(params),
  });
};

export const useMembershipPlan = (id: string) => {
  return useQuery({
    queryKey: membershipKeys.plan(id),
    queryFn: () => getMembershipPlan(id),
    enabled: Boolean(id),
  });
};

export const useCreateMembershipPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMembershipPlanPayload) => createMembershipPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...membershipKeys.all, "plans"] });
    },
  });
};

export const useUpdateMembershipPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMembershipPlanPayload }) =>
      updateMembershipPlan(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...membershipKeys.all, "plans"] });
      queryClient.invalidateQueries({ queryKey: membershipKeys.plan(variables.id) });
    },
  });
};

export const useDeleteMembershipPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMembershipPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...membershipKeys.all, "plans"] });
    },
  });
};

export const useDuplicateMembershipPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => duplicateMembershipPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...membershipKeys.all, "plans"] });
    },
  });
};

export const useCustomerMemberships = (params: QueryCustomerMembershipsParams = {}) => {
  return useQuery({
    queryKey: membershipKeys.customerMemberships(params),
    queryFn: () => getCustomerMemberships(params),
  });
};

export const useCustomerMembership = (id: string) => {
  return useQuery({
    queryKey: membershipKeys.customerMembership(id),
    queryFn: () => getCustomerMembership(id),
    enabled: Boolean(id),
  });
};

export const useCancelBeneficiaryMembership = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelBeneficiaryMembership(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...membershipKeys.all, "customer-memberships"] });
      queryClient.invalidateQueries({ queryKey: membershipKeys.customerMembership(variables.id) });
    },
  });
};

export const useCustomerActiveBenefits = (customerId: string, branchId?: string) => {
  return useQuery({
    queryKey: membershipKeys.customerBenefits(customerId, branchId),
    queryFn: () => getCustomerActiveBenefits(customerId, branchId),
    enabled: Boolean(customerId),
  });
};
