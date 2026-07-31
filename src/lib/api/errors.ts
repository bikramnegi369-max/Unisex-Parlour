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
    return error.response?.data?.message || error.message || fallbackMessage;
  }
  if (error instanceof Error) {
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
