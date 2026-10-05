"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  UploadCloud,
  X,
  RefreshCw,
  AlertCircle,
  Camera,
  CheckCircle2,
} from "lucide-react";
import {
  getUploadSignature,
  uploadDirectToCloudinary,
  cleanupUploadedAsset,
} from "@/lib/api/upload.api";
import { cn } from "@/lib/utils";

export interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  onUploaded?: (url: string) => void;
  folder?: string;
  disabled?: boolean;
  maxSizeBytes?: number; // default 5MB
  allowedTypes?: string[];
  label?: string;
  helperText?: string;
  className?: string;
}

const DEFAULT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
];
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function ImageUpload({
  value,
  onChange,
  onUploaded,
  folder = "employees/avatars",
  disabled = false,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  label = "Avatar Photo",
  helperText = "PNG, JPG, or WEBP up to 5MB",
  className,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Local blob preview when uploading or null if matching external value
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Derive preview URL: show local blob during upload, otherwise fall back to prop value
  const previewUrl = localBlobUrl ?? (value || null);

  // Track newly uploaded Cloudinary URL so we can proactively clean it up if user deletes/replaces it
  const newlyUploadedUrlRef = useRef<string | null>(null);

  // Clean up any memory object URLs on unmount or before creating new ones
  const objectUrlRef = useRef<string | null>(null);
  const clearObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearObjectUrl();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return "Invalid file type. Please upload a JPG, PNG, or WEBP image.";
    }
    if (file.size > maxSizeBytes) {
      const sizeMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
      return `File size exceeds ${sizeMb}MB limit.`;
    }
    return null;
  };

  const handleUpload = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      clearObjectUrl();

      // Show immediate local preview with blob URL
      const blobUrl = URL.createObjectURL(file);
      objectUrlRef.current = blobUrl;
      setLocalBlobUrl(blobUrl);
      setIsUploading(true);
      setUploadProgress(0);

      // Create abort controller for request cancellation
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        // Step 1: Request presigned HMAC signature from backend
        const signatureData = await getUploadSignature(folder);

        // Step 2: Upload directly to Cloudinary with progress tracking
        const result = await uploadDirectToCloudinary(file, signatureData, {
          onProgress: (percent) => setUploadProgress(percent),
          signal: controller.signal,
        });

        // If user already replaced an earlier fresh upload in this session, clean up the prior one
        if (
          newlyUploadedUrlRef.current &&
          newlyUploadedUrlRef.current !== result.secure_url
        ) {
          cleanupUploadedAsset(newlyUploadedUrlRef.current);
        }

        newlyUploadedUrlRef.current = result.secure_url;
        // Notify parent form of the new secure URL and clear temporary blob preview
        onChange(result.secure_url);
        onUploaded?.(result.secure_url);
        setLocalBlobUrl(null);
        setIsUploading(false);
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Image upload failed:", err);
        setError("Failed to upload image. Please try again.");
        setIsUploading(false);
        // Reset temporary local blob URL
        setLocalBlobUrl(null);
      } finally {
        clearObjectUrl();
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [folder, maxSizeBytes, allowedTypes, onChange],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isUploading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // If an image was freshly uploaded in this session, trigger backend cleanup
    if (newlyUploadedUrlRef.current) {
      cleanupUploadedAsset(newlyUploadedUrlRef.current);
      newlyUploadedUrlRef.current = null;
    }

    clearObjectUrl();
    setLocalBlobUrl(null);
    setError(null);
    setIsUploading(false);
    setUploadProgress(0);
    onChange(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || isUploading) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
          {label}
        </label>
      )}

      <div className="flex items-center gap-4">
        {/* Avatar Preview Box */}
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={() =>
            !disabled && !isUploading && fileInputRef.current?.click()
          }
          onKeyDown={(e) => {
            if (
              (e.key === "Enter" || e.key === " ") &&
              !disabled &&
              !isUploading
            ) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-label={label}
          className={cn(
            "relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all duration-150 cursor-pointer select-none bg-muted/40",
            isDragging
              ? "border-primary bg-primary/10 scale-105"
              : "border-border hover:border-primary/60 hover:bg-muted/70",
            disabled &&
              "opacity-50 cursor-not-allowed hover:border-border hover:bg-muted/40",
            error && "border-destructive/80 bg-destructive/5",
          )}
        >
          {previewUrl ? (
            <>
              {/* Unoptimized for direct preview URLs / blob objects */}
              <Image
                src={previewUrl}
                alt="Avatar preview"
                fill
                unoptimized
                className="object-cover"
              />
              {!isUploading && !disabled && (
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-medium gap-1">
                  <Camera className="w-4 h-4" />
                  <span>Change</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground p-2 text-center">
              <Camera className="w-6 h-6 mb-1 text-muted-foreground/70" />
              <span className="text-[10px] font-medium leading-tight">
                Upload
              </span>
            </div>
          )}

          {/* Uploading progress overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white gap-1 p-2">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              <span className="text-[10px] font-semibold tracking-wider">
                {uploadProgress > 0 ? `${uploadProgress}%` : "Signing..."}
              </span>
            </div>
          )}
        </div>

        {/* Action Controls & Instructions */}
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={disabled || isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{previewUrl ? "Change Photo" : "Upload Photo"}</span>
            </button>

            {previewUrl && !isUploading && !disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}

            {previewUrl && !isUploading && !error && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ready
              </span>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground leading-normal">
            {helperText}
          </p>

          {/* Progress bar */}
          {isUploading && uploadProgress > 0 && (
            <div className="w-full max-w-xs h-1.5 bg-muted rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-primary transition-all duration-200 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(",")}
        className="hidden"
        disabled={disabled || isUploading}
        onChange={handleFileChange}
      />

      {/* Inline error feedback */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-destructive mt-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
