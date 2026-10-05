import axios from "axios";
import { apiClient } from "./axios";

export interface PresignedUploadSignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  tags?: string;
  uploadUrl: string;
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  bytes: number;
  format: string;
  width: number;
  height: number;
}

export interface UploadImageOptions {
  folder?: string;
  onProgress?: (progressPercent: number) => void;
  signal?: AbortSignal;
}

/**
 * Requests an HMAC-SHA1 signature and upload params from Express backend
 */
export async function getUploadSignature(folder: string = "employees/avatars"): Promise<PresignedUploadSignature> {
  const response = await apiClient.post<{ success: boolean; data: PresignedUploadSignature }>("/upload/sign", {
    folder,
  });
  return response.data.data;
}

/**
 * Uploads a file directly to Cloudinary edge servers with signed credentials
 */
export async function uploadDirectToCloudinary(
  file: File,
  signatureData: PresignedUploadSignature,
  options?: { onProgress?: (progressPercent: number) => void; signal?: AbortSignal }
): Promise<CloudinaryUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signatureData.apiKey);
  formData.append("timestamp", signatureData.timestamp.toString());
  formData.append("signature", signatureData.signature);
  formData.append("folder", signatureData.folder);
  formData.append("public_id", signatureData.publicId);

  if (signatureData.tags) {
    formData.append("tags", signatureData.tags);
  }

  // Direct upload to Cloudinary using isolated axios (not apiClient so it doesn't leak backend headers/auth)
  const response = await axios.post<CloudinaryUploadResult>(signatureData.uploadUrl, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    signal: options?.signal,
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && options?.onProgress) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        options.onProgress(percent);
      }
    },
  });

  return response.data;
}

/**
 * Proactively notifies Express to delete/purge an abandoned or replaced upload
 */
export async function cleanupUploadedAsset(publicIdOrUrl: string): Promise<void> {
  try {
    const isUrl = publicIdOrUrl.startsWith("http");
    await apiClient.post("/upload/cleanup", {
      publicId: isUrl ? undefined : publicIdOrUrl,
      url: isUrl ? publicIdOrUrl : undefined,
    });
  } catch (error) {
    // Non-blocking for UI, log error silently
    console.warn("Proactive asset cleanup notification failed:", error);
  }
}
