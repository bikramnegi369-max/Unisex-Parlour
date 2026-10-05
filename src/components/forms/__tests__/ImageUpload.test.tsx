import React from "react";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ImageUpload from "../ImageUpload";
import * as uploadApi from "@/lib/api/upload.api";

vi.mock("@/lib/api/upload.api", () => ({
  getUploadSignature: vi.fn(),
  uploadDirectToCloudinary: vi.fn(),
  cleanupUploadedAsset: vi.fn(),
}));

if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
}
if (!global.URL.revokeObjectURL) {
  global.URL.revokeObjectURL = vi.fn();
}

describe("ImageUpload Component", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders upload button and empty state correctly", () => {
    render(<ImageUpload value={null} onChange={vi.fn()} label="Avatar Photo" />);

    expect(screen.getByText("Avatar Photo")).toBeDefined();
    expect(screen.getByRole("button", { name: /upload photo/i })).toBeDefined();
  });

  it("renders existing image preview when value is provided", () => {
    const existingUrl = "https://res.cloudinary.com/test/image/upload/v1/avatar.jpg";
    render(<ImageUpload value={existingUrl} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /change photo/i })).toBeDefined();
    expect(screen.getByTitle("Remove photo")).toBeDefined();
  });

  it("calls onChange with null and triggers cleanup when remove button is clicked", () => {
    const onChange = vi.fn();
    const existingUrl = "https://res.cloudinary.com/test/image/upload/v1/avatar.jpg";

    render(<ImageUpload value={existingUrl} onChange={onChange} />);

    const removeBtn = screen.getByTitle("Remove photo");
    fireEvent.click(removeBtn);

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("handles successful file upload flow", async () => {
    const onChange = vi.fn();
    const mockSignature = {
      signature: "mock-sig",
      timestamp: 123456,
      apiKey: "mock-key",
      cloudName: "demo",
      folder: "employees/avatars",
      publicId: "employees/avatars/avatar_123",
      uploadUrl: "https://api.cloudinary.com/v1_1/demo/image/upload",
    };
    const mockUploadResult = {
      secure_url: "https://res.cloudinary.com/demo/image/upload/employees/avatars/avatar_123.jpg",
      public_id: "employees/avatars/avatar_123",
      bytes: 1024,
      format: "jpg",
      width: 400,
      height: 400,
    };

    vi.mocked(uploadApi.getUploadSignature).mockResolvedValueOnce(mockSignature);
    vi.mocked(uploadApi.uploadDirectToCloudinary).mockResolvedValueOnce(mockUploadResult);

    const { container } = render(<ImageUpload value={null} onChange={onChange} />);

    const file = new File(["dummy content"], "avatar.png", { type: "image/png" });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadApi.getUploadSignature).toHaveBeenCalledWith("employees/avatars");
      expect(uploadApi.uploadDirectToCloudinary).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalledWith(mockUploadResult.secure_url);
    });
  });

  it("rejects invalid file type with an error message", async () => {
    const onChange = vi.fn();
    const { container } = render(<ImageUpload value={null} onChange={onChange} />);

    const invalidFile = new File(["dummy"], "file.pdf", { type: "application/pdf" });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(await screen.findByText(/Invalid file type/i)).toBeDefined();
    expect(uploadApi.getUploadSignature).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
