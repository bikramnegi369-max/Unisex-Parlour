import axios from "axios";
import { getToken, removeToken, setToken, removeRefreshToken } from "../auth/token";

declare module "axios" {
  export interface AxiosRequestConfig {
    branchScope?: "current" | "organization" | { type: "branch"; branchId: string };
  }
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    // Inject auth token
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Explicit branch scoping check based on branchScope config parameter
    if (config.branchScope === "current") {
      if (typeof window !== "undefined") {
        const branchId = localStorage.getItem("erp_selected_branch_id");
        // "all" sentinel maps to Organization Scope, which must not send a branch ID
        if (branchId && branchId !== "all" && config.headers) {
          config.headers["X-Branch-Id"] = branchId;
        } else {
          // branchScope: "current" requires a valid active branch selection
          throw new Error("Branch-scoped request failed: No active branch selected.");
        }
      }
    } else if (config.branchScope && typeof config.branchScope === "object" && config.branchScope.type === "branch") {
      if (config.headers) {
        config.headers["X-Branch-Id"] = config.branchScope.branchId;
      }
    }
    // "organization" scope or omitted (default) does not append X-Branch-Id

    return config;
  },
  (error) => Promise.reject(error)
);


let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Do not attempt to refresh if the request itself was an authentication endpoint
    const isAuthRequest = 
      originalRequest.url?.includes("/auth/login") || 
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/logout");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // The backend expects the HttpOnly refresh token cookie.
        // withCredentials: true ensures the cookie is transmitted automatically.
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = data.data?.accessToken || data.accessToken;
        
        if (newToken) {
          setToken(newToken);
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } else {
          throw new Error("No token returned");
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        removeToken();
        removeRefreshToken();
        if (typeof window !== 'undefined' && window.location.pathname !== "/login") {
            window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

