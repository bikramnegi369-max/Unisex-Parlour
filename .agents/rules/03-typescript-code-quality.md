---
trigger: always_on
---

# TypeScript & Code Quality Rules

All code in this project must follow strict, production-grade TypeScript and clean-code practices.

## TypeScript First

Use TypeScript throughout the project.

Do not write new JavaScript files when the existing project uses TypeScript.

Prefer strong typing over type assertions or unsafe casting.

The goal is to catch errors at compile time rather than at runtime.

## Avoid `any`

Do not use:

```ts
any;
```

Avoid:

```ts
as any
```

Do not use `any` simply to bypass TypeScript errors.

If a type is unknown, use appropriate alternatives such as:

```ts
unknown;
```

Then narrow the type safely.

Example:

```ts
const data: unknown = response.data;
```

Use type guards or validation to safely determine the actual type.

Only use `any` when absolutely unavoidable due to a third-party library or an unavoidable technical limitation.

If `any` is necessary, explain why.

## Avoid TypeScript Suppression

Do not use:

```ts
// @ts-ignore
```

or:

```ts
// @ts-expect-error
```

to hide TypeScript errors.

Fix the underlying type problem instead.

Only use suppression when there is a genuine and documented reason that cannot reasonably be resolved.

## Type Assertions

Avoid unnecessary type assertions.

Do not use:

```ts
const user = data as User;
```

simply to force TypeScript to accept the code.

Prefer:

- Proper API response typing
- Type guards
- Zod validation
- Type narrowing
- Correct generic types

Use type assertions only when the developer has sufficient knowledge that TypeScript cannot infer.

## Domain Types

Create meaningful domain types for application entities.

For example:

```ts
type WorkerStatus = "active" | "inactive" | "pending";

interface Worker {
  id: string;
  name: string;
  email: string;
  status: WorkerStatus;
}
```

Avoid using generic types such as:

```ts
type Data = any;
```

Prefer meaningful names such as:

```ts
Worker;
Project;
Client;
Timesheet;
HourEntry;
User;
```

## Single Source of Truth

Do not duplicate the same type definitions across multiple files.

If a domain type is shared across multiple parts of a feature, define it in the appropriate shared type location.

For example:

```text
features/
  workers/
    types/
      worker.types.ts
```

Reuse the type instead of redefining it.

## API Types

Type API request and response structures.

For example:

```ts
interface GetWorkersParams {
  page: number;
  limit: number;
  search?: string;
}

interface GetWorkersResponse {
  data: Worker[];
  total: number;
  page: number;
  limit: number;
}
```

Do not leave API response data untyped.

Do not assume API responses are correctly shaped without checking the existing API contract.

If the backend response is uncertain, clearly identify the assumption instead of silently inventing a type.

## Component Props

Always properly type component props.

Prefer:

```ts
interface WorkerCardProps {
  worker: Worker;
  onSelect: (workerId: string) => void;
}

function WorkerCard({ worker, onSelect }: WorkerCardProps) {
  // ...
}
```

Avoid:

```ts
function WorkerCard(props: any) {
  // ...
}
```

Use descriptive prop names.

Avoid overly generic prop names when the meaning is unclear.

## Event Types

Use appropriate React event types.

Examples:

```ts
React.ChangeEvent<HTMLInputElement>;
```

```ts
React.FormEvent<HTMLFormElement>;
```

```ts
React.MouseEvent<HTMLButtonElement>;
```

Do not use `any` for event handlers.

## Generic Components

Use generics for reusable components when they genuinely improve type safety.

For example, reusable data tables, selects, and lists may use generics.

Do not introduce generics unnecessarily.

Keep generic APIs understandable.

## Optional Properties

Use optional properties intentionally.

Do not mark every property as optional just to avoid TypeScript errors.

Bad:

```ts
interface User {
  id?: string;
  name?: string;
  email?: string;
}
```

if these values are actually required.

Prefer accurate types:

```ts
interface User {
  id: string;
  name: string;
  email: string;
}
```

Use optional properties only when the data can genuinely be absent.

## Null and Undefined

Handle `null` and `undefined` explicitly.

Do not blindly use non-null assertions:

```ts
user!.name;
```

unless the value is guaranteed to exist at that point.

Prefer safe handling:

```ts
if (!user) {
  return null;
}

return user.name;
```

## Enums vs Union Types

Prefer string union types for simple finite states when appropriate.

Example:

```ts
type Status = "active" | "inactive" | "pending";
```

Use enums only when they provide a clear benefit within the project's architecture.

Follow existing project conventions if enums are already established.

## Constants

Avoid magic numbers and magic strings when they represent meaningful business logic.

Bad:

```ts
if (status === "active") {
```

when `"active"` is repeated throughout the application without a consistent domain definition.

Prefer shared constants or domain types when appropriate.

Do not create constants for trivial one-time values unnecessarily.

## Function Design

Functions should have clear responsibilities.

Avoid functions that:

- Fetch API data
- Transform data
- Update global state
- Manage UI state
- Render UI

all at once.

Separate responsibilities when complexity requires it.

Prefer small, focused functions.

Do not split every simple operation into a separate function unnecessarily.

## Return Types

Allow TypeScript inference when it is clear and reliable.

Add explicit return types when they:

- Improve readability
- Define public APIs
- Clarify complex functions
- Prevent incorrect inference
- Improve reusable utility or service contracts

Do not add redundant return types to every trivial function.

## Naming

Use descriptive names.

Components:

```text
WorkerTable
WorkerForm
WorkerDetailsModal
```

Hooks:

```text
useWorkers
useWorkerFilters
useWorkerForm
```

Services:

```text
workers.api.ts
```

Schemas:

```text
worker.schema.ts
```

Types:

```text
worker.types.ts
```

Avoid vague names such as:

```text
data
item
obj
thing
temp
stuff
helper
utils
```

when a more meaningful name is possible.

## Boolean Naming

Boolean variables should clearly communicate true or false.

Prefer:

```ts
isLoading;
isActive;
hasPermission;
canEdit;
shouldRefetch;
```

Avoid:

```ts
loading;
active;
permission;
edit;
```

when the meaning is ambiguous.

## Clean Code

Do not leave:

- Unused imports
- Unused variables
- Dead code
- Commented-out code
- Temporary debugging code
- Unnecessary `console.log`
- Duplicate logic
- Unnecessary type assertions

Remove debugging statements before completing the implementation.

## Comments

Do not write comments that merely explain obvious code.

Bad:

```ts
// Set loading to true
setIsLoading(true);
```

Write comments only when they explain:

- Why something is done
- A complex business rule
- A non-obvious workaround
- A framework limitation
- A security consideration

Prefer self-explanatory code over excessive comments.

## Error Handling

Never hide TypeScript errors simply to make the project compile.

If a type error appears:

1. Understand the actual type mismatch.
2. Identify the root cause.
3. Fix the correct type.
4. Update the implementation if necessary.
5. Avoid suppressing the error.

## Before Completing Code

Verify:

- No unnecessary `any`
- No unnecessary type assertions
- No `@ts-ignore`
- No `@ts-expect-error`
- Props are correctly typed
- API requests and responses are typed
- Form values are typed
- Redux state is typed
- Hook parameters and return values are appropriate
- Null and undefined cases are handled
- No duplicate domain types were introduced
- No unused imports remain
- No dead code remains
- No debugging code remains

The final code should be strict, readable, and easy for another developer to maintain.
