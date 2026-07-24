---
trigger: model_decision
description: Apply when handling API errors, runtime errors, exceptions, failed mutations, authentication errors, form errors, error boundaries, logging, debugging, console errors, or unexpected application failures.
---

# Error Handling, Logging & Debugging Rules

Follow consistent, production-safe error handling practices throughout the application.

## General Principles

Errors must be handled intentionally.

Do not:

- Ignore errors silently.
- Hide errors with empty catch blocks.
- Suppress errors without understanding them.
- Use `any` to bypass error types.
- Leave debugging code in production.

Always identify the root cause before applying a fix.

## API Errors

Use the project's centralized API error-handling architecture.

Handle common cases appropriately:

- Network failure
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 422 Validation Error
- 429 Rate Limit
- 500+ Server Error

Do not expose raw backend errors to users.

Use user-friendly messages.

## Error Messages

User-facing errors should be:

- Clear
- Concise
- Actionable when possible

Prefer:

```text
Unable to load workers. Please try again.
```

instead of:

```text
AxiosError: Request failed with status code 500
```

When appropriate, provide a retry action.

## Error Boundaries

Use React or Next.js error boundaries for unexpected rendering failures where appropriate.

An error boundary should:

- Display a useful fallback UI.
- Avoid exposing internal implementation details.
- Provide a recovery or retry action when possible.
- Allow the application to recover without unnecessarily breaking unrelated areas.

Do not use error boundaries as a replacement for normal API error handling.

## Component Errors

Components should handle expected failures gracefully.

For API-driven components, distinguish between:

- Loading
- Success
- Empty
- Error

Do not show an empty state when the actual state is an error.

## Async Operations

For asynchronous operations:

1. Start loading state.
2. Execute the operation.
3. Handle success.
4. Handle expected errors.
5. Reset loading state correctly.

Use `finally` when appropriate to guarantee cleanup.

Example:

```ts
try {
  await saveWorker();
} catch (error) {
  handleError(error);
} finally {
  setIsSubmitting(false);
}
```

Do not leave UI loading states permanently active after failures.

## Error Type Safety

Do not assume caught errors have a specific shape.

Avoid:

```ts
catch (error: any) {
```

Prefer safe error handling.

Use `unknown` and narrow the error when necessary.

Do not blindly access properties such as:

```ts
error.response.data.message;
```

without checking that the structure exists.

## Authentication Errors

Follow the existing centralized authentication flow.

For 401:

- Use the existing token refresh mechanism when applicable.
- If refresh fails, follow the established logout flow.

For 403:

- Treat it as an authorization failure.
- Do not automatically log the user out.

Do not implement separate authentication error handling inside every component.

## Form Errors

Handle both:

- Client-side validation errors.
- Backend validation errors.

Show field-specific backend errors next to the relevant fields when possible.

Show general server errors using the project's existing notification or error UI.

Do not replace useful validation messages with generic errors.

## Mutation Errors

For create, update, and delete operations:

- Stop loading state after failure.
- Preserve user input when appropriate.
- Show a clear error message.
- Do not falsely show success.
- Do not invalidate or update data as if the mutation succeeded.

For destructive operations, ensure the UI remains consistent after failure.

## Logging

Use logging primarily for development and diagnostics.

Do not leave unnecessary `console.log` statements in production code.

Remove temporary debugging logs before completing a task.

Avoid logging:

- Passwords
- Access tokens
- Refresh tokens
- API secrets
- Private user data
- Sensitive business information

## Console Errors

Do not ignore browser console errors.

Before completing a task, resolve newly introduced:

- React warnings
- Hydration errors
- TypeScript errors
- Network errors
- Accessibility warnings
- Key warnings
- Unhandled promise rejections

Do not hide warnings simply to make the console appear clean.

Fix the underlying issue.

## Debugging Process

When debugging:

1. Reproduce the issue.
2. Identify the exact failing layer.
3. Inspect the error and stack trace.
4. Check network requests when applicable.
5. Check API request and response data.
6. Check state transitions.
7. Identify the root cause.
8. Apply the smallest correct fix.
9. Verify related functionality.
10. Remove temporary debugging code.

Do not randomly change unrelated code.

## Avoid Defensive Overengineering

Do not add excessive error handling for impossible states without a reason.

Handle realistic failure scenarios clearly.

Prefer simple and maintainable error handling over deeply nested defensive code.

## Retry Behavior

Retry operations only when appropriate.

Good candidates may include:

- Temporary network failures
- Transient server errors

Avoid automatic retries for:

- Invalid input
- Authentication failures
- Permission failures
- Validation errors

Do not retry indefinitely.

Follow the existing TanStack Query or API retry configuration when available.

## Notifications

Use the project's existing toast or notification system.

Do not use browser `alert()` for production error messages.

Avoid showing multiple notifications for the same error.

For example, if a centralized interceptor already displays an authentication error, do not show another duplicate toast inside the component.

## Error Recovery

When possible, provide recovery options:

- Retry
- Refresh data
- Clear filters
- Return to previous page
- Go to dashboard

Do not force users to reload the entire browser when a localized recovery action is sufficient.

## Production Safety

Before completing work:

- Remove temporary logs.
- Remove debug UI.
- Remove test-only code.
- Do not expose stack traces.
- Do not expose internal API details.
- Do not expose secrets.
- Do not suppress errors unnecessarily.

## Final Check

Before completing error-handling or debugging work, verify:

- Expected errors are handled.
- Unexpected errors have an appropriate fallback.
- Loading states reset after failures.
- API errors are user-friendly.
- 401 and 403 are handled correctly.
- Form errors are displayed appropriately.
- Mutation failures do not produce false success states.
- No sensitive information is logged.
- No unnecessary console logs remain.
- No new React warnings exist.
- No hydration errors exist.
- No unhandled promise rejections exist.
- Error recovery is provided where appropriate.
- The root cause was fixed rather than hidden.
