const ACTIVATION_TOKEN_KEY = "erp_activation_token";
const PASSWORD_CHANGE_TOKEN_KEY = "erp_password_change_token";

export const getActivationToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACTIVATION_TOKEN_KEY);
};

export const setActivationToken = (token: string): void => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ACTIVATION_TOKEN_KEY, token);
};

export const clearActivationToken = (): void => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACTIVATION_TOKEN_KEY);
};

export const getPasswordChangeToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(PASSWORD_CHANGE_TOKEN_KEY);
};

export const setPasswordChangeToken = (token: string): void => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PASSWORD_CHANGE_TOKEN_KEY, token);
};

export const clearPasswordChangeToken = (): void => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PASSWORD_CHANGE_TOKEN_KEY);
};

export const clearAllActivationTokens = (): void => {
  clearActivationToken();
  clearPasswordChangeToken();
};
