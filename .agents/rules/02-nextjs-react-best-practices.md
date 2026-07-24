---
trigger: always_on
---

# Next.js & React Best Practices

Follow modern production-grade Next.js and React best practices when creating or modifying code in this project.

## Next.js App Router

This project uses the Next.js App Router.

Follow the App Router architecture correctly.

Use Server Components by default.

Only use Client Components when client-side functionality is actually required.

## Server Components

Prefer Server Components for:

- Static UI
- Server-side data fetching
- Page composition
- Layouts
- SEO-related content
- Components that do not require browser APIs
- Components that do not require React client-side state

Do not add `"use client"` to a component unless it is necessary.

## Client Components

Use `"use client"` only when the component requires:

- `useState`
- `useEffect`
- `useReducer`
- Event handlers
- Browser APIs
- Client-only libraries
- Redux hooks
- React Context that requires client-side state
- Interactive UI behavior

Keep the Client Component boundary as small as reasonably possible.

Prefer this architecture:

Server Component
↓
Small Client Component
↓
Interactive UI

Avoid turning an entire page or large component tree into a Client Component when only a small section requires client-side interactivity.

## Page Components

Keep `page.tsx` files focused on page-level composition.

Do not put large amounts of:

- Business logic
- API implementation
- Complex form logic
- Large table logic
- Reusable UI logic

directly inside page components.

Move complex logic into appropriate feature components, hooks, services, schemas, or utilities.

## Layout Components

Use layouts for shared page structure and persistent UI.

Do not duplicate common layout logic across multiple pages.

Reuse existing layouts whenever possible.

## Data Fetching

Choose the data-fetching strategy based on the requirements.

Prefer Server Components for server-side data fetching when client-side interaction is not required.

Use TanStack Query when client-side server-state management is required, such as:

- Client-side caching
- Refetching
- Mutations
- Cache invalidation
- Optimistic updates
- Client-side pagination
- Frequently changing data

Use Redux only when data genuinely belongs in global client state.

Do not automatically use Redux for every API response.

Do not fetch the same data multiple times unnecessarily.

## React State

Keep state as local as possible.

Use:

- `useState` for simple local state.
- `useReducer` for complex local state transitions.
- Redux Toolkit for appropriate global client state.
- TanStack Query for server state.
- URL search parameters for state that should be shareable or preserved in the URL.

Do not move local state into Redux without a clear reason.

Do not use global state for temporary UI state unless necessary.

## useEffect

Use `useEffect` only when synchronizing React with an external system.

Examples include:

- Browser APIs
- Event listeners
- Timers
- Subscriptions
- External libraries
- Non-React systems

Do not use `useEffect` unnecessarily.

Do not use `useEffect` to calculate values that can be derived during rendering.

Avoid patterns such as:

```ts
const [fullName, setFullName] = useState("");

useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);
```

Prefer:

```ts
const fullName = `${firstName} ${lastName}`;
```

Do not use `useEffect` to perform operations that can be handled directly during an event handler.

Do not use `useEffect` for data fetching if the project's established data-fetching architecture provides a better solution.

## Hooks

Follow the Rules of Hooks strictly.

Never call hooks:

- Inside conditions
- Inside loops
- Inside nested functions
- Inside callbacks that are not custom hooks

Hooks must always be called at the top level of React components or custom hooks.

Create custom hooks when logic is:

- Reused
- Complex
- Independent from the UI
- Related to a specific feature

Do not create custom hooks for trivial one-line logic.

## Event Handlers

Use semantic event handlers.

Prefer:

```tsx
<button onClick={handleDelete}>
```

over attaching click handlers to non-interactive elements.

Do not use `<div>` or `<span>` as buttons when a native `<button>` is appropriate.

## Derived Values

Do not store values in state if they can be derived from existing state or props.

Avoid unnecessary synchronization between multiple pieces of state.

Prefer a single source of truth.

## Memoization

Do not use `useMemo`, `useCallback`, or `React.memo` everywhere by default.

Use memoization only when it provides a meaningful benefit.

Appropriate use cases include:

- Expensive calculations
- Preventing unnecessary re-renders of expensive child components
- Maintaining stable references when required
- Performance-sensitive components

Do not memoize trivial calculations.

Do not add memoization simply because a component uses React hooks.

## Conditional Rendering

Keep conditional rendering readable.

Prefer early returns when they make the component easier to understand.

Avoid deeply nested ternary expressions.

If conditional UI becomes complex, extract it into a meaningful component.

## Lists

Always provide stable and meaningful `key` values when rendering lists.

Prefer unique database IDs or stable identifiers.

Do not use array indexes as keys when the list can change order, be filtered, inserted into, or deleted from.

Avoid generating random keys during rendering.

## Forms

Use the project's established form architecture.

Prefer React Hook Form for complex forms.

Use Zod for schema validation where applicable.

Do not manually manage every form input with separate `useState` unless there is a specific reason.

## Error Handling

Handle asynchronous operations appropriately.

Do not silently ignore errors.

Provide appropriate:

- Loading states
- Error states
- Empty states
- Success states

Do not expose raw technical errors to users.

## Performance

Avoid unnecessary:

- Client Components
- Re-renders
- API requests
- State updates
- Effects
- Context updates
- Large JavaScript bundles

Use dynamic imports only for genuinely heavy components or client-only functionality where appropriate.

Use Next.js optimized image handling for application images.

Do not prematurely optimize simple components.

## Accessibility

Use semantic HTML.

Prefer native HTML elements when possible.

Use:

- `<button>` for actions
- `<a>` or Next.js `<Link>` for navigation
- `<form>` for forms
- Proper headings
- Proper labels for inputs

Ensure interactive elements are keyboard accessible.

Do not use a clickable `<div>` when a semantic interactive element is appropriate.

## Internal Navigation

Use Next.js `<Link>` for internal application navigation.

Do not use plain `<a href>` for internal routes when Next.js client-side navigation is appropriate.

## Final Rule

Before implementing any React or Next.js feature, determine:

1. Does this need a Server Component?
2. Does this need a Client Component?
3. Does this need local state?
4. Does this need global state?
5. Is this server state?
6. Does this need TanStack Query?
7. Is `useEffect` actually necessary?
8. Can existing components or hooks be reused?

Always choose the simplest architecture that satisfies the requirements while maintaining production-level quality.
