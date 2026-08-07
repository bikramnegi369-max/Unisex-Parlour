// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../hooks/useAuth";
import { apiClient } from "@/lib/api/axios";
import { setToken, removeToken } from "@/lib/auth/token";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  getActivationToken,
  getPasswordChangeToken,
  clearAllActivationTokens,
} from "../utils/activation-storage";
import { passwordSchema } from "@/app/(auth)/activate/password/page";

// Mock token storage
vi.mock("@/lib/auth/token", () => {
  let token: string | null = null;
  return {
    getToken: vi.fn(() => token),
    setToken: vi.fn((t) => {
      token = t;
    }),
    removeToken: vi.fn(() => {
      token = null;
    }),
    getRefreshToken: vi.fn(() => null),
    setRefreshToken: vi.fn(),
    removeRefreshToken: vi.fn(),
  };
});

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock axios client
vi.mock("@/lib/api/axios", () => {
  const mockClient = {
    get: vi.fn(),
    post: vi.fn(),
  };
  return {
    apiClient: mockClient,
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("Authentication First-Login Activation Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    removeToken();
    clearAllActivationTokens();
  });

  describe("Backend Password Validation Policy Alignment", () => {
    it("rejects password shorter than 8 characters", () => {
      const res = passwordSchema.safeParse({ password: "P1!", confirmPassword: "P1!" });
      expect(res.success).toBe(false);
    });

    it("rejects password without an uppercase letter", () => {
      const res = passwordSchema.safeParse({ password: "lowercase123!", confirmPassword: "lowercase123!" });
      expect(res.success).toBe(false);
    });

    it("rejects password without a lowercase letter", () => {
      const res = passwordSchema.safeParse({ password: "UPPERCASE123!", confirmPassword: "UPPERCASE123!" });
      expect(res.success).toBe(false);
    });

    it("rejects password without a number", () => {
      const res = passwordSchema.safeParse({ password: "NoNumberSpecial!", confirmPassword: "NoNumberSpecial!" });
      expect(res.success).toBe(false);
    });

    it("rejects password without a special character", () => {
      const res = passwordSchema.safeParse({ password: "NoSpecialNumber123", confirmPassword: "NoSpecialNumber123" });
      expect(res.success).toBe(false);
    });

    it("accepts valid backend-compatible password", () => {
      const res = passwordSchema.safeParse({
        password: "NewSecurePassword123!",
        confirmPassword: "NewSecurePassword123!",
      });
      expect(res.success).toBe(true);
    });
  });

  describe("Login & Activation State Machine", () => {
    it("Normal Login: stores token, clears activation tokens, and redirects to /dashboard", async () => {
      const mockUserResponse = { success: true, data: { id: "usr_normal" } };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockUserResponse });
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          data: {
            requireActivation: false,
            accessToken: "access_token_123",
          },
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.login({ email: "test@example.com", password: "password" });
      });

      expect(setToken).toHaveBeenCalledWith("access_token_123");
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
      expect(getActivationToken()).toBeNull();
    });

    it("First Login: requireActivation === true stores activationToken in sessionStorage and redirects to /activate/otp", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          data: {
            requireActivation: true,
            activationToken: "activation_token_123",
          },
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.login({ email: "first@example.com", password: "password" });
      });

      expect(setToken).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/activate/otp");
      expect(getActivationToken()).toBe("activation_token_123");
    });

    it("OTP Send: sends Bearer activationToken and returns backend timer values", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          data: {
            success: true,
            message: "Activation OTP sent successfully",
            expiresIn: 300,
            resendAfter: 60,
          },
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      let response: any;
      await act(async () => {
        response = await result.current.sendOtp("activation_token_123");
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        "/auth/activate/otp/send",
        {},
        {
          headers: {
            Authorization: "Bearer activation_token_123",
          },
        }
      );
      expect(response.expiresIn).toBe(300);
      expect(response.resendAfter).toBe(60);
    });

    it("OTP Verify: verifies 6-digit code with Bearer activationToken", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          data: {
            message: "OTP verified successfully",
            passwordChangeToken: "pwd_change_token_123",
          },
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      let response: any;
      await act(async () => {
        response = await result.current.verifyOtp({
          activationToken: "activation_token_123",
          otp: "123456",
        });
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        "/auth/activate/otp/verify",
        { otp: "123456" },
        {
          headers: {
            Authorization: "Bearer activation_token_123",
          },
        }
      );
      expect(response.passwordChangeToken).toBe("pwd_change_token_123");
    });

    it("Password Change: sends Bearer passwordChangeToken, sets accessToken, and clears activation tokens", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          data: {
            success: true,
            message: "Password updated successfully",
            accessToken: "activated_access_token_789",
          },
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.activateChangePassword({
          passwordChangeToken: "pwd_change_token_123",
          password: "NewSecurePassword123!",
        });
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        "/auth/activate/change-password",
        { password: "NewSecurePassword123!" },
        {
          headers: {
            Authorization: "Bearer pwd_change_token_123",
          },
        }
      );
      expect(setToken).toHaveBeenCalledWith("activated_access_token_789");
      expect(getActivationToken()).toBeNull();
      expect(getPasswordChangeToken()).toBeNull();
    });

    it("Security Verification: Refresh token is NEVER stored in localStorage or sessionStorage and only accessToken is installed", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          data: {
            accessToken: "activated_access_token_789",
            refreshToken: "http_only_cookie_value_should_be_ignored",
          },
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.activateChangePassword({
          passwordChangeToken: "pwd_change_token_123",
          password: "NewSecurePassword123!",
        });
      });

      expect(setToken).toHaveBeenCalledWith("activated_access_token_789");
      expect(localStorage.getItem("refreshToken")).toBeNull();
      expect(sessionStorage.getItem("refreshToken")).toBeNull();
      expect(localStorage.getItem("erp_refresh_token")).toBeNull();
      expect(sessionStorage.getItem("erp_refresh_token")).toBeNull();
    });
  });
});
