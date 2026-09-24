import { apiClient } from "@/lib/api/axios";
import type { PaginatedResponse } from "@/types/api.types";
import type {
  Subscription,
  SubscriptionUsageRecord,
  CreateSubscriptionPayload,
  UpdateSubscriptionPayload,
  CancelSubscriptionPayload,
  RedeemSubscriptionPayload,
  GetSubscriptionsParams,
  GetSubscriptionUsageParams,
  SubscriptionListResponse,
  SubscriptionDetailsResponse,
  SubscriptionMutateResponse,
  SubscriptionUsageResponse,
  SendOtpResponse,
  RedeemResponse,
} from "../types/subscription.types";

export interface RawSubscriptionDTO extends Omit<Partial<Subscription>, "customerId"> {
  _id?: string;
  id?: string;
  customerId?: string | {
    _id?: string;
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
  };
}

export interface RawUsageDTO extends Partial<SubscriptionUsageRecord> {
  _id?: string;
  id?: string;
}

export const mapSubscriptionKeys = (s: RawSubscriptionDTO): Subscription => {
  const isPopulatedCustomer =
    typeof s.customerId === "object" && s.customerId !== null;
  const populatedObj = isPopulatedCustomer
    ? (s.customerId as {
        _id?: string;
        id?: string;
        name?: string;
        phone?: string;
        email?: string;
      })
    : undefined;

  const customerId = populatedObj
    ? populatedObj._id || populatedObj.id || ""
    : typeof s.customerId === "string"
    ? s.customerId
    : "";

  const customer =
    s.customer ||
    (populatedObj
      ? {
          id: populatedObj._id || populatedObj.id || customerId,
          name: populatedObj.name || "",
          phone: populatedObj.phone || "",
          email: populatedObj.email,
        }
      : undefined);

  return {
    ...(s as unknown as Subscription),
    id: s._id || s.id || "",
    customerId,
    customer,
    permittedBranchIds: s.permittedBranchIds || [],
    entitlements: (s.entitlements || []).map((e) => {
      const rawSrv = e.serviceId as unknown;
      const isPopulated = typeof rawSrv === "object" && rawSrv !== null;
      const srvObj = isPopulated
        ? (rawSrv as { _id?: string; id?: string; name?: string })
        : undefined;

      const serviceId = srvObj
        ? srvObj._id || srvObj.id || ""
        : typeof e.serviceId === "string"
        ? e.serviceId
        : "";

      const serviceName = e.serviceName || srvObj?.name || "";

      return {
        serviceId,
        serviceName,
        totalQuantity: e.totalQuantity ?? 0,
        usedQuantity: e.usedQuantity ?? 0,
        remainingQuantity: e.remainingQuantity ?? 0,
      };
    }),
  };
};

export const mapUsageKeys = (u: RawUsageDTO): SubscriptionUsageRecord => ({
  ...(u as SubscriptionUsageRecord),
  id: u._id || u.id || "",
});

/**
 * Organization-scoped list of subscriptions.
 * Under no circumstance sends "all" as branchId.
 */
export const getSubscriptions = async (
  params: GetSubscriptionsParams = {}
): Promise<PaginatedResponse<Subscription>> => {
  const sanitizedParams = { ...params };
  if (sanitizedParams.branchId === "all") {
    delete sanitizedParams.branchId;
  }

  const { data } = await apiClient.get<SubscriptionListResponse>("/subscriptions", {
    params: sanitizedParams,
    branchScope: "none",
  });

  return {
    ...data,
    data: (data.data || []).map(mapSubscriptionKeys),
  };
};

/**
 * Organization-scoped subscription details by ID.
 */
export const getSubscription = async (id: string): Promise<Subscription> => {
  const { data } = await apiClient.get<SubscriptionDetailsResponse>(
    `/subscriptions/${id}`,
    {
      branchScope: "none",
    }
  );
  return mapSubscriptionKeys(data.data);
};

/**
 * Organization-scoped subscription creation.
 */
export const createSubscription = async (
  payload: CreateSubscriptionPayload
): Promise<Subscription> => {
  const sanitizedBranchIds = (payload.permittedBranchIds || []).filter(
    (bId) => bId !== "all" && bId.trim() !== ""
  );

  const { data } = await apiClient.post<SubscriptionMutateResponse>(
    "/subscriptions",
    {
      ...payload,
      permittedBranchIds: sanitizedBranchIds,
    },
    {
      branchScope: "none",
    }
  );
  return mapSubscriptionKeys(data.data);
};

/**
 * Organization-scoped subscription update (permittedBranchIds, endDate, notes).
 */
export const updateSubscription = async (
  id: string,
  payload: UpdateSubscriptionPayload
): Promise<Subscription> => {
  const sanitizedBranchIds = payload.permittedBranchIds
    ? payload.permittedBranchIds.filter((bId) => bId !== "all" && bId.trim() !== "")
    : undefined;

  const { data } = await apiClient.put<SubscriptionMutateResponse>(
    `/subscriptions/${id}`,
    {
      ...payload,
      ...(sanitizedBranchIds !== undefined ? { permittedBranchIds: sanitizedBranchIds } : {}),
    },
    {
      branchScope: "none",
    }
  );
  return mapSubscriptionKeys(data.data);
};

/**
 * Organization-scoped cancellation of an active subscription.
 */
export const cancelSubscription = async (
  id: string,
  payload: CancelSubscriptionPayload
): Promise<Subscription> => {
  const { data } = await apiClient.patch<SubscriptionMutateResponse>(
    `/subscriptions/${id}/cancel`,
    payload,
    {
      branchScope: "none",
    }
  );
  return mapSubscriptionKeys(data.data);
};

/**
 * Branch-scoped OTP trigger for redemption.
 * Uses the client's current active branch context.
 */
export const sendSubscriptionOtp = async (id: string): Promise<{ message?: string }> => {
  const { data } = await apiClient.post<SendOtpResponse>(
    `/subscriptions/${id}/send-otp`,
    {},
    {
      branchScope: "current",
    }
  );
  return data.data;
};

/**
 * Branch-scoped redemption of subscription entitlements with OTP.
 * Uses the client's current active branch context.
 */
export const redeemSubscription = async (
  id: string,
  payload: RedeemSubscriptionPayload
): Promise<{ subscription: Subscription; usageRecords: SubscriptionUsageRecord[] }> => {
  const { data } = await apiClient.post<RedeemResponse>(
    `/subscriptions/${id}/redeem`,
    payload,
    {
      branchScope: "current",
    }
  );

  return {
    subscription: mapSubscriptionKeys(data.data.subscription),
    usageRecords: (data.data.usageRecords || []).map(mapUsageKeys),
  };
};

/**
 * Organization-scoped retrieval of subscription redemption history / ledger.
 */
export const getSubscriptionUsage = async (
  id: string,
  params: GetSubscriptionUsageParams = {}
): Promise<PaginatedResponse<SubscriptionUsageRecord>> => {
  const { data } = await apiClient.get<SubscriptionUsageResponse>(
    `/subscriptions/${id}/usage`,
    {
      params,
      branchScope: "none",
    }
  );

  return {
    ...data,
    data: (data.data || []).map(mapUsageKeys),
  };
};
