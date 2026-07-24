---
trigger: model_decision
description: Apply to all development tasks involving code changes, feature implementation, bug fixes, refactoring, debugging, API integration, UI changes, or architectural decisions. Follow this workflow before and after making changes.
---

# AI Agent Workflow & Task Execution Rules

Follow a disciplined development workflow when working on the existing project.

The goal is to make safe, minimal, production-ready changes while preserving existing functionality.

## 1. Understand the Request

Before changing code:

- Understand the exact user requirement.
- Identify the expected behavior.
- Identify affected features.
- Identify constraints.
- Determine whether the request is frontend-only or requires backend coordination.

Do not make assumptions about requirements that materially affect implementation.

If critical information is missing, ask a concise clarification question.

Do not ask unnecessary questions when the existing codebase already provides the answer.

## 2. Inspect Before Implementing

Before creating or modifying code:

1. Inspect the relevant directory structure.
2. Search for related components.
3. Search for existing hooks.
4. Search for existing API services.
5. Search for existing types.
6. Search for existing schemas.
7. Search for existing state management.
8. Search for similar implementations.
9. Inspect relevant configuration when necessary.

Do not immediately create new files without checking whether existing functionality can be reused.

## 3. Reuse Before Creating

Always prefer:

```text
Existing implementation
→ Extend existing implementation
→ Refactor existing implementation if necessary
→ Create new implementation only when justified
```

Do not create duplicate:

- Components
- Hooks
- API services
- Utilities
- Types
- Validation schemas
- Redux slices
- UI patterns

## 4. Plan Before Large Changes

For complex tasks, create a concise implementation plan before modifying multiple files.

The plan should identify:

- Files to inspect.
- Files likely to change.
- Main implementation steps.
- Potential risks.
- Validation required.

Do not over-plan simple changes.

Do not spend excessive time planning when the solution is straightforward.

## 5. Make Minimal Changes

Implement the smallest correct solution.

Prefer:

```text
Small focused change
→ Verify
→ Continue
```

over:

```text
Rewrite entire feature
→ Hope everything still works
```

Avoid unrelated refactoring.

Do not modify code that is unrelated to the requested task.

## 6. Preserve Existing Architecture

Follow the project's established architecture.

Before introducing a new pattern, check whether an existing pattern already solves the problem.

Do not introduce:

- New state-management libraries
- New API clients
- New styling systems
- New validation libraries
- New folder structures

without a strong reason.

Consistency with the existing codebase is preferred over personal preference.

## 7. Do Not Hallucinate

Never invent:

- API endpoints
- Request payloads
- Response fields
- Database fields
- Environment variables
- Library APIs
- Existing functions
- Component props

If implementation depends on information that cannot be verified, inspect the codebase or clearly identify the assumption.

Do not silently invent backend behavior.

## 8. Backend Contract

When integrating with an existing backend:

Inspect:

- Existing API services.
- Request methods.
- Endpoint patterns.
- Authentication headers.
- Request payloads.
- Response structures.
- Error formats.

Reuse the existing API client and interceptor architecture.

Do not create a second API client unless explicitly required.

Do not modify backend assumptions without evidence.

## 9. Component Implementation

When creating components:

- Keep components focused.
- Reuse shared UI components.
- Follow existing design patterns.
- Keep business logic outside JSX when complexity justifies it.
- Use appropriate loading, error, and empty states.
- Ensure responsive behavior.
- Ensure accessibility.

Do not create unnecessarily large components.

Do not create generic abstractions prematurely.

## 10. State Decisions

Before adding state, determine whether the state belongs in:

```text
Local UI State
→ React useState

Server State
→ Existing server-state solution

Global Client State
→ Redux Toolkit when justified

Shareable URL State
→ URL Search Params
```

Do not automatically add Redux for every feature.

Do not duplicate server state unnecessarily.

## 11. Handle All UI States

For API-driven UI, consider:

```text
Loading
Success
Empty
Error
```

For mutations, consider:

```text
Idle
Submitting
Success
Error
```

For authenticated features, consider:

```text
Authenticated
Unauthenticated
Unauthorized
```

Do not implement only the happy path.

## 12. Incremental Implementation

For complex features:

1. Implement the foundation.
2. Verify types.
3. Implement the main behavior.
4. Verify functionality.
5. Add edge cases.
6. Verify UI states.
7. Perform final cleanup.

Avoid making hundreds of unrelated changes before checking whether the basic implementation works.

## 13. Debug Root Causes

When fixing bugs:

1. Reproduce the issue.
2. Identify the failing layer.
3. Inspect relevant logs and network requests.
4. Trace state changes.
5. Identify the root cause.
6. Apply the smallest correct fix.
7. Verify the original issue.
8. Check for regressions.

Do not apply random changes until the error disappears.

Do not hide errors by suppressing warnings.

## 14. Do Not Work Around Errors Blindly

If an error occurs:

- Read the error.
- Understand the cause.
- Check relevant documentation when necessary.
- Inspect the implementation.
- Fix the underlying problem.

Do not:

- Add random delays.
- Add unnecessary retries.
- Disable lint rules.
- Disable TypeScript checks.
- Suppress warnings.
- Add `any` to silence errors.

unless there is a documented and intentional reason.

## 15. Verify After Changes

After implementation, verify the relevant layers.

Depending on the change, check:

- TypeScript
- ESLint
- Unit tests
- Component tests
- API behavior
- Build
- Browser console
- Network requests
- Responsive behavior

Use the smallest relevant validation first.

For significant changes, perform broader validation.

## 16. Review Your Own Changes

Before considering a task complete, review:

- What files changed?
- Were unrelated files modified?
- Was existing behavior preserved?
- Were duplicate implementations created?
- Were any debug logs left behind?
- Were any secrets exposed?
- Were any dependencies added unnecessarily?
- Were any errors introduced?

The final implementation should be clean and intentional.

## 17. Do Not Claim Unverified Success

Never claim that something was:

- Tested
- Built
- Deployed
- Verified
- Fixed

unless it was actually verified.

Clearly distinguish between:

```text
Implemented
```

and:

```text
Tested successfully
```

If verification was not possible, state that clearly.

## 18. Final Response

After completing a task, provide a concise summary containing:

- What was changed.
- Important files or areas modified.
- Any important architectural decisions.
- Validation performed.
- Any remaining limitations or required backend work.

Do not provide excessive implementation details unless requested.

## 19. Stop Conditions

Stop and ask for clarification when:

- Requirements conflict.
- The backend contract is unknown and cannot be inferred safely.
- A destructive change is required.
- Existing behavior would be significantly altered.
- A security-sensitive decision cannot be verified.
- Multiple valid architectures have materially different consequences.

Do not make high-impact assumptions silently.

## 20. Final Quality Gate

Before considering any development task complete, verify:

- The request was fully understood.
- Existing code was inspected first.
- Existing functionality was reused where appropriate.
- No duplicate architecture was introduced.
- No APIs or data structures were invented.
- Changes are limited to the required scope.
- Existing behavior was preserved.
- Loading, empty, error, and success states were considered.
- Security implications were considered.
- Accessibility was considered for UI work.
- Responsive behavior was considered for UI work.
- Relevant validation was performed.
- No unnecessary debug code remains.
- No secrets were exposed.
- The final diff is focused and understandable.
- Any unverified assumptions are clearly identified.
