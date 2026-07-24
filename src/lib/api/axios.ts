import axios from "axios";
import { getToken, removeToken, getRefreshToken, setToken, removeRefreshToken } from "../auth/token";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    // Inject auth token
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Inject active branch ID so the backend can scope the request.
    // API CONTRACT: using X-Branch-Id header — change here if backend prefers
    // a query param (?branchId=) or route segment (/branches/:id/...) instead.
    // We read directly from localStorage to avoid a circular Redux import.
    if (typeof window !== "undefined") {
      const branchId = localStorage.getItem("erp_selected_branch_id");
      if (branchId && config.headers) {
        config.headers["X-Branch-Id"] = branchId;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);


let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
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
    if (error.response?.status === 401 && !originalRequest._retry) {
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

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        // If no refresh token, force logout
        removeToken();
        removeRefreshToken();
        if (typeof window !== 'undefined') {
            window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });
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
        if (typeof window !== 'undefined') {
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
