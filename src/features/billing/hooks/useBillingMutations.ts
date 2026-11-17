import { useMutation, useQueryClient } from "@tanstack/react-query";
import { broadcastCrossTabInvalidation } from "@/lib/api/crossTabSync";
import {
  createInvoice,
  updateDraftInvoice,
  correctInvoiceAttribution,
  finalizeInvoice,
  cancelInvoice,
  recordPayment,
  voidPayment,
  applyInvoiceDiscount,
  modifyInvoiceDiscount,
  removeInvoiceDiscount,
  returnInvoiceItems,
  refundUnusedMembership,
  applyCouponToInvoice,
  removeCouponFromInvoice,
  confirmWalkInServiceFulfillment,
} from "../api/billing.api";
import type {
  CreateInvoicePayload,
  UpdateDraftInvoicePayload,
  RecordPaymentPayload,
  VoidPaymentPayload,
  CancelInvoicePayload,
  ApplyDiscountPayload,
  ModifyDiscountPayload,
  RemoveDiscountPayload,
  ReturnInvoiceItemsPayload,
  RefundUnusedMembershipPayload,
  InvoiceAttributionCorrectionPayload,
} from "../types/billing.types";

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateInvoicePayload) => createInvoice(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === "invoices" ||
            key === "checkout-queue" ||
            key === "appointments" ||
            key === "appointment"
          );
        },
      });
      broadcastCrossTabInvalidation("appointments");
      broadcastCrossTabInvalidation("invoices");
    },
  });
}

export function useUpdateDraftInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateDraftInvoicePayload;
    }) => updateDraftInvoice(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === "invoices" ||
            (key === "invoice" &&
              (query.queryKey.includes(variables.id) ||
                query.queryKey.some(
                  (k) => Array.isArray(k) && k.includes(variables.id)
                )))
          );
        },
      });
    },
  });
}

export function useCorrectInvoiceAttribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: InvoiceAttributionCorrectionPayload;
    }) => correctInvoiceAttribution(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === "invoices" ||
            (key === "invoice" &&
              (query.queryKey.includes(variables.id) ||
                query.queryKey.some(
                  (entry) =>
                    Array.isArray(entry) && entry.includes(variables.id),
                )))
          );
        },
      });
    },
  });
}

export function useConfirmWalkInServiceFulfillment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmWalkInServiceFulfillment,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === "invoices" ||
            key === "incentives" ||
            (key === "invoice" && query.queryKey.includes(variables.invoiceId))
          );
        },
      });
    },
  });
}

export function useFinalizeInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: string | { id: string; branchId?: string }) => {
      const id = typeof args === "string" ? args : args.id;
      const branchId = typeof args === "object" ? args.branchId : undefined;
      return finalizeInvoice(id, branchId);
    },
    onSuccess: (_data, args) => {
      const id = typeof args === "string" ? args : args.id;
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === "invoices" ||
            key === "customers" ||
            key === "customer" ||
            key === "loyalty-ledger" ||
            (key === "invoice" &&
              (query.queryKey.includes(id) ||
                query.queryKey.some((k) => Array.isArray(k) && k.includes(id))))
          );
        },
      });
    },
  });
}

export function useCancelInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload?: CancelInvoicePayload;
    }) => cancelInvoice(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === "invoices" ||
            key === "checkout-queue" ||
            key === "customers" ||
            key === "customer" ||
            key === "loyalty-ledger" ||
            (key === "invoice" &&
              (query.queryKey.includes(variables.id) ||
                query.queryKey.some(
                  (k) => Array.isArray(k) && k.includes(variables.id)
                )))
          );
        },
      });
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      payload,
    }: {
      invoiceId: string;
      payload: RecordPaymentPayload;
    }) => recordPayment(invoiceId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === "invoices" ||
            key === "subscriptions" ||
            key === "appointments" ||
            key === "appointment" ||
            key === "customers" ||
            key === "customer" ||
            key === "loyalty-ledger" ||
            (key === "invoice" &&
              (query.queryKey.includes(variables.invoiceId) ||
                query.queryKey.some(
                  (k) => Array.isArray(k) && k.includes(variables.invoiceId)
                ))) ||
            (key === "invoice-payments" &&
              (query.queryKey.includes(variables.invoiceId) ||
                query.queryKey.some(
                  (k) => Array.isArray(k) && k.includes(variables.invoiceId)
                )))
          );
        },
      });
      broadcastCrossTabInvalidation("appointments");
      broadcastCrossTabInvalidation("invoices");
    },
  });
}

export function useVoidPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      paymentId,
      payload,
    }: {
      paymentId: string;
      invoiceId: string;
      payload: VoidPaymentPayload;
    }) => voidPayment(paymentId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === "invoices" ||
            key === "subscriptions" ||
            key === "appointments" ||
            key === "appointment" ||
            key === "customers" ||
            key === "customer" ||
            key === "loyalty-ledger" ||
            (key === "invoice" &&
              (query.queryKey.includes(variables.invoiceId) ||
                query.queryKey.some(
                  (k) => Array.isArray(k) && k.includes(variables.invoiceId)
                ))) ||
            (key === "invoice-payments" &&
              (query.queryKey.includes(variables.invoiceId) ||
                query.queryKey.some(
                  (k) => Array.isArray(k) && k.includes(variables.invoiceId)
                )))
          );
        },
      });
      broadcastCrossTabInvalidation("appointments");
      broadcastCrossTabInvalidation("invoices");
    },
  });
}

export function useApplyInvoiceDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      payload,
    }: {
      invoiceId: string;
      payload: ApplyDiscountPayload;
    }) => applyInvoiceDiscount(invoiceId, payload),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === "invoices" ||
            key === "checkout-queue" ||
            (key === "invoice" &&
              (query.queryKey.includes(variables.invoiceId) ||
                query.queryKey.some((k) => Array.isArray(k) && k.includes(variables.invoiceId)))) ||
            (key === "invoice-discount-history" &&
              (query.queryKey.includes(variables.invoiceId) ||
                query.queryKey.some((k) => Array.isArray(k) && k.includes(variables.invoiceId))))
          );
        },
      });
      if (result.invoice) {
        queryClient.setQueriesData(
          {
            predicate: (query) =>
              query.queryKey[0] === "invoice" &&
              (query.queryKey.includes(variables.invoiceId) ||
                query.queryKey.some((k) => Array.isArray(k) && k.includes(variables.invoiceId))),
          },
          () => result.invoice
        );
      }
    },
  });
}

export function useModifyInvoiceDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      discountId,
      payload,
    }: {
      invoiceId: string;
      discountId: string;
      payload: ModifyDiscountPayload;
    }) => modifyInvoiceDiscount(invoiceId, discountId, payload),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === "invoices" ||
            key === "checkout-queue" ||
            (key === "invoice" &&
              (query.queryKey.includes(variables.invoiceId) ||
                query.queryKey.some((k) => Array.isArray(k) && k.includes(variables.invoiceId)))) ||
            (key === "invoice-discount-history" &&
              (query.queryKey.includes(variables.invoiceId) ||
                query.queryKey.some((k) => Array.isArray(k) && k.includes(variables.invoiceId))))
          );
        },
      });
      if (result.invoice) {
        queryClient.setQueriesData(
          {
            predicate: (query) =>
              query.queryKey[0] === "invoice" &&
              (query.queryKey.includes(variables.invoiceId) ||
                query.queryKey.some((k) => Array.isArray(k) && k.includes(variables.invoiceId))),
          },
          () => result.invoice
        );
      }
    },
  });
}

export function useRemoveInvoiceDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      discountId,
      payload,
    }: {
      invoiceId: string;
      discountId: string;
      payload: RemoveDiscountPayload;
    }) => removeInvoiceDiscount(invoiceId, discountId, payload),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === "invoices" ||
            key === "checkout-queue" ||
            (key === "invoice" &&
              (query.queryKey.includes(variables.invoiceId) ||
                query.queryKey.some((k) => Array.isArray(k) && k.includes(variables.invoiceId)))) ||
            (key === "invoice-discount-history" &&
              (query.queryKey.includes(variables.invoiceId) ||
                query.queryKey.some((k) => Array.isArray(k) && k.includes(variables.invoiceId))))
          );
        },
      });
      if (result.invoice) {
        queryClient.setQueriesData(
          {
            predicate: (query) =>
              query.queryKey[0] === "invoice" &&
              (query.queryKey.includes(variables.invoiceId) ||
                query.queryKey.some((k) => Array.isArray(k) && k.includes(variables.invoiceId))),
          },
          () => result.invoice
        );
      }
    },
  });
}

export function useReturnInvoiceItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      payload,
    }: {
      invoiceId: string;
      payload: ReturnInvoiceItemsPayload;
    }) => returnInvoiceItems(invoiceId, payload),
    onSuccess: (updatedInvoice, variables) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === "invoices" ||
            key === "checkout-queue" ||
            key === "inventory-stock" ||
            key === "inventory-movements" ||
            (key === "invoice" &&
              (query.queryKey.includes(variables.invoiceId) ||
                query.queryKey.some((k) => Array.isArray(k) && k.includes(variables.invoiceId))))
          );
        },
      });
      broadcastCrossTabInvalidation("invoices");
      broadcastCrossTabInvalidation("inventory");
      if (updatedInvoice) {
        queryClient.setQueriesData(
          {
            predicate: (query) =>
              query.queryKey[0] === "invoice" &&
              (query.queryKey.includes(variables.invoiceId) ||
                query.queryKey.some((k) => Array.isArray(k) && k.includes(variables.invoiceId))),
          },
          () => updatedInvoice
        );
      }
    },
  });
}

export function useRefundUnusedMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      payload,
    }: {
      invoiceId: string;
      payload: RefundUnusedMembershipPayload;
    }) => refundUnusedMembership(invoiceId, payload),
    onSuccess: (updatedInvoice, variables) => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "invoices" ||
          (query.queryKey[0] === "invoice" &&
            (query.queryKey.includes(variables.invoiceId) ||
              query.queryKey.some(
                (key) => Array.isArray(key) && key.includes(variables.invoiceId),
              ))),
      });
      broadcastCrossTabInvalidation("invoices");
      queryClient.setQueriesData(
        {
          predicate: (query) =>
            query.queryKey[0] === "invoice" &&
            (query.queryKey.includes(variables.invoiceId) ||
              query.queryKey.some(
                (key) => Array.isArray(key) && key.includes(variables.invoiceId),
              )),
        },
        () => updatedInvoice,
      );
    },
  });
}

export function useApplyCouponToInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      code,
      branchId,
    }: {
      invoiceId: string;
      code: string;
      branchId?: string;
    }) => applyCouponToInvoice(invoiceId, code, branchId),
    onSuccess: (updatedInvoice, variables) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === "invoices" ||
            key === "checkout-queue" ||
            (key === "invoice" &&
              (query.queryKey.includes(variables.invoiceId) ||
                query.queryKey.some((k) => Array.isArray(k) && k.includes(variables.invoiceId))))
          );
        },
      });
      broadcastCrossTabInvalidation("invoices");
      if (updatedInvoice) {
        queryClient.setQueriesData(
          {
            predicate: (query) =>
              query.queryKey[0] === "invoice" &&
              (query.queryKey.includes(variables.invoiceId) ||
                query.queryKey.some((k) => Array.isArray(k) && k.includes(variables.invoiceId))),
          },
          () => updatedInvoice
        );
      }
    },
  });
}

export function useRemoveCouponFromInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      branchId,
    }: {
      invoiceId: string;
      branchId?: string;
    }) => removeCouponFromInvoice(invoiceId, branchId),
    onSuccess: (updatedInvoice, variables) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === "invoices" ||
            key === "checkout-queue" ||
            (key === "invoice" &&
              (query.queryKey.includes(variables.invoiceId) ||
                query.queryKey.some((k) => Array.isArray(k) && k.includes(variables.invoiceId))))
          );
        },
      });
      broadcastCrossTabInvalidation("invoices");
      if (updatedInvoice) {
        queryClient.setQueriesData(
          {
            predicate: (query) =>
              query.queryKey[0] === "invoice" &&
              (query.queryKey.includes(variables.invoiceId) ||
                query.queryKey.some((k) => Array.isArray(k) && k.includes(variables.invoiceId))),
          },
          () => updatedInvoice
        );
      }
    },
  });
}
