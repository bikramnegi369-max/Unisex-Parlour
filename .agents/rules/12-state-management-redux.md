---
trigger: model_decision
description: Apply when working on Redux Toolkit, slices, actions, reducers, selectors, global state, client state, TanStack Query integration, state synchronization, or deciding where application state should be stored.
---

# State Management & Redux Toolkit Rules

Use the simplest appropriate state-management solution for each type of state.

The project uses React state, Redux Toolkit, and TanStack Query where appropriate.

## Choose the Correct State Type

Before adding state, determine what type of state it is.

### Local UI State

Use React `useState` for state used by a small component or isolated UI.

Examples:

- Modal open/close
- Drawer open/close
- Dropdown state
- Temporary input state
- Local toggle
- Selected item within a component

Do not put simple local UI state into Redux.

### Server State

Use TanStack Query for server state when appropriate.

Examples:

- Workers
- Projects
- Clients
- Hours
- Reports
- API responses

Server state usually benefits from:

- Caching
- Refetching
- Query invalidation
- Mutations
- Background synchronization

Do not automatically copy API data into Redux.

### Global Client State

Use Redux Toolkit when state is genuinely shared across multiple unrelated parts of the application.

Examples may include:

- Authentication state
- Global application preferences
- Complex multi-step workflows
- Cross-feature client state
- Global UI state when required by the architecture

Follow the existing project architecture before introducing Redux.

## Before Creating Redux State

Before creating a new slice:

1. Check whether the state already exists.
2. Check existing Redux slices.
3. Check whether the state is actually server state.
4. Check whether local React state is sufficient.
5. Check whether URL state is more appropriate.
6. Check whether TanStack Query should manage the data.

Do not create Redux state simply because a feature needs API data.

## Single Source of Truth

Avoid storing the same state in multiple systems unnecessarily.

Do not duplicate the same data across:

- React state
- Redux
- TanStack Query
- URL parameters

unless there is a deliberate architectural reason.

Multiple sources of truth can cause synchronization bugs.

## Redux Toolkit

Use Redux Toolkit for Redux implementation.

Prefer:

- `createSlice`
- `createAsyncThunk` when appropriate
- Typed selectors
- Typed dispatch
- Immer-powered reducers

Follow existing project conventions.

Do not use legacy Redux patterns unless required by existing code.

## Slice Structure

Keep slices focused on a clear domain or responsibility.

Prefer:

```text
workersSlice
projectsSlice
hoursSlice
```

Avoid a single massive global slice containing unrelated application state.

Do not create one slice for every tiny piece of UI state.

## State Shape

Keep Redux state normalized and predictable when appropriate.

Avoid deeply nested state when it makes updates difficult.

Do not duplicate the same entity data unnecessarily.

For large collections, consider normalized structures when the application's requirements justify them.

## Actions

Use meaningful action names.

Prefer:

```text
workerAdded
workerUpdated
workerRemoved
```

over vague actions such as:

```text
setData
updateData
changeState
```

Actions should communicate what happened.

## Reducers

Reducers should remain predictable and focused on state transitions.

Do not put API calls directly inside reducers.

Do not perform side effects inside reducers.

Reducers should not:

- Call APIs
- Access browser APIs
- Trigger notifications
- Perform asynchronous operations

## Async Operations

Use the project's established approach for asynchronous Redux operations.

If Redux Toolkit async thunks are already used, follow that pattern.

For server state that requires caching and synchronization, prefer TanStack Query rather than creating Redux async logic unnecessarily.

Do not use Redux async actions merely to duplicate TanStack Query functionality.

## Selectors

Use selectors to access Redux state.

Prefer focused selectors over passing large sections of the Redux store throughout the component tree.

Example:

```ts
const workers = useSelector(selectWorkers);
```

Avoid unnecessarily selecting the entire Redux state.

Selecting only required state helps reduce unnecessary re-renders.

## Typed Redux Hooks

Use the project's typed Redux hooks.

Prefer established typed hooks such as:

```ts
useAppDispatch();
useAppSelector();
```

when available.

Do not repeatedly define custom Redux types inside individual components.

## Derived Data

Do not store values in Redux if they can be safely derived from existing state.

For example, avoid storing:

```text
totalWorkers
```

if it can always be calculated from:

```text
workers.length
```

Avoid duplicating derived state unless there is a clear performance or architectural reason.

## State Updates

Keep state updates predictable.

Do not mutate Redux state outside reducers.

Use Redux Toolkit's supported immutable update patterns.

Avoid manually cloning large objects unnecessarily when Immer can handle the update.

## Resetting State

Define clear reset behavior for temporary or workflow-specific state.

For example, after completing a multi-step process, reset temporary workflow state when appropriate.

Do not leave stale state that can affect future operations.

## Persistence

Do not persist Redux state automatically.

Only persist state that genuinely needs to survive page reloads.

Never persist sensitive data unnecessarily.

Follow the existing project's persistence architecture.

## URL State

Use URL search parameters for state that should be:

- Shareable
- Bookmarkable
- Preserved on refresh
- Navigable through browser history

Examples:

- Search
- Filters
- Pagination
- Sorting
- Active tab

Do not store URL-driven state in Redux unless there is a strong architectural reason.

## Redux and TanStack Query

Do not maintain duplicate server data in both Redux and TanStack Query without a deliberate reason.

Prefer:

```text
Server Data
→ TanStack Query

Global Client State
→ Redux Toolkit

Local UI State
→ React useState

Shareable Navigation State
→ URL Search Params
```

Follow existing project conventions if the application already has a specific architecture.

## Performance

Avoid unnecessary Redux subscriptions.

Select only the state required by a component.

Do not subscribe to the entire Redux store when only one value is needed.

Avoid storing rapidly changing local UI state globally.

## Component Responsibilities

Components should not contain excessive Redux logic.

Prefer:

Component
→ Custom Hook / Selector
→ Redux State

Keep complex state logic in appropriate slices, selectors, or hooks.

Do not put large state transformation logic directly into JSX.

## Debugging

When debugging Redux:

- Inspect actions.
- Inspect state transitions.
- Check whether the correct slice is updated.
- Check whether the component subscribes to the correct selector.
- Check whether stale state is being used.

Do not fix state synchronization problems by adding random duplicate state.

Identify the actual source of truth first.

## Final Check

Before completing state-management work, verify:

- The correct state-management solution was chosen.
- Local state is not unnecessarily global.
- Server state is not unnecessarily duplicated in Redux.
- Existing Redux architecture was reused.
- Redux Toolkit patterns are followed.
- Slices have clear responsibilities.
- Reducers contain no side effects.
- Async logic follows existing conventions.
- Selectors are focused.
- Typed Redux hooks are used.
- Derived state is not unnecessarily duplicated.
- URL state is used when appropriate.
- Sensitive data is not unnecessarily persisted.
- No duplicate sources of truth were introduced.
