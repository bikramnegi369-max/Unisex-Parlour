import { apiClient } from "@/lib/api/axios";
import type { PaginatedResponse } from "@/types/api.types";
import type {
  Subscription,
  SubscriptionUsageRecord,
  CreateSubscriptionPayload,
  RenewSubscriptionPayload,
  RenewSubscriptionResult,
  UpdateSubscriptionPayload,
  CancelSubscriptionPayload,
  RedeemSubscriptionPayload,
  GetSubscriptionsParams,
  GetSubscriptionUsageParams,
  SubscriptionListResponse,
  SubscriptionDetailsResponse,
  SubscriptionMutateResponse,
  SubscriptionUsageResponse,
  SendOtpPayload,
  SendOtpResult,
  SendOtpResponse,
  RedeemResponse,
  SubscriptionMemberStatus,
} from "../types/subscription.types";

export interface RawSubscriptionDTO extends Omit<
  Partial<Subscription>,
  "customerId" | "payerCustomerId" | "payerId" | "payer" | "members"
> {
  _id?: string;
  id?: string;
  customerId?:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
        phone?: string;
        email?: string;
      };
  payerCustomerId?:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
        phone?: string;
        email?: string;
      };
  payerId?:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
        phone?: string;
        email?: string;
      };
  payer?: {
    id?: string;
    _id?: string;
    name?: string;
    phone?: string;
    email?: string;
  };
  members?: Array<{
    customerId:
      | string
      | {
          _id?: string;
          id?: string;
          name?: string;
          phone?: string;
          email?: string;
        };
    customer?: {
      id?: string;
      _id?: string;
      name?: string;
      phone?: string;
      email?: string;
    };
    status?: SubscriptionMemberStatus;
    permittedBranchIds?: Array<string | { _id?: string; id?: string }>;
    entitlements?: Array<{
      serviceId: string | { _id?: string; id?: string; name?: string };
      serviceName?: string;
      totalQuantity?: number;
      usedQuantity?: number;
      remainingQuantity?: number;
      isRedeemable?: boolean;
    }>;
    joinedAt?: string;
    notes?: string;
  }>;
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

  // Normalize canonical payerCustomerId / payerId (defaults to customerId if not explicitly set)
  const rawPayerField = s.payerCustomerId || s.payerId;
  const isPopulatedPayer =
    typeof rawPayerField === "object" && rawPayerField !== null;
  const populatedPayerObj = isPopulatedPayer
    ? (rawPayerField as {
        _id?: string;
        id?: string;
        name?: string;
        phone?: string;
        email?: string;
      })
    : undefined;

  const payerCustomerId = populatedPayerObj
    ? populatedPayerObj._id || populatedPayerObj.id || ""
    : typeof rawPayerField === "string"
      ? rawPayerField
      : customerId;

  const payerId = payerCustomerId;

  const payer = s.payer
    ? {
        id: s.payer.id || s.payer._id || payerCustomerId,
        name: s.payer.name || "",
        phone: s.payer.phone || "",
        email: s.payer.email,
      }
    : populatedPayerObj
      ? {
          id: populatedPayerObj._id || populatedPayerObj.id || payerCustomerId,
          name: populatedPayerObj.name || "",
          phone: populatedPayerObj.phone || "",
          email: populatedPayerObj.email,
        }
      : customer;

  // Normalize members array
  const mappedMembers: import("../types/subscription.types").SubscriptionMember[] =
    (s.members || []).map((m) => {
      const isPopulatedMemberCustomer =
        typeof m.customerId === "object" && m.customerId !== null;
      const popMemberObj = isPopulatedMemberCustomer
        ? (m.customerId as {
            _id?: string;
            id?: string;
            name?: string;
            phone?: string;
            email?: string;
          })
        : undefined;

      const mCustomerId = popMemberObj
        ? popMemberObj._id || popMemberObj.id || ""
        : typeof m.customerId === "string"
          ? m.customerId
          : "";

      const mCustomer = m.customer
        ? {
            id: m.customer.id || m.customer._id || mCustomerId,
            name: m.customer.name || "",
            phone: m.customer.phone || "",
            email: m.customer.email,
          }
        : popMemberObj
          ? {
              id: popMemberObj._id || popMemberObj.id || mCustomerId,
              name: popMemberObj.name || "",
              phone: popMemberObj.phone || "",
              email: popMemberObj.email,
            }
          : undefined;

      const mEntitlements = (m.entitlements || []).map((e) => {
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
        const remainingQuantity = e.remainingQuantity ?? 0;
        const isRedeemable =
          typeof e.isRedeemable === "boolean"
            ? e.isRedeemable
            : remainingQuantity > 0 &&
              (s.status === "active" || s.status === "pending_payment");

        return {
          serviceId,
          serviceName,
          totalQuantity: e.totalQuantity ?? 0,
          usedQuantity: e.usedQuantity ?? 0,
          remainingQuantity,
          isRedeemable,
        };
      });

      const mPermittedBranchIds = (m.permittedBranchIds || [])
        .map((b) => {
          if (typeof b === "string") return b;
          if (typeof b === "object" && b !== null) {
            const bObj = b as { _id?: string; id?: string };
            return bObj._id || bObj.id || "";
          }
          return "";
        })
        .filter(Boolean);

      return {
        customerId: mCustomerId,
        customer: mCustomer,
        status: m.status || "active",
        entitlements: mEntitlements,
        permittedBranchIds: mPermittedBranchIds,
        joinedAt: m.joinedAt,
        notes: m.notes,
      };
    });

  // Preserve explicit empty membership array if provided by backend (members: []).
  // Only synthesize a legacy 1-member entry when the members field is genuinely absent (s.members === undefined).
  const finalMembers =
    s.members !== undefined
      ? mappedMembers
      : customerId
        ? [
            {
              customerId,
              customer,
              status: "active" as const,
              entitlements: (s.entitlements || []).map((e) => {
                const rawSrv = e.serviceId as unknown;
                const isPopulated =
                  typeof rawSrv === "object" && rawSrv !== null;
                const srvObj = isPopulated
                  ? (rawSrv as { _id?: string; id?: string; name?: string })
                  : undefined;
                const serviceId = srvObj
                  ? srvObj._id || srvObj.id || ""
                  : typeof e.serviceId === "string"
                    ? e.serviceId
                    : "";
                const remainingQuantity = e.remainingQuantity ?? 0;
                return {
                  serviceId,
                  serviceName: e.serviceName || srvObj?.name || "",
                  totalQuantity: e.totalQuantity ?? 0,
                  usedQuantity: e.usedQuantity ?? 0,
                  remainingQuantity,
                  isRedeemable:
                    typeof e.isRedeemable === "boolean"
                      ? e.isRedeemable
                      : remainingQuantity > 0 &&
                        (s.status === "active" ||
                          s.status === "pending_payment"),
                };
              }),
            },
          ]
        : [];

  return {
    ...(s as unknown as Subscription),
    id: s._id || s.id || "",
    customerId,
    customer,
    payerCustomerId,
    payerId,
    payer,
    members: finalMembers,
    invoiceId:
      typeof s.invoiceId === "string"
        ? s.invoiceId
        : typeof s.invoiceId === "object" && s.invoiceId !== null
          ? (s.invoiceId as { _id?: string; id?: string })._id ||
            (s.invoiceId as { _id?: string; id?: string }).id ||
            undefined
          : undefined,
    invoiceNumber:
      typeof s.invoiceNumber === "string" ? s.invoiceNumber : undefined,
    paymentStatus:
      (s.paymentStatus as Subscription["paymentStatus"]) || undefined,
    amountPaid: typeof s.amountPaid === "number" ? s.amountPaid : undefined,
    amountDue: typeof s.amountDue === "number" ? s.amountDue : undefined,
    isPaid: typeof s.isPaid === "boolean" ? s.isPaid : undefined,
    permittedBranchIds: (s.permittedBranchIds || [])
      .map((b) => {
        if (typeof b === "string") return b;
        if (typeof b === "object" && b !== null) {
          const bObj = b as { _id?: string; id?: string };
          return bObj._id || bObj.id || "";
        }
        return "";
      })
      .filter(Boolean),
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

      const remainingQuantity = e.remainingQuantity ?? 0;
      const isRedeemable =
        typeof e.isRedeemable === "boolean"
          ? e.isRedeemable
          : remainingQuantity > 0 &&
            (s.status === "active" || s.status === "pending_payment");

      return {
        serviceId,
        serviceName,
        totalQuantity: e.totalQuantity ?? 0,
        usedQuantity: e.usedQuantity ?? 0,
        remainingQuantity,
        isRedeemable,
      };
    }),
  };
};

export const mapUsageKeys = (u: RawUsageDTO): SubscriptionUsageRecord => {
  const rawService = u.serviceId as unknown;
  const isPopulatedService =
    typeof rawService === "object" && rawService !== null;
  const serviceObj = isPopulatedService
    ? (rawService as { _id?: string; id?: string; name?: string })
    : undefined;

  const serviceId = serviceObj
    ? serviceObj._id || serviceObj.id || ""
    : typeof u.serviceId === "string"
      ? u.serviceId
      : "";

  const serviceName =
    typeof u.serviceName === "string" && u.serviceName
      ? u.serviceName
      : serviceObj?.name || "";

  const rawBranch = u.branchId as unknown;
  const isPopulatedBranch = typeof rawBranch === "object" && rawBranch !== null;
  const branchObj = isPopulatedBranch
    ? (rawBranch as { _id?: string; id?: string; name?: string })
    : undefined;

  const branchId = branchObj
    ? branchObj._id || branchObj.id || ""
    : typeof u.branchId === "string"
      ? u.branchId
      : "";

  const branchName =
    typeof u.branchName === "string" && u.branchName
      ? u.branchName
      : branchObj?.name;

  const rawVerifier = (u as Record<string, unknown>).verifiedBy || u.redeemedBy;

  return {
    ...(u as SubscriptionUsageRecord),
    id: u._id || u.id || "",
    serviceId,
    serviceName,
    branchId,
    branchName,
    verificationMethod: u.verificationMethod || "otp",
    reason: u.reason || null,
    verifiedBy: rawVerifier as SubscriptionUsageRecord["verifiedBy"],
    redeemedBy: rawVerifier as SubscriptionUsageRecord["redeemedBy"],
  };
};

/**
 * Organization-scoped list of subscriptions.
 * Under no circumstance sends "all" as branchId.
 */
export const getSubscriptions = async (
  params: GetSubscriptionsParams = {},
): Promise<PaginatedResponse<Subscription>> => {
  const sanitizedParams = { ...params };
  if (sanitizedParams.branchId === "all") {
    delete sanitizedParams.branchId;
  }

  const { data } = await apiClient.get<SubscriptionListResponse>(
    "/subscriptions",
    {
      params: sanitizedParams,
      branchScope: "none",
    },
  );

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
    },
  );
  return mapSubscriptionKeys(data.data);
};

/**
 * Branch-scoped subscription creation.
 * Uses the active selling branch context (via X-Branch-Id attached by apiClient)
 * to establish sale invoice branch ownership.
 * Returns the created subscription along with any generated sale invoice or invoiceId.
 */
export const createSubscription = async (
  payload: CreateSubscriptionPayload,
  branchIdOverride?: string,
): Promise<import("../types/subscription.types").CreateSubscriptionResult> => {
  const sanitizedBranchIds = (payload.permittedBranchIds || []).filter(
    (bId) => bId !== "all" && bId.trim() !== "",
  );

  const branchConfig =
    branchIdOverride && branchIdOverride !== "all"
      ? { branchScope: { type: "branch" as const, branchId: branchIdOverride } }
      : { branchScope: "current" as const };

  // Ensure canonical payload alignment:
  // For multi-member payload, backend expects payerCustomerId.
  // For legacy single-customer, backend accepts customerId.
  const canonicalPayload = {
    ...payload,
    ...(payload.members && payload.members.length > 0
      ? {
          payerCustomerId:
            payload.payerCustomerId || payload.customerId || payload.payerId,
          // Retain customerId for dual-compatibility if backend expects it
          customerId:
            payload.customerId || payload.payerCustomerId || payload.payerId,
        }
      : {}),
    permittedBranchIds: sanitizedBranchIds,
  };

  const { data } = await apiClient.post<SubscriptionMutateResponse>(
    "/subscriptions",
    canonicalPayload,
    branchConfig,
  );

  const rawData = data.data as Record<string, unknown>;
  const rawSub =
    rawData &&
    typeof rawData.subscription === "object" &&
    rawData.subscription !== null
      ? (rawData.subscription as RawSubscriptionDTO)
      : (rawData as RawSubscriptionDTO);

  const mappedSub = mapSubscriptionKeys(rawSub);

  // Extract invoiceId and invoice from either top-level or subscription level
  const invoiceId =
    (typeof rawData.invoiceId === "string" ? rawData.invoiceId : undefined) ||
    mappedSub.invoiceId ||
    (typeof rawData.invoice === "object" && rawData.invoice !== null
      ? (rawData.invoice as { id?: string; _id?: string }).id ||
        (rawData.invoice as { id?: string; _id?: string })._id
      : undefined);

  const invoiceNumber =
    (typeof rawData.invoiceNumber === "string"
      ? rawData.invoiceNumber
      : undefined) ||
    mappedSub.invoiceNumber ||
    (typeof rawData.invoice === "object" && rawData.invoice !== null
      ? (rawData.invoice as { invoiceNumber?: string }).invoiceNumber
      : undefined);

  return {
    ...mappedSub,
    invoiceId,
    invoiceNumber,
    invoice: rawData.invoice as
      | import("@/features/billing/types/billing.types").Invoice
      | undefined,
  };
};

/**
 * Branch-scoped subscription renewal.
 * Uses the active selling branch context (via X-Branch-Id attached by apiClient)
 * to establish sale invoice branch ownership for the renewal invoice.
 * Returns the renewed subscription along with any generated renewal invoice or invoiceId.
 */
export const renewSubscription = async (
  id: string,
  payload: RenewSubscriptionPayload = {},
): Promise<RenewSubscriptionResult> => {
  const { data } = await apiClient.post<SubscriptionMutateResponse>(
    `/subscriptions/${id}/renew`,
    payload,
    {
      branchScope: "current",
    },
  );

  const rawData = data.data as Record<string, unknown>;
  const rawSub =
    rawData &&
    typeof rawData.subscription === "object" &&
    rawData.subscription !== null
      ? (rawData.subscription as RawSubscriptionDTO)
      : (rawData as RawSubscriptionDTO);

  const mappedSub = mapSubscriptionKeys(rawSub);

  const invoiceId =
    (typeof rawData.invoiceId === "string" ? rawData.invoiceId : undefined) ||
    mappedSub.invoiceId ||
    (typeof rawData.invoice === "object" && rawData.invoice !== null
      ? (rawData.invoice as { id?: string; _id?: string }).id ||
        (rawData.invoice as { id?: string; _id?: string })._id
      : undefined);

  const invoiceNumber =
    (typeof rawData.invoiceNumber === "string"
      ? rawData.invoiceNumber
      : undefined) ||
    mappedSub.invoiceNumber ||
    (typeof rawData.invoice === "object" && rawData.invoice !== null
      ? (rawData.invoice as { invoiceNumber?: string }).invoiceNumber
      : undefined);

  return {
    ...mappedSub,
    invoiceId,
    invoiceNumber,
    invoice: rawData.invoice as
      | import("@/features/billing/types/billing.types").Invoice
      | undefined,
  };
};

/**
 * Organization-scoped subscription update (permittedBranchIds, endDate, notes).
 */
export const updateSubscription = async (
  id: string,
  payload: UpdateSubscriptionPayload,
): Promise<Subscription> => {
  const sanitizedBranchIds = payload.permittedBranchIds
    ? payload.permittedBranchIds.filter(
        (bId) => bId !== "all" && bId.trim() !== "",
      )
    : undefined;

  const { data } = await apiClient.put<SubscriptionMutateResponse>(
    `/subscriptions/${id}`,
    {
      ...payload,
      ...(sanitizedBranchIds !== undefined
        ? { permittedBranchIds: sanitizedBranchIds }
        : {}),
    },
    {
      branchScope: "none",
    },
  );
  return mapSubscriptionKeys(data.data);
};

/**
 * Organization-scoped update of a member's permitted branch access.
 * PUT /subscriptions/:id/members/:memberCustomerId/branches
 * Request body: { permittedBranchIds: string[] }
 * An empty array [] signifies inherited subscription-level branch access.
 */
export const updateMemberBranchAccess = async (
  subscriptionId: string,
  memberCustomerId: string,
  permittedBranchIds: string[],
): Promise<Subscription> => {
  const sanitizedBranchIds = permittedBranchIds.filter(
    (bId) => bId !== "all" && bId.trim() !== "",
  );

  const { data } = await apiClient.put<SubscriptionMutateResponse>(
    `/subscriptions/${subscriptionId}/members/${memberCustomerId}/branches`,
    { permittedBranchIds: sanitizedBranchIds },
    {
      branchScope: "none",
    },
  );
  return mapSubscriptionKeys(data.data);
};

/**
 * Organization-scoped cancellation of an active subscription.
 */
/**
 * Organization-scoped cancellation of an active subscription.
 * Supports idempotency header transport and optional forceAsync flag.
 * Handles both HTTP 200 (immediate synchronous cancellation) and HTTP 202 (async background processing).
 */
export interface CancelSubscriptionResult {
  subscription?: Subscription;
  operationId?: string;
  status: "completed" | "pending" | "processing" | string;
  isAsync: boolean;
  operation?: import("../types/subscription.types").CancellationOperationData;
}

/**
 * Normalizes backend cancellation preview response against the canonical contract.
 * Reconciles actual backend response fields:
 * - isEligibleRuleB -> isEligible (for Rule B) & eligibilityRule
 * - totalUsages -> consumedEntitlementCount
 * - totalAppointments -> affectedAppointmentCount
 * - totalRestoredAmount -> expectedRebilledSubtotalIncrease
 * - blockingInconsistencies -> ineligibilityReason & isEligible: false
 * - affectedAppointments[].affectedLines -> serviceLinesToRebill
 * - affectedAppointments[].affectedLines[].restoredPrice -> restoredRetailPrice
 */
export const mapCancellationPreviewKeys = (
  raw: import("../types/subscription.types").RawCancellationPreviewDTO | Record<string, unknown>,
): import("../types/subscription.types").CancellationPreviewData => {
  const rawObj = (raw || {}) as Record<string, unknown>;

  // Blocking inconsistencies normalization
  // Normalize strings and structured objects safely (e.g. { message }, { error }, { reason }, { code })
  // Unknown entries must not silently disappear if doing so could enable cancellation (fail-closed).
  const rawInconsistencies = rawObj.blockingInconsistencies;
  let blockingInconsistencies: string[] | undefined;
  if (Array.isArray(rawInconsistencies)) {
    blockingInconsistencies = rawInconsistencies
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const rec = item as Record<string, unknown>;
          if (typeof rec.message === "string" && rec.message.trim().length > 0) return rec.message.trim();
          if (typeof rec.error === "string" && rec.error.trim().length > 0) return rec.error.trim();
          if (typeof rec.reason === "string" && rec.reason.trim().length > 0) return rec.reason.trim();
          if (typeof rec.code === "string" && rec.code.trim().length > 0) return `Inconsistency code: ${rec.code.trim()}`;
          try {
            return JSON.stringify(item);
          } catch {
            return "Unspecified blocking inconsistency";
          }
        }
        return String(item ?? "Unspecified blocking inconsistency");
      })
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0);
  }

  // Determine usage count
  const consumedEntitlementCount =
    typeof rawObj.totalUsages === "number"
      ? rawObj.totalUsages
      : typeof rawObj.consumedEntitlementCount === "number"
        ? rawObj.consumedEntitlementCount
        : 0;

  // Determine affected appointment count
  const affectedAppointmentCount =
    typeof rawObj.totalAppointments === "number"
      ? rawObj.totalAppointments
      : typeof rawObj.affectedAppointmentCount === "number"
        ? rawObj.affectedAppointmentCount
        : 0;

  // Determine rebilled / restored amount
  const expectedRebilledSubtotalIncrease =
    typeof rawObj.totalRestoredAmount === "number"
      ? rawObj.totalRestoredAmount
      : typeof rawObj.expectedRebilledSubtotalIncrease === "number"
        ? rawObj.expectedRebilledSubtotalIncrease
        : 0;

  // Determine eligibility rule classification:
  // Rule classification is kept separate from eligibility determination.
  // totalUsages > 0 identifies Rule B, but must NEVER independently establish eligibility.
  let eligibilityRule: "RULE_A" | "RULE_B" | string = "RULE_A";
  if (typeof rawObj.eligibilityRule === "string" && rawObj.eligibilityRule) {
    eligibilityRule = rawObj.eligibilityRule;
  } else if (consumedEntitlementCount > 0) {
    eligibilityRule = "RULE_B";
  } else {
    eligibilityRule = "RULE_A";
  }

  // Determine overall eligibility:
  // 1. Any non-empty blockingInconsistencies must disable confirmation, regardless of other fields.
  // 2. For Rule B, use backend isEligibleRuleB as the authoritative eligibility signal.
  //    totalUsages > 0 must NEVER independently make a subscription eligible.
  // 3. For Rule A with zero usages, follow actual backend Rule A eligibility (isEligible or isEligibleRuleA).
  //    Do not infer eligibility from missing fields; unknown or malformed data must fail closed.
  const hasBlockers = Boolean(blockingInconsistencies && blockingInconsistencies.length > 0);
  let isEligible = false;

  if (hasBlockers) {
    isEligible = false;
  } else if (eligibilityRule === "RULE_B") {
    if (typeof rawObj.isEligibleRuleB === "boolean") {
      isEligible = rawObj.isEligibleRuleB;
    } else if (typeof rawObj.isEligible === "boolean") {
      isEligible = rawObj.isEligible;
    } else {
      // Fail-closed when Rule B eligibility signal is missing or malformed
      isEligible = false;
    }
  } else {
    // Rule A: require explicit backend eligibility signal, failing closed if missing or malformed
    if (typeof rawObj.isEligible === "boolean") {
      isEligible = rawObj.isEligible;
    } else if (typeof (rawObj as Record<string, unknown>).isEligibleRuleA === "boolean") {
      isEligible = (rawObj as Record<string, unknown>).isEligibleRuleA as boolean;
    } else {
      // Missing or malformed eligibility field on Rule A must fail closed
      isEligible = false;
    }
  }

  const ineligibilityReason =
    (typeof rawObj.ineligibilityReason === "string" && rawObj.ineligibilityReason) ||
    (hasBlockers && blockingInconsistencies ? blockingInconsistencies.join("; ") : undefined) ||
    (!isEligible ? "Subscription is not eligible for cancellation in its current state." : undefined);

  // Map affected appointments & affectedLines
  const rawAppointments = Array.isArray(rawObj.affectedAppointments)
    ? (rawObj.affectedAppointments as Array<Record<string, unknown>>)
    : [];

  const affectedAppointments: import("../types/subscription.types").AffectedAppointmentPreview[] =
    rawAppointments.map((apt) => {
      const rawLines = Array.isArray(apt.affectedLines)
        ? (apt.affectedLines as Array<Record<string, unknown>>)
        : Array.isArray(apt.serviceLinesToRebill)
          ? (apt.serviceLinesToRebill as Array<Record<string, unknown>>)
          : [];

      const serviceLinesToRebill: import("../types/subscription.types").ServiceLineToRebill[] =
        rawLines.map((line) => {
          const restoredPrice =
            typeof line.restoredPrice === "number"
              ? line.restoredPrice
              : typeof line.restoredRetailPrice === "number"
                ? line.restoredRetailPrice
                : 0;

          return {
            usageId: (line.usageId as string) || undefined,
            appointmentServiceId: (line.appointmentServiceId as string) || undefined,
            serviceId: (line.serviceId as string) || "",
            serviceName: (line.serviceName as string) || "Service",
            restoredRetailPrice: restoredPrice,
          };
        });

      return {
        appointmentId: (apt.appointmentId as string) || "",
        appointmentCode: (apt.appointmentCode as string) || undefined,
        status: (apt.status as string) || "completed",
        invoiceId: (apt.invoiceId as string) || undefined,
        invoiceNumber: (apt.invoiceNumber as string) || undefined,
        currentAmountPaid: typeof apt.currentAmountPaid === "number" ? apt.currentAmountPaid : undefined,
        currentAmountDue: typeof apt.currentAmountDue === "number" ? apt.currentAmountDue : undefined,
        serviceLinesToRebill,
      };
    });

  return {
    subscriptionId: (rawObj.subscriptionId as string) || "",
    subscriptionCode: (rawObj.subscriptionCode as string) || "",
    status: (rawObj.status as string) || "active",
    isPaid: Boolean(rawObj.isPaid),
    isEligible,
    eligibilityRule,
    ineligibilityReason,
    blockingInconsistencies,
    totalCollected: typeof rawObj.totalCollected === "number" ? rawObj.totalCollected : 0,
    consumedEntitlementCount,
    affectedAppointmentCount,
    expectedRebilledSubtotalIncrease,
    totalRestoredAmount: typeof rawObj.totalRestoredAmount === "number" ? rawObj.totalRestoredAmount : expectedRebilledSubtotalIncrease,
    breakdown: rawObj.breakdown as import("../types/subscription.types").CancellationPreviewData["breakdown"],
    affectedAppointments,
  };
};

/**
 * Preview the impact of cancelling a subscription (Rule A vs Rule B, affected appointments, restored retail prices).
 * GET /subscriptions/:id/cancel/preview
 */
export const getCancellationPreview = async (
  id: string,
): Promise<import("../types/subscription.types").CancellationPreviewData> => {
  const { data } = await apiClient.get<
    import("@/types/api.types").ApiResponse<
      import("../types/subscription.types").RawCancellationPreviewDTO
    >
  >(`/subscriptions/${id}/cancel/preview`, {
    branchScope: "none",
  });
  return mapCancellationPreviewKeys(data.data);
};

export const mapCancellationOperationKeys = (
  raw: Record<string, unknown>,
): import("../types/subscription.types").CancellationOperationData => {
  const rawProgress = (raw.progress || {}) as Record<string, unknown>;

  const totalAppts =
    typeof raw.totalAppointmentCount === "number"
      ? raw.totalAppointmentCount
      : typeof raw.totalAppointments === "number"
        ? raw.totalAppointments
        : typeof rawProgress.totalAppointmentCount === "number"
          ? rawProgress.totalAppointmentCount
          : typeof rawProgress.totalAppointments === "number"
            ? rawProgress.totalAppointments
            : undefined;

  const processedAppts =
    typeof raw.processedAppointmentCount === "number"
      ? raw.processedAppointmentCount
      : typeof raw.processedAppointments === "number"
        ? raw.processedAppointments
        : typeof rawProgress.processedAppointmentCount === "number"
          ? rawProgress.processedAppointmentCount
          : typeof rawProgress.processedAppointments === "number"
            ? rawProgress.processedAppointments
            : undefined;

  const totalUsage =
    typeof raw.totalUsageCount === "number"
      ? raw.totalUsageCount
      : typeof raw.totalUsages === "number"
        ? raw.totalUsages
        : typeof rawProgress.totalUsageCount === "number"
          ? rawProgress.totalUsageCount
          : undefined;

  const processedUsage =
    typeof raw.processedUsageCount === "number"
      ? raw.processedUsageCount
      : typeof raw.processedUsages === "number"
        ? raw.processedUsages
        : typeof rawProgress.processedUsageCount === "number"
          ? rawProgress.processedUsageCount
          : undefined;

  const opErrors = (raw.operationErrors || rawProgress.operationErrors) as
    | Array<{ message: string; recordId?: string }>
    | undefined;

  const failureReason =
    (raw.failureReason as string) ||
    (raw.errorMessage as string) ||
    (opErrors && opErrors.length > 0 ? opErrors[0].message : undefined);

  return {
    operationId:
      (raw.operationId as string) ||
      (raw.id as string) ||
      (raw._id as string) ||
      "",
    subscriptionId: (raw.subscriptionId as string) || "",
    subscriptionCode: (raw.subscriptionCode as string) || undefined,
    status: (raw.status as string) || "pending",
    totalAppointmentCount: totalAppts,
    processedAppointmentCount: processedAppts,
    totalUsageCount: totalUsage,
    processedUsageCount: processedUsage,
    completedBatchIndexes: (raw.completedBatchIndexes ||
      rawProgress.completedBatchIndexes) as number[] | undefined,
    operationErrors: opErrors,
    errorMessage: (raw.errorMessage as string) || failureReason,
    failureReason,
    affectedAppointmentIds:
      (raw.affectedAppointmentIds as string[]) || undefined,
    affectedInvoiceIds: (raw.affectedInvoiceIds as string[]) || undefined,
    createdAt: (raw.createdAt as string) || undefined,
    updatedAt: (raw.updatedAt as string) || undefined,
    completedAt: (raw.completedAt as string) || undefined,
    progress: {
      totalAppointmentCount: totalAppts,
      processedAppointmentCount: processedAppts,
      totalUsageCount: totalUsage,
      processedUsageCount: processedUsage,
      completedBatchIndexes: (raw.completedBatchIndexes ||
        rawProgress.completedBatchIndexes) as number[] | undefined,
      operationErrors: opErrors,
      totalAppointments: totalAppts,
      processedAppointments: processedAppts,
      totalServiceLines: totalUsage,
      processedServiceLines: processedUsage,
    },
  };
};

/**
 * Retrieve status and progress of an asynchronous cancellation operation.
 * GET /subscriptions/:id/cancel/operations/:operationId
 */
export const getCancellationOperation = async (
  subscriptionId: string,
  operationId: string,
): Promise<import("../types/subscription.types").CancellationOperationData> => {
  const { data } = await apiClient.get<
    import("@/types/api.types").ApiResponse<Record<string, unknown>>
  >(`/subscriptions/${subscriptionId}/cancel/operations/${operationId}`, {
    branchScope: "none",
  });
  return mapCancellationOperationKeys(data.data);
};

/**
 * Retry a failed cancellation operation.
 * POST /subscriptions/:id/cancel/operations/:operationId/retry
 */
export const retryCancellationOperation = async (
  subscriptionId: string,
  operationId: string,
): Promise<import("../types/subscription.types").CancellationOperationData> => {
  const { data } = await apiClient.post<
    import("@/types/api.types").ApiResponse<Record<string, unknown>>
  >(
    `/subscriptions/${subscriptionId}/cancel/operations/${operationId}/retry`,
    {},
    {
      branchScope: "none",
    },
  );
  return mapCancellationOperationKeys(data.data);
};

export const cancelSubscription = async (
  id: string,
  payload: CancelSubscriptionPayload,
): Promise<CancelSubscriptionResult> => {
  const headers: Record<string, string> = {};
  if (payload.idempotencyKey) {
    headers["Idempotency-Key"] = payload.idempotencyKey;
  }

  const requestBody: Record<string, unknown> = {
    reason: payload.reason,
  };
  if (payload.forceAsync !== undefined) {
    requestBody.forceAsync = payload.forceAsync;
  }
  if (payload.idempotencyKey) {
    requestBody.idempotencyKey = payload.idempotencyKey;
  }

  const requestConfig: {
    branchScope: "none";
    headers?: Record<string, string>;
  } = {
    branchScope: "none",
  };
  if (Object.keys(headers).length > 0) {
    requestConfig.headers = headers;
  }

  const response = await apiClient.patch<
    import("@/types/api.types").ApiResponse<
      | RawSubscriptionDTO
      | {
          subscription?: RawSubscriptionDTO;
          operationId?: string;
          status?: string;
          isAsync?: boolean;
          [key: string]: unknown;
        }
    >
  >(`/subscriptions/${id}/cancel`, requestBody, requestConfig);

  const isAsync = response.status === 202;
  const rawData = response.data?.data;

  // Handle case where rawData directly represents subscription, operation record, or a nested envelope
  if (rawData && typeof rawData === "object") {
    const rawObj = rawData as Record<string, unknown>;
    const opId = (rawObj.operationId as string) || undefined;
    const opStatus =
      (rawObj.status as string) || (isAsync ? "pending" : "completed");

    // Case 1: Asynchronous processing acceptance (HTTP 202 or pending/processing status)
    if (
      opId &&
      (isAsync || opStatus === "pending" || opStatus === "processing")
    ) {
      const mappedOp = mapCancellationOperationKeys(rawObj);
      return {
        operationId: opId,
        status: opStatus,
        isAsync: true,
        operation: mappedOp,
      };
    }

    // Case 2: Synchronous operation completion returning operation record directly (HTTP 200 with operationId & status: completed)
    const isDirectOperationRecord =
      Boolean(opId) &&
      (opStatus === "completed" ||
        "totalUsageCount" in rawObj ||
        "totalAppointmentCount" in rawObj ||
        "completedBatchIndexes" in rawObj);

    if (isDirectOperationRecord) {
      const mappedOp = mapCancellationOperationKeys(rawObj);
      const subRaw =
        typeof rawObj.subscription === "object" && rawObj.subscription !== null
          ? mapSubscriptionKeys(rawObj.subscription as RawSubscriptionDTO)
          : undefined;

      return {
        subscription: subRaw,
        operationId: opId,
        status: "completed",
        isAsync: false,
        operation: mappedOp,
      };
    }

    // Case 3: Synchronous cancellation returning Subscription object
    // Verify whether rawObj actually contains subscription data (e.g. has customerId, price, or planId, or status === "cancelled")
    // Never manufacture a Subscription object if rawObj does not represent a valid subscription.
    const subObj =
      typeof rawObj.subscription === "object" && rawObj.subscription !== null
        ? (rawObj.subscription as RawSubscriptionDTO)
        : (rawObj as RawSubscriptionDTO);

    const hasSubscriptionMarkers =
      subObj &&
      (Boolean(subObj.id || subObj._id) &&
        (Boolean(subObj.customerId || subObj.payerCustomerId) ||
          typeof subObj.price === "number" ||
          subObj.status === "cancelled" ||
          subObj.status === "active"));

    const mappedSub = hasSubscriptionMarkers ? mapSubscriptionKeys(subObj) : undefined;

    const finalStatus =
      rawObj.operationId && typeof rawObj.status === "string"
        ? (rawObj.status as string)
        : mappedSub && mappedSub.status === "cancelled"
          ? "completed"
          : (rawObj.status as string) || "completed";

    return {
      subscription: mappedSub,
      operationId: opId,
      status: finalStatus,
      isAsync: false,
    };
  }

  return {
    status: isAsync ? "pending" : "completed",
    isAsync,
  };
};

/**
 * Branch-scoped OTP trigger for redemption.
 * Uses the client's current active branch context.
 * Supports optional memberCustomerId to send OTP to the specific beneficiary customer.
 */
export const sendSubscriptionOtp = async (
  id: string,
  payload?: SendOtpPayload,
): Promise<SendOtpResult> => {
  const { data } = await apiClient.post<SendOtpResponse>(
    `/subscriptions/${id}/send-otp`,
    payload && payload.memberCustomerId
      ? { memberCustomerId: payload.memberCustomerId }
      : {},
    {
      branchScope: "current",
    },
  );
  return data.data;
};

/**
 * Branch-scoped redemption of subscription entitlements with OTP.
 * Uses the client's current active branch context.
 */
export const redeemSubscription = async (
  id: string,
  payload: RedeemSubscriptionPayload,
): Promise<{
  subscription: Subscription;
  usageRecords: SubscriptionUsageRecord[];
}> => {
  const { data } = await apiClient.post<RedeemResponse>(
    `/subscriptions/${id}/redeem`,
    payload,
    {
      branchScope: "current",
    },
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
  params: GetSubscriptionUsageParams = {},
): Promise<PaginatedResponse<SubscriptionUsageRecord>> => {
  const { data } = await apiClient.get<SubscriptionUsageResponse>(
    `/subscriptions/${id}/usage`,
    {
      params,
      branchScope: "none",
    },
  );

  return {
    ...data,
    data: (data.data || []).map(mapUsageKeys),
  };
};
