import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createInvoice,
  updateDraftInvoice,
  finalizeInvoice,
  cancelInvoice,
  recordPayment,
  voidPayment,
} from "../api/billing.api";
import type {
  CreateInvoicePayload,
  UpdateDraftInvoicePayload,
  RecordPaymentPayload,
  VoidPaymentPayload,
  CancelInvoicePayload,
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
    },
  });
}
