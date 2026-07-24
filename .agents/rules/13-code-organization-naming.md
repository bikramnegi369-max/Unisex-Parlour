---
trigger: model_decision
description: Apply when creating, moving, renaming, or refactoring files, folders, components, hooks, services, utilities, types, schemas, or feature modules, or when deciding where new code should live.
---

# Code Organization, Naming & Feature Structure Rules

Keep the codebase scalable, predictable, and easy to navigate as the ERP grows.

Follow the existing project architecture before introducing new structures.

## Before Creating Files

Before creating a new file:

1. Search for an existing implementation.
2. Check whether the functionality already exists.
3. Check the appropriate feature directory.
4. Check existing naming conventions.
5. Reuse or extend existing code when appropriate.

Do not create duplicate components, hooks, utilities, services, or types.

## Feature-Based Organization

Organize feature-specific code close to the feature when appropriate.

Prefer structures such as:

```text id="z5k2ab"
features/
  workers/
    components/
    hooks/
    services/
    schemas/
    types/
    utils/
```

Keep feature-specific logic within its feature boundary.

Do not place every file into large global folders such as:

```text id="n4j8cx"
components/
hooks/
utils/
services/
```

unless the code is genuinely shared across multiple unrelated features.

## Shared Code

Place code in shared locations only when it is actually reusable.

A component should be considered shared when multiple features use it or when it represents a common application-level UI pattern.

Avoid moving code into shared folders prematurely.

Do not create generic abstractions before there is a real reuse requirement.

## Components

Use clear and descriptive component names.

Prefer:

```text id="2w8m3n"
WorkerTable
WorkerForm
WorkerDetails
WorkerFilters
```

Avoid vague names:

```text id="6x4p9v"
DataComponent
CommonComponent
MainComponent
Box
Thing
```

Components should generally use PascalCase.

## Hooks

Custom React hooks should:

- Start with `use`.
- Have descriptive names.
- Represent reusable behavior.

Examples:

```text id="d7h2q1"
useWorkers
useWorkerFilters
useWorkerPermissions
useDebouncedSearch
```

Do not create hooks merely to wrap a single trivial line of code.

## Services

API service files should clearly identify the domain.

Examples:

```text id="k4m8x1"
workers.api.ts
projects.api.ts
hours.api.ts
```

Keep API communication separate from UI components.

## Types

Keep domain types organized and reusable.

Examples:

```text id="v8p3l6"
worker.types.ts
project.types.ts
hours.types.ts
```

Do not duplicate the same interface in multiple files.

Use a shared type when multiple features depend on the same domain model.

## Schemas

Keep Zod schemas organized according to feature or domain.

Examples:

```text id="c6n2q4"
worker.schema.ts
project.schema.ts
```

Avoid duplicating the same validation rules across forms.

## File Naming

Follow consistent naming conventions.

Use the project's established convention.

For React components, prefer:

```text id="g9k4p2"
WorkerTable.tsx
WorkerForm.tsx
```

For utilities and services, follow the project's existing convention, such as:

```text id="h2v7m5"
workers.api.ts
formatDate.ts
```

Do not mix naming conventions arbitrarily.

## Index Files

Use `index.ts` files only when they improve import organization.

Do not create excessive barrel files that make dependency relationships difficult to understand.

Avoid barrel exports when they cause:

- Circular dependencies
- Unnecessary module loading
- Difficult debugging

Prefer direct imports when they are clearer.

## Import Paths

Use the project's configured path aliases consistently.

Prefer:

```ts id="p3w8d2"
import { WorkerTable } from "@/features/workers/components/WorkerTable";
```

over deeply nested relative imports when the project supports path aliases.

Avoid unnecessarily long chains such as:

```ts id="q1m7x4"
../../../../../../components/...
```

Do not introduce new path aliases without a clear architectural reason.

## Dependency Direction

Maintain clear dependency boundaries.

Prefer:

```text id="x8v2q6"
UI
↓
Hooks
↓
Services
↓
API Client
```

Avoid lower-level modules importing higher-level UI modules.

For example, API services should not import React components.

Utilities should not depend on feature-specific UI components.

## Circular Dependencies

Avoid circular imports.

If a circular dependency appears:

1. Identify the dependency cycle.
2. Determine whether shared logic can be extracted.
3. Move shared types or utilities to an appropriate lower-level location.
4. Remove the circular dependency.

Do not solve circular dependencies with random re-exports.

## Utilities

Create utilities for genuinely reusable, stateless functionality.

Examples:

- Date formatting
- Number formatting
- String transformations
- Common calculations

Do not create a generic `utils.ts` containing unrelated functions.

Prefer domain-specific utility files.

## Constants

Keep constants close to the feature when they are feature-specific.

Place globally shared constants in a shared location only when genuinely global.

Avoid scattering repeated magic strings and numbers throughout the codebase.

## Refactoring

When modifying existing code:

- Preserve existing behavior unless the task requires changing it.
- Avoid unrelated refactoring.
- Avoid large architectural changes for small feature requests.
- Keep changes focused.

If a refactor is necessary to implement the requested feature correctly, make the smallest reasonable structural improvement.

## Avoid Over-Abstraction

Do not create abstractions prematurely.

Avoid creating:

- Generic components used only once.
- Generic hooks with no meaningful reuse.
- Complex service layers for simple operations.
- Excessive wrapper components.

Prefer simple code until a real reuse pattern emerges.

## File Size

Avoid excessively large files.

When a file becomes difficult to understand, consider extracting meaningful responsibilities.

Do not split files solely to reduce line count.

Extract based on:

- Responsibility
- Reusability
- Domain boundaries
- Maintainability

## Component Responsibility

A component should not become responsible for everything.

Avoid combining:

- API calls
- Complex business logic
- Global state management
- Form validation
- Large JSX trees

in one massive component.

Extract logic into appropriate hooks, services, schemas, selectors, or utilities when complexity justifies it.

## Business Logic

Keep business logic separate from presentation when practical.

Do not hide complex business rules inside JSX.

Prefer named functions or dedicated domain utilities when the logic is complex or reused.

Business logic should be easy to locate and test.

## Naming Variables

Use descriptive names.

Prefer:

```text id="v4k7p2"
isLoading
isSubmitting
selectedWorker
workerFilters
handleDeleteWorker
```

Avoid vague names such as:

```text id="m8q2x5"
data
value
item
obj
temp
thing
```

when a more meaningful name is possible.

## Naming Event Handlers

Use clear event-handler naming.

Prefer:

```text id="w6p3n9"
handleSubmit
handleDeleteWorker
handleSearchChange
handleFilterChange
```

For callback props, prefer:

```text id="k2x8m4"
onSubmit
onDelete
onSelect
onChange
```

## Comments

Prefer self-explanatory code.

Use comments only when they explain:

- Why something is done.
- A complex business rule.
- A non-obvious workaround.
- A framework limitation.

Do not use comments to explain obvious code.

## Final Check

Before completing structural or organizational work, verify:

- Existing code was searched first.
- Duplicate implementations were avoided.
- Feature-specific code is organized by feature.
- Shared code is genuinely reusable.
- Naming follows project conventions.
- Components have clear responsibilities.
- Hooks represent meaningful reusable behavior.
- API services remain separate from UI.
- Types and schemas are not duplicated.
- Import paths are consistent.
- Circular dependencies were avoided.
- No unnecessary abstractions were introduced.
- No unrelated refactoring was performed.
- The resulting structure is easy for another developer to understand.
