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

import { store } from "@/store";
import { queryClient } from "./queryClient";
import { UserSession } from "../permissions";

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
        // Retrieve branch ID from Redux store, falling back to localStorage
        let branchId = store.getState().branch.currentBranchId;
        if (branchId === null || branchId === undefined) {
          const stored = localStorage.getItem("erp_selected_branch_id");
          branchId = stored === "all" ? null : stored;
        }

        // Sanitize 'all' value
        if (branchId === "all") {
          branchId = null;
        }

        const user = queryClient.getQueryData<UserSession>(["auth-user"]);
        const isOrgWide = user?.hasOrgWideAccess === true;

        if (branchId) {
          if (config.headers) {
            config.headers["X-Branch-Id"] = branchId;
          }
        } else {
          // No branchId active (All Branches scope / Consolidated)
          if (!isOrgWide) {
            // branchScope: "current" requires a valid active branch selection for branch-scoped users
            throw new Error("Branch-scoped request failed: No active branch selected.");
          }
          // Org-wide user can query org-wide by omitting X-Branch-Id header
        }
      }
    } else if (config.branchScope && typeof config.branchScope === "object" && config.branchScope.type === "branch") {
      const targetBranchId = config.branchScope.branchId;
      if (targetBranchId && targetBranchId !== "all") {
        if (config.headers) {
          config.headers["X-Branch-Id"] = targetBranchId;
        }
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
        console.log("Axios error : ", refreshError)
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

