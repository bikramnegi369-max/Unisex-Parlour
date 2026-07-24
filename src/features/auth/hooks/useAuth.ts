"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/axios";
import { UserSession } from "@/lib/permissions";
import { setToken, setRefreshToken, removeToken, removeRefreshToken } from "@/lib/auth/token";
import { useRouter } from "next/navigation";

// Mock User for development when backend is unplugged
const MOCK_USER: UserSession = {
  id: "owner-1",
  name: "John Doe",
  email: "owner@parlour.com",
  role: "Owner",
  permissions: [],
};

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Active User session query
  const { data: user, isLoading, isError } = useQuery<UserSession | null>({
    queryKey: ["auth-user"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get("/auth/me");
        return data.data || data;
      } catch (err) {
        // Return mock user in development if API is unplugged
        if (process.env.NODE_ENV === "development") {
          return MOCK_USER;
        }
        throw err;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: Record<string, string>) => {
      const { data } = await apiClient.post("/auth/login", credentials);
      return data.data || data;
    },
    onSuccess: (data) => {
      const token = data.accessToken || data.token;
      const refresh = data.refreshToken;
      if (token) setToken(token);
      if (refresh) setRefreshToken(refresh);
      queryClient.setQueryData(["auth-user"], data.user || MOCK_USER);
      router.push("/dashboard");
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await apiClient.post("/auth/logout");
      } catch (err) {
        // Silent catch if API is unreachable
      }
    },
    onSuccess: () => {
      removeToken();
      removeRefreshToken();
      queryClient.setQueryData(["auth-user"], null);
      router.push("/login");
    },
  });

  return {
    user: user || null,
    isAuthenticated: !!user,
    isLoading,
    isError,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
