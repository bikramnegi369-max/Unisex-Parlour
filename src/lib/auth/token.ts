const ACCESS_TOKEN_KEY = "erp_access_token";

// Helper to set a cookie with security attributes
const setCookie = (name: string, value: string, days = 7) => {
  if (typeof window === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure = window.location.protocol === "https:" ? "Secure;" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; ${secure} SameSite=Strict`;
};

// Helper to get a cookie value
const getCookie = (name: string): string | null => {
  if (typeof window === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
};

// Helper to delete a cookie
const deleteCookie = (name: string) => {
  if (typeof window === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
};

export const getToken = (): string | null => {
  return getCookie(ACCESS_TOKEN_KEY);
};

export const setToken = (token: string) => {
  setCookie(ACCESS_TOKEN_KEY, token, 7); // 7 days expiry
};

export const removeToken = () => {
  deleteCookie(ACCESS_TOKEN_KEY);
};

/**
 * @deprecated Refresh token is now stored in a secure HttpOnly cookie set by the backend.
 * Client-side code does not need to get, set, or delete it directly.
 */
export const getRefreshToken = (): string | null => {
  return null;
};

/**
 * @deprecated Refresh token is now stored in a secure HttpOnly cookie set by the backend.
 */
export const setRefreshToken = (_token: string) => {
  // No-op
};

/**
 * @deprecated Refresh token is now stored in a secure HttpOnly cookie set by the backend.
 */
export const removeRefreshToken = () => {
  // No-op
};

