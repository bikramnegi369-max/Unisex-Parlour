---
trigger: always_on
---

# Project Architecture & Coding Standards

You are working on an existing production-grade Next.js ERP frontend application.

Your job is to modify and extend the existing codebase without breaking its current architecture or functionality.

## Core Principle

Before writing any code, first inspect and understand the existing project.

Always:

1. Inspect the relevant existing files.
2. Understand the current folder structure.
3. Check whether reusable components already exist.
4. Check whether reusable hooks already exist.
5. Check whether API services already exist.
6. Check whether Redux state already exists for the required functionality.
7. Check whether existing types and schemas can be reused.
8. Follow existing naming and architectural conventions.
9. Reuse existing functionality whenever possible.
10. Avoid duplicating logic.

Do not immediately create new files or abstractions without first checking whether an existing implementation can be extended.

## Existing Project First

This is an existing project.

Do not:

- Reinitialize the project.
- Replace the existing architecture.
- Rewrite unrelated files.
- Replace existing libraries unnecessarily.
- Introduce a new state-management library without explicit approval.
- Introduce a new UI library without explicit approval.
- Change the project's framework or core technology.
- Remove existing functionality without explicit instruction.

Preserve existing behavior unless the requested change requires modifying it.

## Code Quality

All code must be:

- Production-ready
- Type-safe
- Maintainable
- Readable
- Scalable
- Reusable where appropriate
- Accessible
- Responsive
- Performant

Prefer simple and explicit solutions over clever or unnecessarily complex solutions.

Do not over-engineer.

Do not create abstractions only for the sake of abstraction.

## Component Architecture

Follow the Single Responsibility Principle.

A component should have one clear responsibility.

Avoid creating large components that contain all of the following:

- API communication
- Complex business logic
- Form state
- Validation
- Table configuration
- Filtering
- Modal management
- Rendering logic

When a component becomes unnecessarily complex, separate meaningful responsibilities into appropriate components, hooks, services, schemas, or utilities.

However, do not split small or simple components unnecessarily.

## Reusability

Before creating a new component, check whether an existing reusable component can be used.

Prefer reusing existing:

- Buttons
- Inputs
- Selects
- Modals
- Drawers
- Tables
- Pagination
- Search components
- Filters
- Form components
- Loading states
- Empty states
- Error states
- Toast notifications

If a reusable component already exists, extend it when appropriate instead of creating a duplicate.

## Feature Organization

Keep domain-specific code organized by feature when the existing project architecture supports it.

A feature may contain:

- Components
- Hooks
- Services
- Schemas
- Types
- Utilities

Keep feature-specific logic close to the feature that owns it.

Only move code into shared directories when it is genuinely shared across multiple features.

## Modifying Existing Code

When modifying existing code:

1. Read the relevant file completely enough to understand its purpose.
2. Identify dependencies and usages.
3. Make the smallest appropriate change.
4. Preserve existing behavior.
5. Avoid unrelated refactoring.
6. Do not rewrite entire files unless necessary.
7. Do not change public APIs or data contracts without explicit instruction.

## Dependencies

Do not install a new npm package unless:

1. The existing project cannot reasonably solve the requirement.
2. The dependency provides significant value.
3. The dependency is compatible with the current architecture.

Before adding a dependency, check whether an existing installed dependency can solve the problem.

## Before Completing Any Task

Verify that:

- The implementation follows the existing project architecture.
- Existing reusable components were considered.
- No unnecessary duplicate logic was introduced.
- No unrelated files were changed.
- No unused imports remain.
- No dead code remains.
- No unnecessary dependencies were added.
- TypeScript types are correct.
- Existing functionality is preserved.
- Loading, empty, error, and success states are considered where applicable.

If you discover an architectural conflict or need to make a significant architectural decision, explain the reason before proceeding.
