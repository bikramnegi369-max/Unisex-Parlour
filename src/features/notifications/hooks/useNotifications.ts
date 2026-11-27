import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../api/notifications.api";

export const notificationKeys = {
  all: ["notifications"] as const,
  inbox: (params: Record<string, unknown> = {}) => [...notificationKeys.all, "inbox", params] as const,
  list: (params: Record<string, unknown>) => [...notificationKeys.all, "list", params] as const,
  templates: () => [...notificationKeys.all, "templates"] as const,
  automations: () => [...notificationKeys.all, "automations"] as const,
};

export function useNotificationsList(
  params: { page?: number; limit?: number; channel?: string; status?: string; purpose?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationsApi.listNotifications(params),
    enabled,
  });
}

export function useNotificationDetail(id: string | null) {
  return useQuery({
    queryKey: [...notificationKeys.all, "detail", id],
    queryFn: () => notificationsApi.getNotificationById(id!),
    enabled: Boolean(id),
  });
}

export function useNotificationTemplates(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.templates(),
    queryFn: () => notificationsApi.listTemplates(),
    enabled,
  });
}

export function useUpsertTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.upsertTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.templates() }),
  });
}

export function usePreviewTemplate() {
  return useMutation({
    mutationFn: notificationsApi.previewTemplate,
  });
}

export function useNotificationAutomations(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.automations(),
    queryFn: () => notificationsApi.listAutomations(),
    enabled,
  });
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.createAutomation,
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.automations() }),
  });
}

export function useUpdateAutomationSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scheduleCron }: { id: string; scheduleCron: string }) =>
      notificationsApi.updateAutomationSchedule(id, scheduleCron),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.automations() }),
  });
}

export function useToggleAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      notificationsApi.toggleAutomation(id, isEnabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.automations() }),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.deleteAutomation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.automations() }),
  });
}

export function useNotificationInbox(
  params: { cursor?: string; page?: number; limit?: number } = { page: 1, limit: 8 },
  enabled = true,
) {
  return useQuery({
    queryKey: notificationKeys.inbox(params),
    queryFn: () => notificationsApi.getInbox(params),
    enabled,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export function useInfiniteNotificationInbox(limit = 8, enabled = true) {
  return useInfiniteQuery({
    queryKey: [...notificationKeys.all, "inbox-infinite", limit] as const,
    queryFn: ({ pageParam }) =>
      notificationsApi.getInbox({
        limit,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasMore ? (lastPage.pagination?.nextCursor ?? undefined) : undefined,
    enabled,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export function useMarkInboxItemRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markInboxItemRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useMarkAllInboxRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllInboxRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
