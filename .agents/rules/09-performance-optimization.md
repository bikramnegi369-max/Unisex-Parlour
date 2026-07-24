---
trigger: model_decision
description: Apply when working on performance, Core Web Vitals, rendering, re-renders, bundle size, images, fonts, dynamic imports, caching, API requests, large lists, or optimizing slow pages and components.
---

# Performance & Optimization Rules

Build performant Next.js and React applications without sacrificing maintainability or user experience.

Optimize based on actual performance needs and avoid premature optimization.

## General Principles

Before optimizing:

1. Identify the actual performance problem.
2. Inspect the existing implementation.
3. Measure or reason about the bottleneck.
4. Apply the smallest effective optimization.
5. Avoid unnecessary complexity.

Do not optimize code without a meaningful reason.

Do not sacrifice readability for insignificant performance gains.

## Server vs Client Components

Use React Server Components by default in the Next.js App Router.

Add `"use client"` only when the component requires:

- React state
- React effects
- Event handlers
- Browser APIs
- Client-only libraries
- Client-side interactions

Keep client boundaries as small as practical.

Do not add `"use client"` to entire page trees unnecessarily.

Avoid converting server components to client components simply to access data that can be passed as props.

## Data Fetching

Fetch data in the appropriate layer.

Prefer server-side data fetching when the data does not require client-side interactivity.

Use client-side data fetching when the UI requires:

- Interactive refetching
- Client-side caching
- Mutations
- Real-time updates
- User-driven filtering

Avoid duplicate API requests for the same data.

Do not fetch data in multiple nested components when it can be efficiently fetched once and shared.

## API Request Optimization

Avoid unnecessary API requests.

Do not repeatedly fetch the same data without a reason.

Use appropriate caching and query mechanisms.

For client-side server state, follow the existing TanStack Query architecture.

For rapidly changing search inputs, debounce requests when appropriate.

Do not trigger API requests from render logic.

## Parallel Data Fetching

When multiple independent requests are required, avoid unnecessary sequential execution.

Prefer parallel execution when requests do not depend on one another.

Example:

```ts id="6v1l3k"
const [workers, projects] = await Promise.all([getWorkers(), getProjects()]);
```

Do not use sequential `await` calls when the operations are independent and parallel execution is safe.

If one request depends on another, keep the required sequence.

## React Rendering

Avoid unnecessary re-renders.

Check component structure before adding optimization hooks.

Prefer improving component boundaries and state placement before adding memoization.

Do not place frequently changing state unnecessarily high in the component tree.

Keep state as close as practical to the components that use it.

## useMemo and useCallback

Do not use `useMemo` or `useCallback` automatically.

Use them when they provide a meaningful benefit, such as:

- Expensive calculations
- Stable references required by memoized children
- Expensive derived data
- Large table column definitions when appropriate

Do not wrap every function or value in `useMemo` or `useCallback`.

Avoid adding memoization solely because it appears in an example.

## React.memo

Use `React.memo` only when there is a demonstrated or likely benefit.

Do not wrap every component with `React.memo`.

Prefer fixing unnecessary parent renders and state placement first.

## Lists

For lists:

- Use stable keys.
- Avoid unnecessary rendering of large lists.
- Use pagination for large datasets.
- Consider virtualization for extremely large lists when appropriate.

Never use array indexes as keys when list items can be reordered, inserted, or removed.

Prefer stable unique IDs.

## Tables

For large tables:

- Prefer server-side pagination.
- Prefer server-side filtering.
- Prefer server-side sorting.
- Avoid loading unnecessary records.
- Avoid expensive calculations during every render.

Use virtualization only when the dataset size and UX justify it.

Follow the project's existing table architecture.

## Images

Use Next.js image optimization where appropriate.

Prefer the project's established image component and image utilities.

Optimize images by:

- Using appropriate dimensions.
- Using appropriate formats.
- Avoiding unnecessarily large source files.
- Providing meaningful `alt` text.
- Using priority loading only for critical above-the-fold images.

Do not mark every image as priority.

Do not load large images when a smaller image is sufficient.

Avoid layout shifts by providing appropriate image dimensions or aspect ratios.

## Above-the-Fold Content

Prioritize critical content required for the initial viewport.

Avoid delaying important content unnecessarily.

Do not lazy-load content that is immediately visible when it negatively affects the user experience.

Do not preload resources unless they are genuinely critical.

## Fonts

Use the project's established Next.js font strategy.

Avoid loading unnecessary font families or weights.

Only include font weights that are actually used.

Avoid external font loading when the project already uses a local or optimized font strategy.

Do not load many font variants unnecessarily.

## Dynamic Imports

Use dynamic imports when they provide a meaningful performance benefit.

Good candidates may include:

- Heavy client-only libraries
- Rich editors
- Charts
- Large visualization libraries
- Components not required for initial rendering

Do not dynamically import every component.

Do not introduce dynamic imports solely for the sake of optimization.

## Bundle Size

Avoid unnecessary dependencies.

Before adding a package:

1. Check whether the project already has a suitable solution.
2. Check whether the functionality can be implemented simply with existing tools.
3. Consider the package's bundle impact.
4. Follow existing project conventions.

Do not add large libraries for simple functionality.

Avoid importing an entire large library when a smaller or specific import is available.

## JavaScript Execution

Avoid expensive work during rendering.

Do not perform:

- Large loops
- Heavy transformations
- Complex calculations

directly inside JSX when they can be safely computed elsewhere.

Do not use `Math.random()` or other unstable values during render when they cause unnecessary re-renders or hydration inconsistencies.

Keep render functions predictable.

## Hydration

Avoid hydration mismatches.

Do not render browser-only values directly during server rendering.

For browser-specific APIs such as:

- `window`
- `document`
- `localStorage`
- `sessionStorage`

use appropriate client-side handling.

Do not use browser APIs during server rendering.

Be careful with:

- Current timestamps
- Random values
- Locale-dependent formatting
- Client-only data

## Effects

Do not use `useEffect` for logic that can be handled during rendering or event handlers.

Avoid unnecessary effects.

Common cases where an effect may be unnecessary:

- Deriving data from props.
- Computing filtered arrays.
- Updating state based on another state when the value can be derived.
- Handling user actions that belong in event handlers.

Use effects for genuine synchronization with external systems.

## State Management

Keep state as local as possible.

Avoid placing temporary UI state in global state.

Do not duplicate the same state across:

- React state
- Redux
- URL parameters
- TanStack Query

unless there is a deliberate reason.

Duplicate sources of truth can cause unnecessary renders and synchronization problems.

## Caching

Use appropriate caching strategies for data that does not need to be fetched repeatedly.

Follow the project's existing Next.js and TanStack Query caching architecture.

Do not disable caching globally to solve a single stale-data problem.

Instead, identify the correct cache or revalidation strategy.

## Loading Experience

Optimize perceived performance as well as raw performance.

Use:

- Skeleton loading
- Progressive rendering
- Streaming where appropriate
- Localized loading states

Avoid unnecessary full-page loading states when only a small section is loading.

## Core Web Vitals

When optimizing public-facing pages, consider:

- LCP
- CLS
- INP

Pay particular attention to:

- Large hero images
- Font loading
- Render-blocking resources
- Layout shifts
- Excessive client-side JavaScript
- Long-running main-thread work

Do not optimize based only on Lighthouse scores without understanding the actual bottleneck.

## Performance vs Maintainability

Performance optimizations must remain understandable.

Prefer:

```text
Simple + Fast + Maintainable
```

over:

```text
Complex + Slightly Faster
```

Do not introduce complicated caching, memoization, or abstraction without a clear benefit.

## Final Check

Before completing performance-related work, verify:

- Server Components are used where appropriate.
- Client Components are limited to necessary boundaries.
- API requests are not duplicated unnecessarily.
- Independent requests run in parallel when appropriate.
- Large datasets are paginated.
- Search requests are debounced when appropriate.
- Images are optimized.
- Fonts are not unnecessarily duplicated.
- Large libraries are loaded only when needed.
- Dynamic imports are used appropriately.
- Unnecessary re-renders are avoided.
- `useMemo` and `useCallback` are not overused.
- Stable keys are used for lists.
- Browser-only APIs do not cause hydration issues.
- Unnecessary `useEffect` usage is avoided.
- No unnecessary dependencies are introduced.
- Performance improvements do not significantly reduce code maintainability.
