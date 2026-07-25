"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/axios";
import { UserSession } from "@/lib/permissions";
import { setToken, removeToken, getToken } from "@/lib/auth/token";
import { useRouter } from "next/navigation";
import axios from "axios";

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Active User session query
  const { data: user, isLoading, isError } = useQuery<UserSession | null>({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const token = getToken();
      if (!token) {
        return null;
      }
      try {
        const { data } = await apiClient.get("/auth/me");
        return data.data || data;
      } catch (err) {
        const errorMessage =
          axios.isAxiosError(err) && err.response?.data?.message
            ? err.response.data.message
            : "Failed to fetch user session";
        throw new Error(errorMessage);
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: Record<string, string>) => {
      try {
        const { data } = await apiClient.post("/auth/login", credentials);
        return data.data || data;
      } catch (err) {
        const errorMessage =
          axios.isAxiosError(err) && err.response?.data?.message
            ? err.response.data.message
            : "Invalid credentials or login failed";
        throw new Error(errorMessage);
      }
    },
    onSuccess: (data) => {
      const token = data.accessToken || data.token;
      if (token) setToken(token);
      
      // Invalidate the auth-user query so that it is forced to fetch /auth/me on dashboard mount
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
      router.push("/dashboard");
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await apiClient.post("/auth/logout");
      } catch {
        // Silent catch if API is unreachable
      }
    },
    onSuccess: () => {
      removeToken();
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

