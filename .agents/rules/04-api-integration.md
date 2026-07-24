---
trigger: always_on
---

# API Integration Rules

This Next.js frontend communicates with a separate Express backend API.

## Architecture

Follow this flow:

UI Component
→ Custom Hook / Query Hook
→ API Service
→ Central Axios Instance
→ Express Backend

Keep UI, data fetching, and API communication separated.

Before creating new API code:

1. Inspect existing API services.
2. Reuse the existing Axios instance.
3. Check existing hooks and query functions.
4. Check existing request and response types.
5. Reuse existing API logic whenever possible.

Do not duplicate existing API calls or services.

## Backend Separation

The Next.js frontend is not the backend.

Do not:

- Create Next.js API routes to replace the Express backend.
- Access the database from frontend code.
- Move backend business logic into the frontend.
- Expose backend secrets or credentials.
- Invent backend endpoints without confirmation.

Follow the existing Express API contract.

If an endpoint or response structure is unknown, inspect the existing code or clearly state the assumption.

## Axios

Always use the project's existing centralized Axios instance.

Do not create new Axios instances inside components or feature files.

Do not duplicate:

- Base URL configuration
- Authentication headers
- Token handling
- Refresh-token logic
- Interceptors
- Timeout configuration

Authentication and token refresh logic must remain centralized.

## API Services

Keep API requests in feature-specific API service files when appropriate.

Example:

```text
features/
  workers/
    services/
      workers.api.ts
```

API services should:

- Call the backend.
- Accept typed parameters.
- Send typed request payloads.
- Return typed response data.

API services should not:

- Render UI.
- Manage React state.
- Directly manipulate components.
- Contain unnecessary UI logic.

Example:

```ts
export const getWorkers = async (
  params: GetWorkersParams,
): Promise<GetWorkersResponse> => {
  const response = await api.get("/workers", { params });
  return response.data;
};
```

## Type Safety

Type all API requests and responses.

Avoid:

```ts
any;
```

Do not use `as any` to bypass API typing problems.

Use existing domain types whenever possible.

Do not invent response fields that are not confirmed by the backend contract.

## Server State

Treat API data as server state.

Use TanStack Query when the feature requires:

- Caching
- Refetching
- Query invalidation
- Mutations
- Optimistic updates
- Client-side pagination
- Frequently changing server data

Follow the existing TanStack Query architecture.

Use stable and meaningful query keys.

Example:

```ts
["workers", filters];
```

Do not create inconsistent query keys for the same resource.

## Redux

Do not automatically put API data into Redux.

Use Redux Toolkit for genuine global client state or when the existing architecture explicitly requires it.

Do not create a Redux slice simply because an API endpoint exists.

Avoid maintaining duplicate sources of truth between Redux and TanStack Query.

## Local State

Use local React state for local UI concerns such as:

- Modal visibility
- Drawer visibility
- Temporary UI state
- Selected UI items
- Local toggles

Do not move simple local UI state into Redux.

## URL State

Use URL search parameters for state that should be:

- Shareable
- Bookmarkable
- Preserved after refresh

Examples:

- Search
- Filters
- Pagination
- Sorting
- Selected tabs

Avoid maintaining duplicate state between URL parameters and React state.

## Filtering, Sorting & Pagination

For large datasets, prefer server-side:

- Filtering
- Sorting
- Pagination
- Searching

Do not fetch thousands of records only to filter or paginate them in the browser when the backend supports these operations.

For search inputs that trigger API requests, debounce requests when appropriate.

Follow the backend's existing parameter names and API contract.

## Loading & Empty States

Every API-driven UI must distinguish between:

- Loading
- Successful data
- Successful empty result
- Error

Do not display an empty state while data is still loading.

For mutations, provide localized loading feedback and prevent duplicate submissions.

Prefer:

```text
Save
→ Saving...
→ Saved
```

instead of unnecessarily blocking the entire page.

## Error Handling

Handle API errors consistently.

Consider:

- Network errors
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- Validation errors
- Server errors

Follow the project's existing global error-handling architecture.

Do not expose raw Axios errors, stack traces, or internal backend details to users.

Prefer user-friendly messages such as:

```text
Unable to load workers. Please try again.
```

instead of:

```text
AxiosError: Request failed with status code 500
```

## Authentication

Do not implement authentication or token refresh logic inside individual components.

Use the project's centralized authentication and Axios interceptor architecture.

Preserve the existing:

- Access token flow
- Refresh token flow
- Logout behavior
- 401 handling

Do not introduce a second authentication mechanism.

## Mutations

For create, update, and delete operations:

1. Show a loading state.
2. Prevent duplicate submissions.
3. Call the API.
4. Handle success.
5. Handle errors.
6. Update or invalidate affected server data.
7. Provide appropriate user feedback.

Prefer targeted query invalidation or cache updates over full browser reloads.

Do not invalidate unrelated queries unnecessarily.

## Security

Frontend validation is not a security boundary.

The backend is responsible for enforcing:

- Authentication
- Authorization
- Permissions
- Business rules
- Data validation

Never expose:

- API secrets
- Private keys
- Database credentials
- Server-only environment variables

Never place sensitive secrets in `NEXT_PUBLIC_*` environment variables.

## Final Check

Before completing API-related work, verify:

- Existing API services were checked.
- Existing Axios instance is reused.
- Existing authentication flow is preserved.
- Request and response types are correct.
- Loading, empty, success, and error states are handled.
- Duplicate requests are prevented where appropriate.
- Query invalidation is correct.
- No duplicate API logic was created.
- No backend endpoint was invented without confirmation.
- No sensitive information is exposed.
