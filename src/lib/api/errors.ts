import axios, { AxiosError } from "axios";
import { UseFormSetError, FieldValues, Path } from "react-hook-form";

export interface BackendErrorResponse {
  success: boolean;
  status: string;
  message?: string;
  errors?: Record<string, string | string[]>;
}

export function isBackendError(error: unknown): error is AxiosError<BackendErrorResponse> {
  return axios.isAxiosError(error);
}

/**
 * Extracts a user-friendly message from any error, falling back to a default.
 */
export function getErrorMessage(error: unknown, fallbackMessage = "An unexpected error occurred. Please try again."): string {
  if (isBackendError(error)) {
    const status = error.response?.status;
    if (status === 403) {
      return "You do not have permission to perform this action.";
    }
    if (status === 401) {
      return "Your session has expired. Please log in again.";
    }
    if (status === 404) {
      return "The requested resource could not be found.";
    }
    if (status && status >= 500) {
      return "We are experiencing server issues. Please try again later.";
    }
    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      return "Network connection issues. Please check your internet connectivity.";
    }
    return error.response?.data?.message || error.message || fallbackMessage;
  }
  if (error instanceof Error) {
    if (error.message.includes("status code 403")) {
      return "You do not have permission to perform this action.";
    }
    if (error.message.includes("status code 401")) {
      return "Your session has expired. Please log in again.";
    }
    if (error.message.includes("status code 500")) {
      return "We are experiencing server issues. Please try again later.";
    }
    return error.message;
  }
  return fallbackMessage;
}

/**
 * Maps backend validation errors to React Hook Form errors.
 */
export function mapBackendValidationErrors<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>
): boolean {
  if (!isBackendError(error) || !error.response?.data?.errors) {
    return false;
  }

  const backendErrors = error.response.data.errors;
  let hasMapped = false;

  Object.entries(backendErrors).forEach(([key, value]) => {
    const message = Array.isArray(value) ? value[0] : value;
    if (message) {
      setError(key as Path<TFieldValues>, {
        type: "server",
        message,
      });
      hasMapped = true;
    }
  });

  return hasMapped;
}
