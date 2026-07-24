---
trigger: model_decision
description: Apply when working on file uploads, images, videos, documents, Cloudinary, large files, upload progress, previews, file validation, drag-and-drop uploads, media processing, or file-related API requests.
---

# File Uploads & Media Handling Rules

Follow production-grade practices when implementing file uploads and media handling.

## Before Implementing Uploads

Before creating upload functionality:

1. Inspect existing upload components.
2. Check existing file validation utilities.
3. Check existing upload services.
4. Check the backend upload contract.
5. Check whether direct-to-storage uploads are already supported.
6. Reuse existing upload patterns whenever possible.

Do not create duplicate upload logic.

## Upload Architecture

Follow the existing architecture between:

Frontend
→ Upload Service
→ Storage Provider or Express Backend

If the backend provides signed upload URLs or direct upload support, use the established flow.

For large files, prefer direct-to-storage uploads when supported rather than unnecessarily sending the entire file through the Next.js server.

Do not proxy large files through Next.js API routes unless the architecture explicitly requires it.

## File Validation

Validate files before uploading when appropriate.

Consider:

- File type
- MIME type
- File extension
- File size
- Number of files
- Maximum total size

Provide clear validation messages.

Example:

```text id="j2f9vx"
Video must be smaller than 2 GB.
```

Do not rely solely on client-side validation.

The backend or storage provider must independently validate uploads.

## Large Files

For large files:

- Avoid loading the entire file into memory unnecessarily.
- Avoid converting large files to base64.
- Prefer direct uploads when supported.
- Use multipart or resumable uploads when the infrastructure supports them.
- Provide upload progress when practical.

Do not use base64 encoding for large videos or documents unless explicitly required.

## Upload Progress

For long-running uploads, provide meaningful progress feedback.

Show:

- Uploading state
- Progress percentage when available
- Completion state
- Failure state

Example:

```text id="o4c8fn"
Uploading video...
65%
```

Prevent users from accidentally starting duplicate uploads.

## Upload Cancellation

For large or long-running uploads, support cancellation when practical.

When cancelling:

- Stop the upload request.
- Reset appropriate upload state.
- Clean up temporary resources.
- Allow the user to retry.

Do not leave the UI stuck in an uploading state after cancellation.

## File Previews

Provide previews when useful.

For images:

- Use appropriate image previews.

For videos:

- Use a video preview when practical.

For documents:

- Show file name, type, and size.

Use `URL.createObjectURL` carefully.

When creating object URLs:

```ts id="h6c3xq"
const url = URL.createObjectURL(file);
```

Always revoke them when they are no longer needed:

```ts id="w4j7ka"
URL.revokeObjectURL(url);
```

Avoid memory leaks caused by unreleased object URLs.

## Image Uploads

For images:

- Validate supported formats.
- Validate file size.
- Optimize images when appropriate.
- Use appropriate dimensions.
- Avoid uploading unnecessarily large files.

Use the project's existing image optimization or storage strategy.

Do not automatically process images in the browser unless necessary.

## Video Uploads

For videos:

- Validate file type.
- Validate file size.
- Provide progress feedback.
- Prefer direct uploads for large files when supported.
- Avoid converting videos to base64.
- Avoid unnecessary client-side video processing.
- Handle failed uploads gracefully.

Do not assume a video upload completed successfully until the upload service confirms success.

## Cloud Storage

If the project uses Cloudinary or another external storage provider:

- Follow the existing integration.
- Keep provider-specific logic centralized.
- Do not expose private API secrets in frontend code.
- Use unsigned or signed uploads according to the backend architecture.
- Do not duplicate provider configuration across components.

The frontend should only use credentials explicitly designed to be public.

Never expose:

- API secrets
- Private keys
- Server-side credentials

## Upload Security

Frontend validation is not a security boundary.

The backend or storage provider must validate:

- File type
- File size
- File content
- Upload permissions

Never trust the file extension alone.

Never assume a file is safe because the browser accepted it.

## Upload Errors

Handle errors clearly.

Differentiate between:

- File validation errors
- Network errors
- Authentication errors
- Permission errors
- Storage errors
- Server errors
- Upload cancellation

Show user-friendly messages.

Do not expose raw provider errors or internal backend details.

## Retry

Allow retrying failed uploads when appropriate.

Do not automatically retry indefinitely.

For large uploads, consider whether the storage provider supports resumable uploads before restarting the entire upload.

## Multiple Files

For multiple file uploads:

- Clearly show selected files.
- Show individual upload status when practical.
- Allow removing files before upload.
- Prevent duplicate file entries when appropriate.
- Handle partial failures gracefully.

Do not assume that all files succeed if only some uploads complete.

## Form Integration

When files are part of a form:

- Validate files using the form's validation architecture.
- Track upload state separately when appropriate.
- Prevent submission while required uploads are incomplete.
- Handle upload failures before final submission.
- Clean up temporary upload state after successful completion.

Do not submit a file URL until the upload has successfully completed.

## File Replacement

When replacing an existing file:

1. Upload the new file.
2. Confirm successful upload.
3. Update the associated backend record.
4. Remove or replace the old file according to the backend/storage lifecycle.

Do not delete the old file before confirming the new upload succeeded unless the backend explicitly handles transactional replacement.

## File Deletion

For file deletion:

- Confirm destructive actions when appropriate.
- Call the correct backend or storage API.
- Update UI state after successful deletion.
- Handle failures gracefully.

Do not assume deleting a database reference automatically deletes the physical file unless the backend guarantees it.

## Temporary Files

Clean up temporary files and object URLs when no longer needed.

Do not leave stale previews or temporary upload references in application state.

## Accessibility

Upload interfaces should be accessible.

Ensure:

- File inputs have labels.
- Drag-and-drop areas also support normal file selection.
- Keyboard users can access upload controls.
- Upload progress is communicated appropriately.
- Errors are clearly announced or displayed.

Do not make drag-and-drop the only way to upload a file.

## Performance

Avoid unnecessary processing of large files.

Do not:

- Convert large files to base64 unnecessarily.
- Duplicate large file objects in state.
- Generate multiple previews unnecessarily.
- Upload the same file multiple times.

Keep file objects and preview URLs managed carefully.

## Final Check

Before completing upload-related work, verify:

- Existing upload architecture was inspected.
- Existing upload components were reused.
- Backend upload contract was checked.
- Large files are handled efficiently.
- Direct uploads are used when supported.
- File type and size validation exists.
- Backend validation is not assumed to be replaced by frontend validation.
- Upload progress is shown when appropriate.
- Duplicate uploads are prevented.
- Failed uploads are handled.
- Retry behavior is reasonable.
- Object URLs are revoked.
- Sensitive storage credentials are not exposed.
- File replacement is handled safely.
- File deletion is handled safely.
- Upload controls are accessible.
- No unnecessary base64 conversion is used.
