import axios from "axios";
import { API_BASE_URL } from "../api/axios";
import { setToken, removeToken } from "./token";

let refreshPromise: Promise<string | null> | null = null;

export const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const newToken = data.data?.accessToken || data.accessToken;
      if (newToken) {
        setToken(newToken);
        return newToken;
      }
      throw new Error("No token returned");
    } catch (err) {
      removeToken();
      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};
