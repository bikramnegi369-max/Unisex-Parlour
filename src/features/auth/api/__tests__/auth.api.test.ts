// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAuthMe,
  loginApi,
  sendOtpApi,
  verifyOtpApi,
  activateChangePasswordApi,
  logoutApi,
  AuthApiError,
} from "../auth.api";
import { apiClient } from "@/lib/api/axios";
import { getToken } from "@/lib/auth/token";
import { refreshAccessToken } from "@/lib/auth/refresh";

vi.mock("@/lib/auth/token", () => ({
  getToken: vi.fn(),
  setToken: vi.fn(),
  removeToken: vi.fn(),
}));

vi.mock("@/lib/auth/refresh", () => ({
  refreshAccessToken: vi.fn(),
}));

vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("Auth API Layer (auth.api.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAuthMe", () => {
    it("returns user session when token exists", async () => {
      vi.mocked(getToken).mockReturnValue("valid_token");
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { data: { id: "user_1", email: "user@example.com" } },
      });

      const res = await getAuthMe();
      expect(apiClient.get).toHaveBeenCalledWith("/auth/me");
      expect(res).toEqual({ id: "user_1", email: "user@example.com" });
    });

    it("attempts refreshAccessToken when token is missing and returns session if refreshed", async () => {
      vi.mocked(getToken).mockReturnValue(null);
      vi.mocked(refreshAccessToken).mockResolvedValueOnce("new_refreshed_token");
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { data: { id: "user_refreshed" } },
      });

      const res = await getAuthMe();
      expect(refreshAccessToken).toHaveBeenCalled();
      expect(apiClient.get).toHaveBeenCalledWith("/auth/me");
      expect(res).toEqual({ id: "user_refreshed" });
    });

    it("returns null if no token is present and refresh fails", async () => {
      vi.mocked(getToken).mockReturnValue(null);
      vi.mocked(refreshAccessToken).mockRejectedValueOnce(new Error("No refresh cookie"));

      const res = await getAuthMe();
      expect(res).toBeNull();
    });
  });

  describe("loginApi", () => {
    it("calls POST /auth/login with credentials", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { data: { accessToken: "token_123" } },
      });

      const res = await loginApi({ email: "test@example.com", password: "secret" });
      expect(apiClient.post).toHaveBeenCalledWith("/auth/login", {
        email: "test@example.com",
        password: "secret",
      });
      expect(res).toEqual({ accessToken: "token_123" });
    });
  });

  describe("sendOtpApi", () => {
    it("sends Bearer activationToken in header", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { data: { expiresIn: 300, resendAfter: 60 } },
      });

      const res = await sendOtpApi("act_token_123");
      expect(apiClient.post).toHaveBeenCalledWith(
        "/auth/activate/otp/send",
        {},
        {
          authContext: "activation",
          headers: { Authorization: "Bearer act_token_123" },
        }
      );
      expect(res).toEqual({ expiresIn: 300, resendAfter: 60 });
    });
  });

  describe("verifyOtpApi", () => {
    it("sends OTP and activationToken", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { data: { passwordChangeToken: "pwd_token" } },
      });

      const res = await verifyOtpApi({ activationToken: "act_token", otp: "123456" });
      expect(apiClient.post).toHaveBeenCalledWith(
        "/auth/activate/otp/verify",
        { otp: "123456" },
        {
          authContext: "activation",
          headers: { Authorization: "Bearer act_token" },
        }
      );
      expect(res).toEqual({ passwordChangeToken: "pwd_token" });
    });
  });

  describe("activateChangePasswordApi", () => {
    it("sends new password and passwordChangeToken", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { data: { accessToken: "new_acc_token" } },
      });

      const res = await activateChangePasswordApi({
        passwordChangeToken: "pwd_token",
        password: "NewPassword1!",
      });
      expect(apiClient.post).toHaveBeenCalledWith(
        "/auth/activate/change-password",
        { password: "NewPassword1!" },
        {
          authContext: "password-change",
          headers: { Authorization: "Bearer pwd_token" },
        }
      );
      expect(res).toEqual({ accessToken: "new_acc_token" });
    });
  });

  describe("logoutApi", () => {
    it("posts to /auth/logout", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({});
      await logoutApi();
      expect(apiClient.post).toHaveBeenCalledWith("/auth/logout");
    });
  });

  describe("AuthApiError", () => {
    it("constructs error object with message, status, and code", () => {
      const err = new AuthApiError("Test error", 400, "BAD_REQUEST");
      expect(err.message).toBe("Test error");
      expect(err.status).toBe(400);
      expect(err.code).toBe("BAD_REQUEST");
    });
  });
});
