---
trigger: model_decision
description: Apply when creating or modifying features, components, hooks, utilities, forms, API integrations, state logic, or fixing bugs where tests, regression checks, edge cases, or validation of behavior are relevant.
---

# Testing & Quality Assurance Rules

Build reliable production-quality features and verify behavior before considering work complete.

Follow the project's existing testing tools and conventions.

## Before Writing Tests

Before adding tests:

1. Inspect existing test configuration.
2. Check existing test patterns.
3. Check available testing libraries.
4. Reuse existing test utilities and helpers.
5. Avoid introducing a new testing framework unnecessarily.

Do not create a separate testing architecture without a clear reason.

## Test Behavior

Tests should verify user-visible behavior and meaningful application behavior.

Prefer testing:

- What the user can do.
- What the user can see.
- How the application responds.
- Important business rules.
- API success and failure behavior.

Avoid testing implementation details that may change without affecting behavior.

## Unit Tests

Use unit tests for isolated logic such as:

- Utility functions
- Date calculations
- Formatting functions
- Business rules
- Validation logic
- Data transformations

Unit tests should focus on deterministic behavior.

Test meaningful inputs and outputs.

## Component Tests

Test components when they contain meaningful behavior.

Test:

- Rendering
- User interactions
- Form submission
- Validation
- Loading states
- Error states
- Empty states
- Conditional UI
- Permission-based behavior

Do not create tests that only verify that static markup exists unless it represents important behavior.

## Integration Tests

Use integration tests when multiple parts of the application work together.

Examples:

- Form + validation + API mutation
- Table + filtering + pagination
- Authentication + protected routes
- Redux state + component interaction
- Upload flow + progress state

Focus on realistic user workflows.

## API Testing

When testing API-driven features, verify:

- Successful response
- Failed response
- Loading state
- Empty response
- Validation errors
- Authentication errors
- Authorization errors

Mock external APIs when appropriate.

Do not make tests dependent on unreliable external services unless an explicit end-to-end test requires it.

## Forms

For forms, test important scenarios:

- Valid submission
- Required fields
- Invalid values
- Validation messages
- Backend validation errors
- Submission loading state
- Successful submission
- Failed submission

Test important edge cases relevant to the form.

## Data Tables

For tables, test meaningful behavior such as:

- Loading state
- Empty state
- Error state
- Search
- Filtering
- Sorting
- Pagination
- Row selection
- Mutation actions

Do not test every visual detail unless it is important to the application's behavior.

## Authentication and RBAC

Test access control where appropriate.

Verify:

- Unauthenticated users cannot access protected areas.
- Authenticated users can access permitted areas.
- Unauthorized users cannot perform restricted actions.
- 401 responses are handled correctly.
- 403 responses are handled correctly.
- Role-based UI behaves correctly.

Do not assume hiding a button is sufficient authorization testing.

## Edge Cases

Consider realistic edge cases.

Examples:

- Empty arrays
- Null values
- Missing optional fields
- Very long strings
- Invalid dates
- Large numbers
- Duplicate records
- Network failures
- Slow API responses
- Expired authentication
- Permission failures

Do not add meaningless edge-case tests that cannot occur in the application's domain.

## Regression Testing

When fixing a bug:

1. Reproduce the bug.
2. Identify the root cause.
3. Add a regression test when practical.
4. Apply the fix.
5. Verify the original bug is resolved.
6. Verify related behavior still works.

Do not fix a bug without checking for related regressions.

## Test Naming

Test names should clearly describe expected behavior.

Prefer:

```text
should display an error when worker creation fails
```

over:

```text
test worker
```

A developer should understand the purpose of a test without reading its implementation.

## Test Independence

Tests should be independent whenever possible.

Avoid relying on execution order.

Reset or isolate state between tests.

Do not allow one test's state to affect another test.

## Mocking

Mock external dependencies when appropriate.

Good candidates include:

- API requests
- External services
- Browser APIs
- Third-party integrations

Do not over-mock internal application logic.

Excessive mocking can make tests pass while real application behavior is broken.

## Async Tests

Properly await asynchronous operations.

Do not rely on arbitrary timeouts.

Prefer testing for specific UI or state changes.

Avoid:

```ts
await new Promise((resolve) => setTimeout(resolve, 1000));
```

when a proper async testing utility is available.

## Test Data

Use realistic test data.

Avoid unnecessarily large fixtures when small data is sufficient.

Create reusable test factories or fixtures when the same data structure is used repeatedly.

Do not hardcode sensitive or production user data in tests.

## Accessibility Testing

When appropriate, verify basic accessibility behavior.

Check:

- Accessible labels
- Keyboard interactions
- Form labels
- Button names
- Dialog behavior

Do not treat accessibility as optional for important user interactions.

## Visual Testing

Use visual regression testing only when the project already supports it or when visual consistency is critical.

Do not add visual testing infrastructure unnecessarily.

Focus on behavior first.

## End-to-End Testing

Use end-to-end tests for critical workflows when the project supports them.

Examples:

- Login
- Worker creation
- Project creation
- Hours submission
- Approval workflows
- Logout

Keep end-to-end tests focused on important business flows.

Do not duplicate every unit or integration test as an end-to-end test.

## Before Completing a Task

Always perform appropriate validation.

Depending on the change, run:

- TypeScript type checking
- Linting
- Unit tests
- Component tests
- Integration tests
- End-to-end tests

Run the smallest relevant set first, then broader checks when appropriate.

## Manual Verification

For UI changes, manually verify when possible:

- Desktop layout
- Mobile layout
- Loading states
- Empty states
- Error states
- Form behavior
- User interactions

Do not rely exclusively on automated tests for visual or UX issues.

## Build Verification

For significant changes, ensure the project still builds successfully.

Check for:

- TypeScript errors
- ESLint errors
- Build errors
- Route generation errors
- Hydration errors

Do not consider a feature complete if the production build is broken.

## Avoid Weak Tests

Do not write tests solely to increase coverage numbers.

Avoid tests that:

- Test implementation details unnecessarily.
- Duplicate other tests.
- Assert trivial behavior.
- Mock everything.
- Never fail when the feature is broken.

Tests should provide meaningful confidence.

## Final Check

Before completing testing or feature work, verify:

- Relevant existing tests were inspected.
- Appropriate test types were selected.
- Important user behavior is covered.
- Success and failure paths are considered.
- Important edge cases are considered.
- Bug fixes have regression coverage when practical.
- Async behavior is tested correctly.
- External dependencies are mocked appropriately.
- Tests are independent.
- No sensitive production data is used.
- Type checking passes.
- Linting passes.
- Relevant tests pass.
- The production build passes when appropriate.
- Manual UI verification was performed for significant UI changes.
