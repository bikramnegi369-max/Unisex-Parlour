// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../hooks/useAuth";
import { apiClient } from "@/lib/api/axios";
import { getToken, setToken, removeToken } from "@/lib/auth/token";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock token storage
vi.mock("@/lib/auth/token", () => {
  let token: string | null = null;
  return {
    getToken: vi.fn(() => token),
    setToken: vi.fn((t) => { token = t; }),
    removeToken: vi.fn(() => { token = null; }),
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
    removeToken();
  });

  it("Normal Login: stores token and redirects to /dashboard", async () => {
    const mockUserResponse = { success: true, data: { id: "usr_normal" } };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockUserResponse });
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        accessToken: "access_token_123",
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.login({ email: "test@example.com", password: "password" });
    });

    expect(setToken).toHaveBeenCalledWith("access_token_123");
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
    expect(sessionStorage.getItem("erp_activation_token")).toBeNull();
  });

  it("First Login: requireActivation === true redirects to /activate/otp and does not authenticate", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        requireActivation: true,
        activationToken: "activation_token_123",
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.login({ email: "first@example.com", password: "password" });
    });

    expect(setToken).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/activate/otp");
    expect(sessionStorage.getItem("erp_activation_token")).toBe("activation_token_123");
  });

  it("OTP Send: calls /auth/activate/otp/send with activation token in Authorization header", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { message: "sent" } });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.sendOtp("activation_token_123");
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
  });

  it("OTP Verify: calls /auth/activate/otp/verify with code and returns passwordChangeToken", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        data: {
          message: "OTP verified successfully",
          passwordChangeToken: "pwd_change_token_123",
        },
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    const response = await act(async () => {
      return await result.current.verifyOtp({
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

  it("Password Change: calls /auth/activate/change-password with change token and updates password", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { message: "success" } });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.activateChangePassword({
        passwordChangeToken: "pwd_change_token_123",
        password: "newSecurePassword123",
      });
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/auth/activate/change-password",
      { password: "newSecurePassword123" },
      {
        headers: {
          Authorization: "Bearer pwd_change_token_123",
        },
      }
    );
  });
});
