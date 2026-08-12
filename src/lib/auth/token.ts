let inMemoryAccessToken: string | null = null;

export const getToken = (): string | null => {
  return inMemoryAccessToken;
};

export const setToken = (token: string): void => {
  inMemoryAccessToken = token;
};

export const removeToken = (): void => {
  inMemoryAccessToken = null;
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
export const setRefreshToken = () => {
  // No-op
};

/**
 * @deprecated Refresh token is now stored in a secure HttpOnly cookie set by the backend.
 */
export const removeRefreshToken = () => {
  // No-op
};
