---
trigger: model_decision
description: Apply when working on data tables, TanStack Table, pagination, filtering, search, sorting, column visibility, row selection, exports, table loading, empty/error states, or table API requests.
---

# Data Tables, Filtering, Sorting & Pagination Rules

Follow production-grade practices when creating or modifying data tables in this project.

Use the project's existing reusable table architecture whenever available.

## Before Creating a Table

Before creating a new table:

1. Check whether a reusable DataTable or GlobalTable already exists.
2. Inspect existing table implementations.
3. Reuse existing pagination, sorting, filtering, selection, and column functionality.
4. Follow existing table styling and UX patterns.
5. Check existing API services and hooks.
6. Check whether server-side filtering, sorting, and pagination are already supported.

Do not create a new table abstraction if an existing reusable table can be extended.

## Table Responsibilities

Keep table responsibilities separated.

The table component should primarily handle:

- Rendering columns
- Rendering rows
- User interactions
- Table UI states

Keep API communication in API services or query hooks.

Keep complex filtering logic outside the table when appropriate.

Keep business logic outside table rendering code.

## Large Datasets

For large datasets, prefer server-side:

- Pagination
- Filtering
- Searching
- Sorting

Do not fetch thousands of records into the browser only to paginate or filter them client-side when the backend supports these operations.

Preferred flow:

User changes filter
→ Update filter state or URL
→ Fetch API with parameters
→ Backend processes query
→ Return required records
→ Update table

## Pagination

Use server-side pagination for large datasets.

Follow the backend's existing pagination contract.

Use the existing API parameter names.

Common parameters may include:

- `page`
- `limit`
- `offset`

Do not invent pagination parameters without checking the backend contract.

Handle:

- Current page
- Page size
- Total records
- Total pages
- First page
- Last page
- Previous page
- Next page

Prevent invalid page navigation.

If filters or search criteria change, reset pagination appropriately when required.

## Filtering

Use server-side filtering for large datasets when supported.

Do not duplicate filter logic in multiple places.

Keep filter state predictable.

When multiple filters are applied, send them using the backend's expected format.

Handle:

- Single-select filters
- Multi-select filters
- Date filters
- Date ranges
- Status filters
- Search
- Numeric filters

Provide a clear way to reset filters.

When resetting filters, reset the associated pagination state when appropriate.

## Search

For API-backed search:

- Debounce user input when appropriate.
- Avoid unnecessary API requests.
- Do not send a request for every keystroke unless explicitly required.
- Handle empty search values correctly.
- Reset pagination when search criteria changes if appropriate.

Show the active search value clearly.

## Sorting

For large datasets, prefer server-side sorting.

Send sorting information according to the backend API contract.

Keep sorting state synchronized with the API request.

Handle:

- Sort field
- Sort direction
- Ascending order
- Descending order

Do not assume the backend accepts arbitrary field names.

Use a controlled mapping when necessary.

## URL State

Use URL search parameters for table state when appropriate.

Good candidates include:

- Search
- Filters
- Pagination
- Sort field
- Sort direction
- Selected tab

Example:

```text
/workers?page=2&search=john&status=active&sort=name&order=asc
```

URL state is preferred when the state should be:

- Shareable
- Bookmarkable
- Preserved after refresh
- Navigable using browser history

Avoid maintaining duplicate state between URL parameters and local React state unnecessarily.

## Table Loading State

Clearly distinguish between:

- Initial loading
- Refetching
- Mutating
- Empty results
- Errors
- Successful data

Do not display "No records found" while the table is still loading.

Prefer skeleton rows or an appropriate loading state.

During refetching, avoid unnecessarily removing already displayed data unless the UX requires it.

## Empty State

Display an appropriate empty state when the API successfully returns no records.

Differentiate between:

- No records exist.
- No records match the current filters.
- No records match the search query.

When appropriate, provide actions such as:

- Clear filters
- Clear search
- Add new record

## Error State

If the table API request fails:

- Show a user-friendly error message.
- Provide a retry action when appropriate.
- Do not expose raw Axios errors.
- Do not expose backend stack traces.

Do not confuse an API error with an empty dataset.

## Columns

Use meaningful column definitions.

Avoid unnecessary columns.

Prioritize important information.

For complex tables, consider:

- Column visibility
- Resizable columns
- Sticky action columns
- Horizontal scrolling

Follow the project's existing reusable table capabilities.

## Actions

Keep row actions clear and predictable.

Common actions may include:

- View
- Edit
- Delete
- More actions

Do not place excessive actions directly in every row.

Use a menu for secondary actions when appropriate.

For destructive actions:

- Require confirmation when appropriate.
- Clearly communicate what will happen.
- Show loading state during deletion.
- Handle errors gracefully.

## Row Selection

If row selection is supported:

- Clearly indicate selected rows.
- Provide select-all behavior.
- Handle pagination correctly.
- Do not assume selecting all visible rows means selecting all records across the entire dataset.

For bulk actions, clearly communicate whether the action applies to:

- Selected visible rows
- Selected records across pages
- All matching records

## Data Export

When exporting data:

- Follow the project's existing export architecture.
- Consider whether export should be client-side or server-side.
- Do not load extremely large datasets into browser memory unnecessarily.
- Respect active filters and sorting when the expected behavior requires it.
- Provide loading feedback for long-running exports.

## Performance

Avoid unnecessary table re-renders.

Do not recreate expensive column definitions unnecessarily.

Do not use `useMemo` or `useCallback` blindly.

Use memoization when it provides a meaningful performance benefit.

For very large datasets, consider virtualization only when necessary and supported by the existing architecture.

## API Integration

Do not call APIs directly from table cell render functions.

Do not put API requests inside column definitions.

Use the project's established API service and query architecture.

Prefer:

Table
→ Query Hook
→ API Service
→ Axios
→ Backend

## Mutations From Tables

For actions such as delete, update, or status changes:

1. Show action loading state.
2. Prevent duplicate actions.
3. Call the API.
4. Handle success.
5. Handle errors.
6. Update or invalidate affected table data.
7. Preserve active filters and pagination when appropriate.

Do not reload the entire browser after a table mutation unless there is a specific reason.

## Responsive Tables

Tables must be usable on:

- Mobile
- Tablet
- Desktop

For smaller screens, choose an appropriate strategy:

- Horizontal scrolling
- Responsive column visibility
- Priority columns
- Alternative card layout

Do not allow critical table actions to become inaccessible on mobile.

## Accessibility

Tables must be accessible.

Ensure:

- Meaningful column headers
- Keyboard-accessible controls
- Accessible buttons
- Visible focus states
- Clear labels for filters and search
- Accessible pagination controls

Do not rely only on color to communicate table status.

## Final Check

Before completing table-related work, verify:

- Existing reusable table components were checked.
- API services and hooks were checked.
- Server-side pagination is used when appropriate.
- Server-side filtering is used when appropriate.
- Server-side sorting is used when appropriate.
- Search is debounced when appropriate.
- Loading state is handled.
- Empty state is handled.
- Error state is handled.
- Filters can be cleared.
- Pagination behaves correctly after filtering.
- Table actions prevent duplicate requests.
- Mutations update or invalidate affected data.
- Responsive behavior is considered.
- Accessibility is considered.
- No duplicate table logic was introduced.
