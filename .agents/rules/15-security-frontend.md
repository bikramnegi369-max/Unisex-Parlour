---
trigger: model_decision
description: Apply when handling authentication data, environment variables, user input, HTML rendering, redirects, external URLs, dependencies, browser storage, sensitive data, or any code with potential security implications.
---

# Security & Frontend Best Practices Rules

Follow secure frontend development practices throughout the application.

The frontend must never be treated as the final security boundary. The backend must independently enforce authentication, authorization, validation, and data access rules.

## General Security Principles

Always assume:

- Client-side code can be inspected.
- Client-side values can be modified.
- Requests can be replayed.
- Users can bypass frontend UI restrictions.
- Browser storage can be inspected.
- API requests can be manually constructed.

Never rely solely on frontend logic for security.

## Secrets

Never expose secrets in frontend code.

Never place sensitive values in:

```text
NEXT_PUBLIC_*
```

Do not expose:

- API secrets
- Private keys
- Database credentials
- JWT signing secrets
- Cloud provider private credentials
- Server-only authentication secrets

Only expose environment variables that are explicitly intended to be public.

## Environment Variables

Use environment variables for environment-specific configuration.

Examples:

- API base URLs
- Public application configuration
- Feature flags

Do not hardcode environment-specific values throughout the codebase.

Follow the project's existing environment variable conventions.

## Authentication Data

Follow the project's established authentication architecture.

Do not unnecessarily store sensitive authentication data in:

- `localStorage`
- `sessionStorage`
- Redux state
- URL parameters

Never store passwords in frontend state or storage.

Never log authentication tokens.

## Browser Storage

Before storing data in browser storage, determine whether it truly needs persistence.

Do not store sensitive information unnecessarily.

Be especially careful with:

- Access tokens
- Refresh tokens
- Personal information
- Financial information
- Authentication credentials

Follow the existing token architecture instead of introducing a new storage mechanism.

## XSS Prevention

Never render untrusted HTML directly.

Avoid using:

```tsx
dangerouslySetInnerHTML;
```

unless the content is trusted or properly sanitized.

If HTML rendering is required:

1. Understand where the content comes from.
2. Verify whether it is trusted.
3. Sanitize untrusted HTML using an appropriate solution.
4. Follow the backend's content security model.

Do not assume HTML from an API is automatically safe.

## User Input

Treat all user-provided input as untrusted.

Validate input using the project's existing validation architecture.

For example:

- Zod schemas
- React Hook Form validation
- Backend validation

Client-side validation improves UX.

Backend validation is still mandatory.

## URLs and Redirects

Do not blindly redirect users to arbitrary URLs provided by query parameters or user input.

Be careful with patterns such as:

```text
/redirect?url=<user-controlled-url>
```

Validate redirect destinations when implementing redirects.

Prefer internal routes or explicitly allowed domains.

Avoid open redirect vulnerabilities.

## External Links

When opening external URLs:

- Validate or control the destination when it comes from user input.
- Use safe link behavior.
- Follow established project conventions.

Be cautious with `target="_blank"` and ensure appropriate security attributes when needed.

## API Security

Do not assume API endpoints are protected because the UI hides them.

The backend must enforce:

- Authentication
- Authorization
- Input validation
- Resource ownership
- Data access restrictions

The frontend should handle API responses correctly but must not attempt to replace backend security.

## Permission Checks

Frontend permission checks are for user experience.

For example:

```text
Hide Delete Button
```

does not secure the delete API.

The backend must still verify permission for the operation.

Never bypass permission checks simply because the frontend needs a feature to work.

## Sensitive Data

Do not unnecessarily expose sensitive data in:

- URLs
- Query parameters
- Browser storage
- Redux state
- Client component props
- HTML
- Console logs

Only send and render the data required by the current feature.

## Error Messages

Do not expose sensitive implementation details through user-facing errors.

Avoid displaying:

- Stack traces
- Database errors
- Internal server paths
- API keys
- Authentication details
- Internal infrastructure information

Show a safe, user-friendly message instead.

## Console Logging

Do not log sensitive information.

Never log:

- Passwords
- Access tokens
- Refresh tokens
- API secrets
- Private keys
- Sensitive personal data

Remove temporary debugging logs before production.

## Dependency Security

Before adding a dependency:

1. Check whether existing dependencies already provide the required functionality.
2. Consider package maintenance and reputation.
3. Avoid unnecessary dependencies.
4. Keep dependencies updated according to the project's maintenance process.

Do not add packages solely for trivial functionality that can be safely implemented with existing tools.

## Third-Party Libraries

Treat third-party libraries as external code.

Review what data they receive.

Do not pass sensitive information to third-party services unless explicitly required and approved by the architecture.

Follow the project's privacy and security requirements.

## File Upload Security

Do not trust client-side file validation.

The backend or storage provider must validate uploaded files.

The frontend should still validate:

- File type
- File size
- File count

Never expose private storage credentials to the browser.

## API Responses

Do not assume API responses are safe to render directly.

Validate or sanitize data when required.

Be especially careful when rendering:

- HTML
- User-generated content
- Rich text
- URLs
- File names

## Cookies

Follow the existing authentication architecture.

When authentication uses cookies, prefer secure cookie configurations controlled by the backend.

Do not attempt to recreate secure cookie behavior entirely in frontend JavaScript.

Follow backend configuration for:

- `HttpOnly`
- `Secure`
- `SameSite`

## CSRF Considerations

If the application uses cookie-based authentication, follow the backend's CSRF protection strategy.

Do not assume that `SameSite` settings alone satisfy all CSRF requirements.

Follow the established API and authentication architecture.

## Client-Side Authorization

Never rely on client-side authorization to protect data.

The frontend may:

- Hide unauthorized navigation.
- Hide unauthorized buttons.
- Disable restricted actions.
- Redirect unauthorized users.

The backend must still reject unauthorized requests.

## Data Exposure

Only fetch data that the current feature needs.

Avoid requesting sensitive or unnecessary fields simply because the API provides them.

Do not expose entire user objects to client components when only a small subset is required.

## Secure Coding Practices

Avoid:

- `eval()`
- Dynamic code execution
- Unsafe HTML rendering
- Arbitrary script injection
- Unvalidated redirects
- Hardcoded secrets
- Sensitive console logs

Do not disable security mechanisms simply to make development easier.

## Production Verification

Before completing security-sensitive work, verify:

- No secrets are exposed.
- No sensitive data is logged.
- No unsafe HTML rendering was introduced.
- User input is validated.
- External URLs are handled safely.
- Redirects are controlled.
- Permissions are not treated as frontend-only security.
- File uploads are validated by the backend.
- Authentication architecture remains unchanged.
- No unnecessary sensitive data is stored in the browser.
- No unsafe dependencies were introduced.

## Final Check

Before completing security-related work, verify:

- Frontend security is not treated as backend authorization.
- Secrets remain server-side.
- Public environment variables contain no secrets.
- Authentication data follows the existing architecture.
- Untrusted HTML is sanitized or avoided.
- User input is validated.
- Redirect destinations are controlled.
- External URLs are handled safely.
- Sensitive information is not logged.
- Sensitive data is not unnecessarily stored or exposed.
- API authorization remains enforced by the backend.
- File upload security is not delegated solely to the frontend.
- Error messages do not expose internal details.
- No unsafe code execution was introduced.
