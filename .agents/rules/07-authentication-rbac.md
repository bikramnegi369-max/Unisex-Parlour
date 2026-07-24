---
trigger: model_decision
description: Apply when working on authentication, login, logout, tokens, refresh tokens, route protection, roles, permissions, RBAC, protected pages, 401/403 errors, or conditionally showing UI based on user access.
---

# Authentication, Authorization & RBAC Rules

Follow secure and consistent authentication and authorization practices throughout the frontend.

The backend is the final authority for authentication, authorization, roles, permissions, and access control.

Frontend access control exists primarily for user experience and navigation.

## Existing Authentication Architecture

Before modifying authentication:

1. Inspect the existing authentication implementation.
2. Inspect token storage utilities.
3. Inspect Axios interceptors.
4. Inspect login and logout flows.
5. Inspect route protection.
6. Inspect user and role state.
7. Inspect existing permission utilities.

Reuse the existing authentication architecture.

Do not create a second authentication mechanism.

Do not duplicate token refresh or logout logic.

## Authentication vs Authorization

Keep these concepts separate.

Authentication answers:

"Who is the user?"

Authorization answers:

"What is the user allowed to do?"

Do not use authentication checks as a replacement for permission checks.

## Tokens

Follow the project's established token strategy.

Do not introduce a new token storage mechanism without a clear architectural reason.

Never expose sensitive authentication data unnecessarily.

Never log:

- Access tokens
- Refresh tokens
- Passwords
- Authentication secrets

Do not put secrets in `NEXT_PUBLIC_*` environment variables.

## Token Refresh

Token refresh logic must remain centralized.

Do not implement refresh-token logic inside individual pages or components.

If the project uses Axios interceptors for token refresh, continue using that architecture.

Prevent multiple simultaneous refresh requests when possible.

Handle failed refresh attempts consistently.

If refresh fails:

1. Clear authentication state according to the existing architecture.
2. Perform the appropriate logout flow.
3. Redirect to the login page when required.
4. Avoid infinite refresh loops.

## Login

Login flows should:

1. Validate user input.
2. Show submission loading state.
3. Prevent duplicate submissions.
4. Call the authentication API.
5. Handle authentication errors.
6. Store authentication state using the existing architecture.
7. Redirect appropriately after successful login.

Do not expose raw backend authentication errors to users.

Use clear messages such as:

```text
Invalid email or password.
```

when appropriate.

## Logout

Use the centralized logout mechanism.

Logout should correctly clear relevant authentication state.

Do not implement separate logout logic in individual components.

After logout:

- Clear appropriate client authentication state.
- Clear relevant cached user data when required.
- Redirect appropriately.
- Prevent access to protected application areas.

## Route Protection

Protect authenticated routes using the project's established architecture.

Do not rely only on hiding navigation links.

Users should not be able to access protected application pages simply by manually entering a URL.

Frontend route protection improves UX.

The backend must still enforce authorization.

## Role-Based Access Control

Use roles and permissions according to the existing backend contract.

Do not hardcode authorization logic throughout the UI.

Avoid repeated code such as:

```ts
if (user.role === "admin")
```

throughout many unrelated components.

Prefer centralized role or permission utilities when appropriate.

For example:

```ts
hasPermission("workers.create");
```

or:

```ts
can("workers", "create");
```

Follow the project's existing permission model.

## Permissions

Permissions should be granular when the application's requirements need it.

Examples:

- `workers.view`
- `workers.create`
- `workers.update`
- `workers.delete`

Do not assume that having access to a page means the user can perform every action on that page.

Check permissions for sensitive actions such as:

- Create
- Update
- Delete
- Approve
- Export
- Manage users
- Manage settings

## UI Authorization

Use permissions to improve the user experience.

Hide or disable actions the user is not authorized to perform.

Examples:

- Hide "Delete" when the user lacks delete permission.
- Hide "Create Worker" when the user lacks create permission.
- Hide admin-only navigation items from unauthorized users.

Do not rely on UI hiding for security.

The backend must enforce permissions independently.

## Navigation

Navigation menus should respect user permissions.

Do not display links to areas the user cannot access when the permission system supports determining access.

If a user manually navigates to an unauthorized route, handle the situation appropriately.

Use the project's existing unauthorized or forbidden page behavior.

## 401 Unauthorized

Handle 401 responses consistently.

A 401 generally means the user's authentication is missing or invalid.

Follow the existing authentication flow for:

- Token refresh
- Logout
- Redirect to login

Do not implement separate 401 handling in every component.

## 403 Forbidden

Handle 403 responses separately from 401.

A 403 generally means the user is authenticated but does not have permission to perform the requested action.

Show an appropriate message or unauthorized state.

Do not automatically log out an authenticated user because of a 403 response.

## Authorization Checks

Do not trust client-provided role or permission information for security decisions.

The frontend can use user roles and permissions to control the UI.

The backend must independently verify authorization for every protected operation.

## Sensitive Actions

For destructive or high-impact operations:

- Verify frontend permissions.
- Confirm the action when appropriate.
- Show loading state.
- Prevent duplicate submissions.
- Handle 401 and 403 responses.
- Refresh affected data after success.

Examples include:

- Delete user
- Delete worker
- Approve hours
- Change account permissions
- Modify company settings

## Authentication State

Avoid unnecessary duplication of authentication state.

Do not maintain multiple conflicting sources of truth for the current user.

Follow the existing architecture for:

- Current user
- Authentication status
- Roles
- Permissions

If authentication state is stored in Redux, use the existing Redux architecture.

If authentication is derived from server-side session or cookies, follow that architecture instead.

## Security Principles

Never assume frontend code is secure authorization.

Never:

- Trust frontend-only permission checks.
- Expose secrets.
- Log tokens.
- Store sensitive credentials unnecessarily.
- Bypass backend authorization.
- Allow frontend roles to determine backend access.

The backend remains the source of truth for access control.

## Final Check

Before completing authentication or RBAC work, verify:

- Existing authentication architecture was inspected.
- Existing token storage is reused.
- Existing Axios interceptors are preserved.
- Token refresh is centralized.
- Logout is centralized.
- Protected routes remain protected.
- 401 handling is consistent.
- 403 handling is consistent.
- Role and permission checks are reusable.
- Unauthorized UI actions are hidden or disabled appropriately.
- Backend authorization is not replaced by frontend checks.
- No sensitive information is logged or exposed.
- No duplicate authentication system was introduced.
