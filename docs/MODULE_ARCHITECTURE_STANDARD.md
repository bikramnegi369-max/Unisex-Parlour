# Module Architecture Standard

```
Status: Canonical
Reference Modules: Customer, Services
Scope: All future ERP modules
Last Updated: 2026-08-05
```

---

## Table of Contents

1. [Document Purpose](#1-document-purpose)
2. [Architecture Principles](#2-architecture-principles)
3. [Canonical Module Structure](#3-canonical-module-structure)
4. [API Layer Standard](#4-api-layer-standard)
5. [TypeScript Types Standard](#5-typescript-types-standard)
6. [Validation Standard](#6-validation-standard)
7. [React Query / Server State Standard](#7-react-query--server-state-standard)
8. [Branch Scoping Standard](#8-branch-scoping-standard)
9. [RBAC / Permission Standard](#9-rbac--permission-standard)
10. [Table / List Architecture](#10-table--list-architecture)
11. [Pagination Standard](#11-pagination-standard)
12. [Entity Profile / Detail Page Standard](#12-entity-profile--detail-page-standard)
13. [CRUD Standard](#13-crud-standard)
14. [Lifecycle / Status Standard](#14-lifecycle--status-standard)
15. [Reusable Shared Components](#15-reusable-shared-components)
16. [Hooks Standard](#16-hooks-standard)
17. [Form Architecture](#17-form-architecture)
18. [UI/UX Standard](#18-uiux-standard)
19. [Naming Conventions](#19-naming-conventions)
20. [Backend Architecture Standard](#20-backend-architecture-standard)
21. [Data Model Standard](#21-data-model-standard)
22. [Audit / History / Notes Standard](#22-audit--history--notes-standard)
23. [Error Handling Standard](#23-error-handling-standard)
24. [Security Standard](#24-security-standard)
25. [Performance Standard](#25-performance-standard)
26. [Testing Standard](#26-testing-standard)
27. [Production Readiness Checklist](#27-production-readiness-checklist)
28. [New Module Implementation Workflow](#28-new-module-implementation-workflow)
29. [Architecture Audit Checklist](#29-architecture-audit-checklist)
30. [AI Coding Agent Instructions](#30-ai-coding-agent-instructions)
31. [Decision Log](#31-decision-log)
32. [Customer + Services Reference Matrix](#32-customer--services-reference-matrix)

---

## 1. Document Purpose

### Why This Standard Exists

The Customer and Services modules were the first ERP modules to be fully implemented, audited, and architecturally standardized. During that process, recurring patterns, conventions, and production-readiness requirements emerged that apply universally to all future ERP modules.

This document formalizes those patterns into a canonical reference so that every future module follows the same architecture. Without this standard, each new module risks introducing inconsistent API contracts, duplicated shared components, divergent query key strategies, ad-hoc validation, and architectural drift that becomes increasingly expensive to correct.

### Why Customer and Services Are the Reference Modules

- **Customer** is the most complex reference module: it demonstrates entity profiles, notes, activity/audit logs, tabbed detail pages, multi-field validation, branch scoping with `homeBranchId`/`visitedBranchIds`, lifecycle status, and full CRUD with deactivation/reactivation.
- **Services** demonstrates a multi-entity module (Services + Service Categories), sub-resource organization within hooks and components, the `useEntityMutation` shared abstraction, status toggling via `PATCH`, and domain-specific filter types.

Together they cover all major architectural patterns future modules will need.

### Who Should Follow This Standard

- All developers (frontend and backend) building new ERP modules.
- AI coding agents implementing, auditing, or modifying ERP modules.
- Code reviewers evaluating PRs against architectural standards.

### When This Standard Applies

This standard applies whenever:

- A new ERP module is being created.
- An existing module is being audited for architectural compliance.
- Shared infrastructure is being extended for a new module.

### Severity Levels

Throughout this document, three severity levels are used:

#### MUST

Rules that future modules are **required** to follow. Deviation requires explicit justification and team approval before implementation.

#### SHOULD

Strong recommendations that **should normally** be followed. Deviation is acceptable when a documented technical reason exists, but the default behavior is to comply.

#### MAY

Optional patterns that **can be used** when they fit the module's requirements. Not following them is perfectly acceptable.

---

## 2. Architecture Principles

### Separation of Concerns

**MUST.** Every layer has a single responsibility:

```
API Layer     → HTTP communication and response normalization
Hook Layer    → React Query orchestration, permission gating, branch scoping
Component Layer → UI rendering, form state, user interaction
Schema Layer  → Validation rules (Zod)
Type Layer    → TypeScript domain type definitions
Config Layer  → Routes, permissions, labels, defaults
Column Layer  → Table column definitions
```

Business logic does not belong in components. API communication does not belong in hooks beyond calling the API function.

### Feature-Based Architecture

**MUST.** All module code lives under `src/features/<module>/` organized by concern (api, hooks, types, schemas, components, columns, config). Shared code lives under `src/components/`, `src/lib/`, `src/hooks/`, and `src/types/`.

**Reasoning:** Feature isolation makes modules self-contained and independently navigable. Shared code is only promoted to shared directories when genuinely used by multiple features.

### Reusability

**MUST.** Before creating any component, hook, utility, or abstraction, check whether a shared version already exists. Shared entity components (`EntityActionMenu`, `DeactivateDialog`, `ReactivateDialog`, `EntityProfileLayout`), shared UI components (`DataTable`, `Pagination`, `EmptyState`, `ErrorState`), and shared API utilities (`useEntityMutation`, `getScopeQueryKey`, `getErrorMessage`, `mapBackendValidationErrors`) exist specifically to prevent duplication.

### Consistency

**MUST.** All modules must follow identical patterns for API contracts, query keys, hooks, validation, RBAC checks, and lifecycle management. Consistency is what makes the codebase predictable.

### Type Safety

**MUST.** All API requests, responses, form values, and domain entities must be typed. Avoid `any` unless interacting with an untyped third-party boundary, and document the reason.

### Centralized Validation

**MUST.** Validation schemas (Zod) live in `schemas/` within the feature. Schemas are the single source of truth for form validation. Backend validation is complementary, not a replacement.

### API Contract Consistency

**MUST.** All modules use `ApiResponse<T>` for single-entity responses and `PaginatedResponse<T>` for list responses. Do not invent module-specific response wrappers.

### Branch Awareness

**MUST.** All branch-scoped data queries must use `getBranchQueryKey()` from `useBranchContext()`. All branch-scoped API calls must include `branchScope: "current"`. Static query keys without branch scoping are not permitted for branch-scoped data.

### RBAC

**MUST.** Frontend permission checks are UX protection only. The backend is the final authority. Use `hasPermission()` from `@/lib/permissions` for UI gating. Never use role names as permission proxies.

### Server-State Management

**MUST.** API data is server state managed by TanStack React Query. Redux is reserved for client-only global state (UI state, branch selection). Never store API responses in Redux.

### URL State

**SHOULD.** Pagination page, search terms, and filter values should be reflected in URL search parameters when practical, making lists shareable and bookmarkable.

### Accessibility

**SHOULD.** Use semantic HTML elements (`<button>`, `<a>`, `<form>`, `<nav>`). Provide `aria-label` attributes for icon-only buttons. Ensure keyboard navigation works for interactive elements.

### Production Readiness

**MUST.** Every module must handle loading states, empty states, error states, and destructive action confirmations before being considered complete.

### Avoiding Unnecessary Abstraction

**SHOULD.** Do not create abstractions for single-use logic. Abstractions earn their complexity only when used across multiple consumers or when they meaningfully simplify a complex operation (e.g., `useEntityMutation`).

### Avoiding Duplicated Business Logic

**MUST.** If a pattern already exists in shared infrastructure, use it. Do not re-implement pagination, entity action menus, deactivation/reactivation dialogs, or query key generation locally.

---

## 3. Canonical Module Structure

Based on inspection of both Customer and Services modules, the approved feature structure is:

```
src/features/<module>/
├── api/                    # API service functions (MUST)
│   └── <entity>.api.ts
├── types/                  # TypeScript domain type definitions (MUST)
│   └── <entity>.types.ts
├── schemas/                # Zod validation schemas (MUST)
│   └── <entity>.schema.ts
├── hooks/                  # React Query hooks (MUST)
│   ├── use<Entity>.ts
│   ├── use<Entities>.ts
│   ├── useCreate<Entity>.ts
│   ├── useUpdate<Entity>.ts
│   ├── useDelete<Entity>.ts
│   └── useReactivate<Entity>.ts
├── components/             # React components (MUST)
│   ├── <Entity>List.tsx
│   ├── <Entity>Form.tsx
│   ├── <Entity>DetailsPage.tsx  (or <Entity>ProfilePage.tsx)
│   ├── <Entity>ProfileHeader.tsx
│   ├── <Entity>Filters.tsx
│   ├── <Entity>Search.tsx
│   ├── <Entity>MobileCard.tsx
│   ├── <Entity>DeleteDialog.tsx
│   ├── <Entity>ReactivateDialog.tsx
│   └── ...
├── columns/                # TanStack Table column definitions (MUST)
│   └── <entity>Columns.tsx
├── config/                 # Module configuration (MUST)
│   └── <module>.config.ts
├── constants/              # Domain constants (MAY)
│   └── <entity>.constants.ts
└── __tests__/              # Unit/integration tests (SHOULD)
    └── <module>.test.tsx
```

### Directory Responsibilities

| Directory | Mandatory | Contains | Must NOT Contain |
|-----------|-----------|----------|------------------|
| `api/` | MUST | API service functions, request/response normalization, param interfaces | React components, hooks, UI logic |
| `types/` | MUST | Domain entity interfaces, API response types, payload types | Zod schemas, React components |
| `schemas/` | MUST | Zod validation schemas, form value type inference | API calls, business logic |
| `hooks/` | MUST | React Query `useQuery`/`useMutation` hooks | API implementation, UI rendering |
| `components/` | MUST | React components (list, form, detail, filters) | API calls (must go through hooks), domain types |
| `columns/` | MUST | TanStack Table `ColumnDef` arrays | Business logic, API calls |
| `config/` | MUST | Routes, permissions, labels, defaults | Business logic, component code |
| `constants/` | MAY | Enums, magic values, domain-specific constants | Business logic |
| `__tests__/` | SHOULD | Vitest test files | Production application code |

### Multi-Entity Modules

When a module manages multiple related entities (like Services managing both Services and Service Categories), sub-organize hooks and components:

```
src/features/services/
├── hooks/
│   ├── services/           # Service entity hooks
│   │   ├── useServices.ts
│   │   ├── useService.ts
│   │   └── ...
│   └── categories/         # Category entity hooks
│       ├── useServiceCategories.ts
│       └── ...
├── components/
│   ├── common/             # Shared/primary components
│   │   ├── ServicesList.tsx
│   │   ├── ServiceProfilePage.tsx
│   │   └── ...
│   ├── services/           # Service-specific components
│   │   └── ServiceForm.tsx
│   └── service-categories/ # Category-specific components
│       └── ServiceCategoryForm.tsx
├── api/
│   ├── services.api.ts
│   └── serviceCategories.api.ts
├── schemas/
│   ├── service.schema.ts
│   └── serviceCategory.schema.ts
└── types/
    ├── service.types.ts
    ├── category.types.ts
    └── filters.types.ts
```

### Naming Conventions

- **Feature folder:** Lowercase plural — `customers`, `services`, `appointments`
- **API file:** `<entity>.api.ts` — `customers.api.ts`, `services.api.ts`
- **Type file:** `<entity>.types.ts` — `customer.types.ts`, `service.types.ts`
- **Schema file:** `<entity>.schema.ts` — `customer.schema.ts`, `service.schema.ts`
- **Column file:** `<entity>Columns.tsx` — `customerColumns.tsx`, `serviceColumns.tsx`
- **Config file:** `<module>.config.ts` — `customers.config.ts`, `services.config.ts`
- **Hooks:** `use<Action><Entity>.ts` — `useCustomers.ts`, `useCreateCustomer.ts`
- **Components:** PascalCase — `CustomerList.tsx`, `ServiceForm.tsx`

---

## 4. API Layer Standard

### Location

**MUST** live in `src/features/<module>/api/<entity>.api.ts`.

### Axios Client

**MUST** use the centralized `apiClient` imported from `@/lib/api/axios`.

```ts
import { apiClient } from "@/lib/api/axios";
```

Never create a new Axios instance inside a feature module.

### Branch Scoping

**MUST** pass `branchScope: "current"` on all branch-scoped API calls:

```ts
const { data } = await apiClient.get<PaginatedResponse<Entity>>("/entities", {
  params,
  branchScope: "current",
});
```

The Axios interceptor automatically reads the current branch from Redux and sets the `X-Branch-Id` header. The API layer does not need to manually inject branch IDs.

### Response Types

**MUST** use the shared response types from `@/types/api.types.ts`:

```ts
import type { ApiResponse, PaginatedResponse } from "@/types/api.types";
```

- `ApiResponse<T>` — single entity responses (detail, create, update)
- `PaginatedResponse<T>` — list responses with pagination metadata

### PaginatedResponse Contract

```ts
interface PaginatedResponse<T> {
  success: boolean;
  status: string;
  message?: string;
  data: T[];
  meta?: {
    total: number;
    page: string | number;
    limit: string | number;
    totalPages: number;
  };
}
```

All list API functions **MUST** return `Promise<PaginatedResponse<T>>`. The frontend consumes `data` for the entity array and `meta` for pagination state.

### ID Normalization

Both canonical modules normalize `_id` to `id` at the API layer using a `mapIdKey` or `mapCustomerKeys` function:

```ts
const mapIdKey = <T>(item: any): T => ({
  ...item,
  id: item._id || item.id || "",
});
```

**MUST.** Normalize backend `_id` → frontend `id` at the API layer. This is the only place where backend field mapping should occur.

### Method Naming Convention

| Operation | Function Name | HTTP Method | URL Pattern |
|-----------|---------------|-------------|-------------|
| List | `get<Entities>` | GET | `/<entities>` |
| Detail | `get<Entity>` | GET | `/<entities>/:id` |
| Create | `create<Entity>` | POST | `/<entities>` |
| Update | `update<Entity>` | PUT | `/<entities>/:id` |
| Delete | `delete<Entity>` | DELETE | `/<entities>/:id` |
| Reactivate | `reactivate<Entity>` | PUT | `/<entities>/:id/reactivate` |
| Status toggle | `update<Entity>Status` | PATCH | `/<entities>/:id/status` |
| Sub-resource list | `get<Entity><SubResource>s` | GET | `/<entities>/:id/<subresource>` |
| Sub-resource create | `create<Entity><SubResource>` | POST | `/<entities>/:id/<subresource>` |

### Request Parameter Types

**MUST** define typed parameter interfaces in the API file:

```ts
export interface GetEntitiesParams {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
  sort?: string;
}
```

### What MUST NOT Be in API Files

- React hooks or components
- React Query logic
- Permission checks
- UI state management
- Toast notifications
- Error dialog display

---

## 5. TypeScript Types Standard

### Location

**MUST** live in `src/features/<module>/types/<entity>.types.ts`.

### Entity Types

Every domain entity must have a TypeScript interface:

```ts
export interface Service {
  id: string;
  _id?: string;       // Mongoose fallback
  name: string;
  // ... domain fields
  isActive: boolean;
  branchId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}
```

**Canonical fields** every entity SHOULD include:

| Field | Type | Purpose |
|-------|------|---------|
| `id` | `string` | Normalized frontend ID |
| `_id?` | `string` | Optional Mongoose raw ID |
| `organizationId` | `string` | Tenant ownership |
| `branchId` or `homeBranchId` | `string` | Branch association |
| `isActive` or `status` | `boolean` / union | Lifecycle state |
| `createdAt` | `string` | Creation timestamp (ISO) |
| `updatedAt` | `string` | Last update timestamp (ISO) |

### Payload Types

**MUST** define mutation payloads by omitting system-managed fields:

```ts
export type ServicePayload = Omit<
  Partial<Service>,
  "id" | "organizationId" | "branchId" | "isActive"
>;
```

### API Response Types

For modules that define their own response type aliases (as Customer does), they MUST match the structure of `ApiResponse<T>` / `PaginatedResponse<T>`:

```ts
export interface CustomerListResponse {
  success: boolean;
  status: string;
  message?: string;
  data: Customer[];
  meta?: { total: number; page: string | number; limit: string | number; totalPages: number; };
}
```

**SHOULD** prefer using the shared `PaginatedResponse<T>` generic directly rather than defining module-specific aliases. The Services module does this cleanly and it should be the preferred pattern going forward.

### Filter Types

For modules with complex filtering, **SHOULD** define filter interfaces separately:

```ts
// filters.types.ts
export interface ServiceFilters {
  search?: string;
  status?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}
```

### Rules

- **MUST NOT** duplicate types already defined in `src/types/`
- **MUST NOT** use `any` for entity types
- **SHOULD** use union string types for finite-value fields: `type Status = "active" | "inactive" | "blocked"`
- **MUST** define `optional` vs `required` accurately — do not make everything optional to avoid TypeScript errors

---

## 6. Validation Standard

### Zod Usage

**MUST** use Zod for all form validation schemas. The project uses `@hookform/resolvers/zod` to integrate Zod with React Hook Form.

### Schema Location

**MUST** live in `src/features/<module>/schemas/<entity>.schema.ts`.

### Schema Pattern

```ts
import { z } from "zod";

export const entitySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  description: z.string().trim().optional(),
  // ... validation rules
});

export type EntityFormValues = z.infer<typeof entitySchema>;
```

### Type Inference

**SHOULD** use `z.infer<typeof schema>` to derive form value types directly from the schema, keeping them in sync. The Services module demonstrates this cleanly:

```ts
export type ServiceFormValues = z.infer<typeof serviceSchema>;
```

The Customer module defines `CustomerFormValues` manually. Either approach works, but `z.infer` is preferred for simpler schemas.

### Validation Flow

```
Zod Schema
    ↓
zodResolver(schema)
    ↓
React Hook Form (useForm)
    ↓
Client-side validation on submit
    ↓
Mutation hook calls API
    ↓
Backend validates independently
    ↓
Backend validation errors mapped back via mapBackendValidationErrors()
```

### Error Message Conventions

- **MUST** provide human-readable error messages: `"Name is required"`, not `"Required"`
- **MUST** include length limits when applicable: `"Name must be less than 100 characters"`
- **SHOULD** provide format guidance: `"Please enter a valid phone number (e.g. +1234567890)"`

### Backend Error Mapping

The shared utility `mapBackendValidationErrors` from `@/lib/api/errors` maps backend validation errors to React Hook Form field errors:

```ts
import { mapBackendValidationErrors, getErrorMessage } from "@/lib/api/errors";

// In form submit error handler:
const hasMappedErrors = mapBackendValidationErrors(error, setError);
if (!hasMappedErrors) {
  toast.error(getErrorMessage(error));
}
```

**MUST** use this utility rather than inventing per-module error mapping.

---

## 7. React Query / Server State Standard

### Query Keys — Branch-Aware

**MUST** use `getBranchQueryKey()` from `useBranchContext()` for all branch-scoped queries:

```ts
const { getBranchQueryKey } = useBranchContext();
const queryKey = getBranchQueryKey("entities", [filters]);
```

This calls `getScopeQueryKey()` from `@/lib/api/queryKeys.ts` which produces structured, scope-isolated keys:

```ts
// Branch-specific:
["entities", { scope: "branch", branchId: "br_123" }, filters]

// Organization-wide:
["entities", { scope: "organization" }, filters]
```

**MUST NOT** create static query keys like `["entities", filters]` for branch-scoped data. This causes cache collisions between branches.

### Query Hook Pattern

```ts
export function useEntities(filters: EntityFilters = {}) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "entities.view");
  const isEnabled = isAuthenticated && hasViewPermission && (currentBranchId !== null || isOrgWide);

  const queryKey = getBranchQueryKey("entities", [filters]);

  return useQuery({
    queryKey,
    queryFn: () => getEntities(filters),
    enabled: isEnabled,
  });
}
```

Key elements:
- **MUST** gate on authentication AND permission
- **MUST** gate on branch context (specific branch OR org-wide access)
- **MUST** use `getBranchQueryKey` for the query key
- **SHOULD** disable retry for detail queries that may 404: `retry: false`

### Mutation Hook Pattern

Two patterns exist in the codebase:

**Pattern A — Direct `useMutation` (Customer module):**

```ts
export function useCreateEntity() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: (payload: EntityPayload) => createEntity(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("entities") });
    },
  });
}
```

**Pattern B — `useEntityMutation` shared abstraction (Services module):**

```ts
export function useCreateService() {
  const { getBranchQueryKey } = useBranchContext();
  return useEntityMutation<Service, Error, ServicePayload>({
    mutationFn: createService,
    invalidateKeys: [getBranchQueryKey("services")],
  });
}
```

**SHOULD** prefer Pattern B (`useEntityMutation`) for new modules. It encapsulates cache invalidation boilerplate and is the more recently standardized approach.

### Cache Invalidation

After mutations, **MUST** invalidate:
- The **list** query key (e.g., `getBranchQueryKey("entities")`)
- The **detail** query key for affected entities (e.g., `getBranchQueryKey("entity", [id])`)

```ts
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: getBranchQueryKey("entities") });
  queryClient.invalidateQueries({ queryKey: getBranchQueryKey("entity", [data.id]) });
},
```

### Query Client Configuration

The global query client is configured in `@/lib/api/queryClient.ts`:

```ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,       // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});
```

**MUST NOT** override these defaults unless a specific module has a documented reason.

---

## 8. Branch Scoping Standard

### How Branch Context Is Obtained

All components access branch context via `useBranchContext()` from `@/hooks/useBranchContext.ts`. This hook abstracts Redux state and provides:

| Return Value | Type | Purpose |
|-------------|------|---------|
| `currentBranchId` | `string \| null` | Selected branch ID; `null` = "All Branches" |
| `currentBranch` | `Branch \| null` | Full Branch object for selected branch |
| `availableBranches` | `Branch[]` | All branches user can access |
| `isAllBranchesSelected` | `boolean` | True when viewing all branches |
| `branchKey` | `string` | Query-safe branch key segment |
| `getBranchQueryKey` | `function` | Generates scope-aware query keys |
| `selectBranch` | `function` | Switch branch (invalidates queries) |
| `getBranchName` | `function` | Look up branch name by ID |

### How Branch Scope Reaches API Requests

The Axios request interceptor reads `branchScope: "current"` from the request config, looks up the current branch from Redux/localStorage, and sets the `X-Branch-Id` header. API functions do not manually handle branch IDs.

### Branch vs Organization Scope

| Scope | Query Key | Header | Use Case |
|-------|-----------|--------|----------|
| Branch-specific | `{ scope: "branch", branchId: "br_123" }` | `X-Branch-Id: br_123` | Most module data |
| Organization-wide | `{ scope: "organization" }` | Header omitted | Org-wide user viewing all branches |

### Common Branch Scoping Mistakes

**MUST** avoid:

1. **Hardcoding branch IDs** — Always derive from `useBranchContext()`
2. **Using `"all"` as a branch ID in API headers** — The backend rejects `X-Branch-Id: all`
3. **Creating mutations without branch guards** — Create operations MUST require a specific branch:
   ```ts
   if (currentBranchId === null || currentBranchId === "all") {
     throw new Error("Select a specific branch to create an entity.");
   }
   ```
4. **Using static query keys for branch-scoped data** — Always use `getBranchQueryKey()`
5. **Forgetting to include `branchScope: "current"` on API calls** — Every branch-scoped endpoint needs it

---

## 9. RBAC / Permission Standard

### Permission Naming

**MUST** follow the `domain.action` pattern from `@/lib/permissions`:

```ts
type PermissionType =
  | "customers.view"
  | "customers.create"
  | "customers.update"
  | "customers.delete"
  | "services.view"
  | "services.create"
  | "services.update"
  | "services.delete"
  // ...
```

### Permission Mapping in Config

**MUST** define permissions in the module config:

```ts
export const MODULE_CONFIG = {
  permissions: {
    view: "entities.view",
    create: "entities.create",
    edit: "entities.update",
    delete: "entities.delete",
  },
} as const;
```

### Permission Checks

Use the shared helpers from `@/lib/permissions`:

```ts
import { hasPermission } from "@/lib/permissions";

const canEdit = hasPermission(user, "entities.update");
const canDelete = hasPermission(user, "entities.delete");
```

### Lifecycle Action Permissions

The canonical permission mapping for lifecycle actions:

| Action | Permission Used | Reasoning |
|--------|----------------|-----------|
| View/List | `<module>.view` | Read access |
| Create | `<module>.create` | Write access |
| Edit | `<module>.update` | Modify existing entity |
| Deactivate | `<module>.delete` | Destructive action |
| Reactivate | `<module>.update` (edit) | Restoring is an edit operation |

This is confirmed by `EntityActionMenu`:
```tsx
// Deactivate shows when: isActive && onDelete && canDelete
{isActive && onDelete && canDelete && ( /* Deactivate button */ )}

// Reactivate shows when: !isActive && onReactivate && canEdit
{!isActive && onReactivate && canEdit && ( /* Reactivate button */ )}
```

### UI Permission Gating

Use `PermissionGate` for conditional rendering:

```tsx
import PermissionGate from "@/components/layout/PermissionGate";

<PermissionGate permission="entities.create">
  <Button>Create Entity</Button>
</PermissionGate>
```

### Critical Rule

> Frontend permission checks are **UX protection**, not security. The backend MUST independently authorize every protected operation. A hidden button does not make an endpoint secure.

---

## 10. Table / List Architecture

### DataTable Component

**MUST** use the shared `DataTable` from `@/components/ui/data-table/DataTable.tsx`. Do not create module-specific table implementations.

```tsx
import { DataTable } from "@/components/ui/data-table/DataTable";

<DataTable
  columns={columns}
  data={entities}
  isLoading={isLoading}
  emptyState={<EmptyState ... />}
  renderMobileRow={(entity) => <EntityMobileCard entity={entity} />}
  getRowClassName={(entity) => entity.isActive ? "" : "opacity-60"}
/>
```

### DataTable Capabilities (Provided by Shared Component)

| Feature | Status | Notes |
|---------|--------|-------|
| Column rendering | ✅ Built-in | Via TanStack `ColumnDef` |
| Loading skeleton | ✅ Built-in | Desktop table + mobile cards |
| Empty state | ✅ Built-in | Pass via `emptyState` prop |
| Mobile responsive | ✅ Built-in | Via `renderMobileRow` prop |
| Row styling | ✅ Built-in | Via `getRowClassName` prop |

### Module-Specific Responsibilities

Each module **MUST** provide:

1. **Column definitions** in `columns/<entity>Columns.tsx`
2. **Mobile card component** in `components/<Entity>MobileCard.tsx`
3. **Search component** in `components/<Entity>Search.tsx`
4. **Filter component** in `components/<Entity>Filters.tsx`
5. **List header** in `components/<Entity>ListHeader.tsx`

### Column Definition Pattern

**MUST** define columns as a builder function in `columns/<entity>Columns.tsx`:

```tsx
interface EntityColumnOptions {
  onView: (entity: Entity) => void;
  onEdit: (entity: Entity) => void;
  onDelete: (entity: Entity) => void;
  onReactivate: (entity: Entity) => void;
  isAllBranches: boolean;
}

export const buildEntityColumns = ({
  onView,
  onEdit,
  onDelete,
  onReactivate,
  isAllBranches,
}: EntityColumnOptions): ColumnDef<Entity>[] => [
  // ... column definitions
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: (info) => (
      <EntityActionMenu
        onView={() => onView(info.row.original)}
        onEdit={() => onEdit(info.row.original)}
        onDelete={() => onDelete(info.row.original)}
        onReactivate={() => onReactivate(info.row.original)}
        status={info.row.original.status}
        permissions={{
          edit: MODULE_CONFIG.permissions.edit,
          delete: MODULE_CONFIG.permissions.delete,
        }}
      />
    ),
  },
];
```

**MUST** use `EntityActionMenu` from `@/components/entity/EntityActionMenu` for the actions column.

**SHOULD** conditionally include a Branch column when `isAllBranches` is true.

---

## 11. Pagination Standard

### Backend Contract

```ts
// Request
GET /entities?page=1&limit=10

// Response
{
  "success": true,
  "status": "success",
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### Frontend Pagination Component

**MUST** use the shared `Pagination` component from `@/components/ui/pagination.tsx`:

```tsx
import { Pagination } from "@/components/ui/pagination";

<Pagination
  currentPage={currentPage}
  totalPages={meta?.totalPages ?? 1}
  totalItems={meta?.total ?? 0}
  onPageChange={setCurrentPage}
  itemLabel="customers"
  pageSize={pageSize}
  pageSizeOptions={[10, 25, 50, 100]}
  onPageSizeChange={setPageSize}
/>
```

### Pagination State

**SHOULD** manage pagination state locally in the list component using `useState`:

```ts
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(MODULE_CONFIG.defaults.pageSize);
```

These values are passed as params to the query hook, which includes them in the query key for proper cache separation.

### Default Page Size

**MUST** be defined in the module config:

```ts
defaults: {
  pageSize: 10,
}
```

---

## 12. Entity Profile / Detail Page Standard

### Route Structure

```
src/app/(dashboard)/<entities>/[<entityId>]/page.tsx
```

**MUST** use Next.js dynamic route with async params:

```tsx
interface PageProps {
  params: Promise<{ entityId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { entityId } = await params;
  return <EntityDetailsPage entityId={entityId} />;
}
```

### Detail Page Component Architecture

```
<EntityDetailsPage>
  ├── Permission check (canView → Unauthorized)
  ├── Loading state (skeleton)
  ├── Error state (ErrorState component)
  │   ├── 403 → Unauthorized
  │   └── Other → ErrorState with retry
  ├── <EntityProfileHeader>
  │   ├── Back navigation
  │   ├── Entity name, status badge
  │   ├── Key metadata
  │   └── Action buttons (Edit, Deactivate/Reactivate)
  ├── <EntityProfileLayout>
  │   ├── Tab navigation (sidebar on desktop, horizontal on mobile)
  │   └── Tab content panels
  ├── Edit Dialog (Dialog + EntityForm)
  ├── DeactivateDialog
  └── ReactivateDialog
```

### EntityProfileLayout

**MUST** use the shared `EntityProfileLayout` from `@/components/entity/EntityProfileLayout`:

```tsx
import { EntityProfileLayout, type ProfileTabItem } from "@/components/entity/EntityProfileLayout";

const tabs: ProfileTabItem[] = [
  { id: "overview", label: "Overview" },
  { id: "notes", label: "Notes" },
  { id: "activity", label: "Activity Log" },
];

<EntityProfileLayout
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
>
  {/* Tab content */}
</EntityProfileLayout>
```

### Tab State

Tab state is managed with local `useState`. Both canonical modules use this approach:

```ts
const [activeTab, setActiveTab] = useState<string>("overview");
```

### Loading States

**MUST** provide a skeleton loading state that visually matches the page layout structure.

### Error Handling

**MUST** check for HTTP 403 and render `<Unauthorized />`:

```tsx
if (status === 403) {
  return <Unauthorized />;
}
```

For other errors, use `<ErrorState>` with a retry action.

---

## 13. CRUD Standard

### Full Lifecycle

```
List → Create → Read (Detail) → Update → Deactivate → Reactivate
```

### Responsibility Matrix

| Concern | List | Create | Read | Update | Deactivate | Reactivate |
|---------|------|--------|------|--------|------------|------------|
| **API** | `getEntities()` | `createEntity()` | `getEntity()` | `updateEntity()` | `deleteEntity()` | `reactivateEntity()` |
| **Hook** | `useEntities()` | `useCreateEntity()` | `useEntity()` | `useUpdateEntity()` | `useDeleteEntity()` | `useReactivateEntity()` |
| **Permission** | `view` | `create` | `view` | `update` | `delete` | `update` |
| **Schema** | — | Entity schema | — | Entity schema | — | — |
| **UI** | DataTable + List | Dialog + Form | Detail page | Dialog + Form | DeactivateDialog | ReactivateDialog |
| **Cache** | — | Invalidate list | — | Invalidate list + detail | Invalidate list + detail | Invalidate list + detail |
| **Branch** | Required | Specific branch required | Required | Required | Required | Required |

### Create Restriction

**MUST** prevent creation under "All Branches" scope:

```ts
if (currentBranchId === null || currentBranchId === "all") {
  throw new Error("Select a specific branch to create.");
}
```

### Delete = Deactivate

In this project, "delete" is a soft delete (deactivation). The delete API sets the entity to inactive rather than permanently removing it. Naming uses `deleteEntity` in the API/hook layer but "Deactivate" in the UI.

---

## 14. Lifecycle / Status Standard

### Lifecycle Field

Two patterns exist in the canonical modules:

| Module | Field | Type | Values |
|--------|-------|------|--------|
| Customer | `status` | `CustomerStatus` | `"active"` \| `"inactive"` \| `"blocked"` |
| Services | `isActive` | `boolean` | `true` \| `false` |

### Canonical Guidance

**SHOULD** prefer a `status` string union field when more than two states exist (Customer pattern). **MAY** use `isActive: boolean` for simpler entities with only active/inactive states (Services pattern).

### Deactivation

- API: `DELETE /<entities>/:id` (soft delete) or `PATCH /<entities>/:id/status` with `{ isActive: false }`
- Permission: `<module>.delete`
- UI: `DeactivateDialog` from `@/components/entity/DeactivateDialog`

### Reactivation

- API: `PUT /<entities>/:id/reactivate` or `PATCH /<entities>/:id/status` with `{ isActive: true }`
- Permission: `<module>.update` (edit permission)
- UI: `ReactivateDialog` from `@/components/entity/ReactivateDialog`

### Critical Warning

**MUST NOT** create duplicate lifecycle fields:

```ts
// ❌ DO NOT create multiple competing fields
isActive: boolean;
status: "active" | "inactive";
enabled: boolean;
disabled: boolean;
```

Choose ONE canonical lifecycle field per entity and use it consistently.

---

## 15. Reusable Shared Components

### Entity Components (`src/components/entity/`)

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `EntityActionMenu` | Row-level action buttons (View, Edit, Deactivate, Reactivate) | Every list table's actions column |
| `EntityProfileLayout` | Tabbed layout with sidebar navigation | Every entity detail/profile page |
| `DeactivateDialog` | Confirmation dialog for soft deletion | Every deactivate action |
| `ReactivateDialog` | Confirmation dialog for status restoration | Every reactivate action |

### UI Components (`src/components/ui/`)

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `DataTable` | TanStack-powered table with skeletons and mobile support | Every entity list page |
| `Pagination` | Page navigation with size selector | Every paginated list |
| `EmptyState` | Friendly empty state with icon, title, description, optional action | When a list or tab has no data |
| `ErrorState` | Error display with retry button | When a query fails |
| `Dialog` | Modal dialog wrapper | Forms, confirmations |
| `Button` | Styled button with variants and sizes | All interactive actions |
| `Badge` | Status/category indicators | Status columns, metadata |
| `Input` | Text input field | All forms |
| `Select` | Dropdown select field | Filters, forms |
| `Switch` | Toggle switch | Boolean form fields |
| `Textarea` | Multi-line text input | Notes, descriptions |
| `PageHeaderBanner` | Page title banner | List page headers |

### Layout Components (`src/components/layout/`)

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `PermissionGate` | Conditionally render children based on permission | Permission-gated UI sections |
| `ProtectedRoute` | Route-level permission check | Page-level access control |
| `Unauthorized` | "Access denied" UI | When user lacks permission |
| `Breadcrumbs` | Navigation breadcrumbs | Page navigation context |
| `BranchSwitcher` | Branch selection dropdown | (Already in layout) |

### Shared Utilities (`src/lib/`)

| Utility | Purpose | When to Use |
|---------|---------|-------------|
| `apiClient` | Centralized Axios instance | All API calls |
| `getScopeQueryKey` | Branch-aware query key generator | All query hooks |
| `useEntityMutation` | Generic mutation with invalidation | All mutation hooks |
| `getErrorMessage` | Extract user-friendly error text | All error handlers |
| `mapBackendValidationErrors` | Map backend errors to form fields | All form submissions |
| `hasPermission` / `hasAnyPermission` | Permission check helpers | All permission gates |
| `formatDate` / `formatCurrency` / `capitalizeWords` | Display formatters | Columns, detail views |

**MUST NOT** duplicate any of these locally in a feature module.

---

## 16. Hooks Standard

### Hook Types

| Type | Naming | Example | Purpose |
|------|--------|---------|---------|
| List query | `use<Entities>` | `useCustomers` | Paginated list with filters |
| Detail query | `use<Entity>` | `useCustomer` | Single entity by ID |
| Sub-resource query | `use<Entity><Resource>s` | `useCustomerNotes` | Related sub-entity list |
| Create mutation | `useCreate<Entity>` | `useCreateCustomer` | POST new entity |
| Update mutation | `useUpdate<Entity>` | `useUpdateCustomer` | PUT/PATCH existing entity |
| Delete mutation | `useDelete<Entity>` | `useDeleteCustomer` | DELETE (deactivate) entity |
| Reactivate mutation | `useReactivate<Entity>` | `useReactivateCustomer` | PUT reactivate entity |
| Status mutation | `useUpdate<Entity>Status` | `useUpdateServiceStatus` | PATCH status toggle |

### Standard Query Hook Template

```ts
import { useQuery } from "@tanstack/react-query";
import { getEntities } from "../api/entities.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

export function useEntities(filters: EntityFilters = {}) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "entities.view");
  const isEnabled = isAuthenticated && hasViewPermission && (currentBranchId !== null || isOrgWide);

  return useQuery({
    queryKey: getBranchQueryKey("entities", [filters]),
    queryFn: () => getEntities(filters),
    enabled: isEnabled,
  });
}
```

### Standard Mutation Hook Template (Preferred)

```ts
import { useEntityMutation } from "@/lib/api/mutations";
import { createEntity } from "../api/entities.api";
import { useBranchContext } from "@/hooks/useBranchContext";

export function useCreateEntity() {
  const { getBranchQueryKey } = useBranchContext();
  return useEntityMutation<Entity, Error, EntityPayload>({
    mutationFn: createEntity,
    invalidateKeys: [getBranchQueryKey("entities")],
  });
}
```

### Responsibility Boundaries

```
API Layer:     HTTP call → return typed data
Hook Layer:    Query key + enabled logic + cache invalidation
Component Layer: Call hook, handle loading/error/data states, user interaction
```

Hooks **MUST NOT** contain:
- Toast notifications (handled in components)
- Router navigation (handled in components)
- UI state management (handled in components)

---

## 17. Form Architecture

### Flow

```
UI Form (React Hook Form)
    ↓
zodResolver(entitySchema)
    ↓
Client-side validation
    ↓
onSubmit handler in component
    ↓
Mutation hook .mutate()
    ↓
API service function
    ↓
Backend validation
    ↓
Success → toast + close dialog + invalidate cache
Error → toast or inline error
```

### Form Component Pattern

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { entitySchema, type EntityFormValues } from "../schemas/entity.schema";

interface EntityFormProps {
  initialValues?: Partial<EntityFormValues>;
  onSubmit: (values: EntityPayload) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  error?: Error | null;
}

export default function EntityForm({
  initialValues,
  onSubmit,
  isSubmitting,
  onCancel,
  error,
}: EntityFormProps) {
  const form = useForm<EntityFormValues>({
    resolver: zodResolver(entitySchema),
    defaultValues: { /* sensible defaults */ },
  });

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit(transformToPayload(values));
  });

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
```

### Create vs Edit

Both canonical modules use a single form component for both create and edit, distinguished by:
- Whether `initialValues` is provided
- The submit handler (create vs update mutation)

The form is rendered inside a `<Dialog>` in the parent component.

### Default Values

**MUST** provide complete default values that match the Zod schema structure. For edit mode, populate from the existing entity data.

---

## 18. UI/UX Standard

### Loading States

**MUST** provide:
- **Table loading:** DataTable's built-in skeleton (automatically rendered when `isLoading=true`)
- **Page loading:** Skeleton placeholder matching the page layout structure
- **Button loading:** `Loader2` spinner icon + "Saving..." / "Deleting..." / "Reactivating..." text
- **Route loading:** Next.js `loading.tsx` files for route-level suspense

### Empty States

**MUST** use the shared `EmptyState` component:

```tsx
<EmptyState
  icon={Users}
  title="No Customers Found"
  description="Create a new customer profile or switch active branches to get started."
  action={{
    label: "Add Customer",
    onClick: handleCreate,
    icon: Plus,
  }}
/>
```

### Error States

**MUST** use the shared `ErrorState` component:

```tsx
<ErrorState
  title="Something went wrong"
  description="Unable to load data. Please try again."
  retryAction={{
    label: "Try Again",
    onClick: () => refetch(),
    isLoading: isRefetching,
  }}
/>
```

### Destructive Actions

**MUST** show confirmation dialogs for deactivation and deletion. Use the shared `DeactivateDialog` and `ReactivateDialog` components.

### Toast Feedback

**SHOULD** use `toast` from `sonner` for mutation feedback:

```ts
toast.success("Entity created successfully.");
toast.error(getErrorMessage(error));
```

### Accessibility

**SHOULD:**
- Use `aria-label` on icon-only buttons (e.g., `title="View Details"`)
- Use `role="navigation"` and `aria-label` on pagination
- Use `aria-current="page"` on active pagination buttons
- Use semantic elements: `<button>`, `<a>`, `<nav>`, `<form>`
- Support keyboard navigation for dialogs and interactive elements

### Responsive Design

**MUST** provide:
- Desktop: Full table view with all columns
- Mobile: Card-based view via `renderMobileRow` prop on DataTable
- Tablet: Table view with graceful column hiding

The `useMediaQuery` hook from `@/hooks/useMediaQuery` is available for responsive logic.

### Dark Mode

**MUST** use Tailwind's semantic design tokens (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, etc.). Do not hardcode colors.

---

## 19. Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Feature folder | lowercase plural | `customers`, `services` |
| Component file | PascalCase | `CustomerList.tsx`, `ServiceForm.tsx` |
| Hook file | `use<Action><Entity>.ts` | `useCustomers.ts`, `useCreateService.ts` |
| API file | `<entity>.api.ts` | `customers.api.ts`, `services.api.ts` |
| Schema file | `<entity>.schema.ts` | `customer.schema.ts`, `service.schema.ts` |
| Type file | `<entity>.types.ts` | `customer.types.ts`, `service.types.ts` |
| Config file | `<module>.config.ts` | `customers.config.ts`, `services.config.ts` |
| Constants file | `<entity>.constants.ts` | `service.constants.ts` |
| Column file | `<entity>Columns.tsx` | `customerColumns.tsx`, `serviceColumns.tsx` |
| Query key (list) | `"<entities>"` | `"customers"`, `"services"` |
| Query key (detail) | `"<entity>"` | `"customer"`, `"service"` |
| Query key (sub-resource) | `"<entity>-<resource>"` | `"customer-notes"`, `"customer-activity"` |
| Route (list) | `/<entities>` | `/customers`, `/services` |
| Route (detail) | `/<entities>/[<entityId>]` | `/customers/[customerId]` |
| Dialog component | `<Entity><Action>Dialog.tsx` | `CustomerDeleteDialog.tsx` |
| Permission | `<module>.<action>` | `customers.view`, `services.create` |
| Config constant | `<MODULE>_CONFIG` | `CUSTOMERS_CONFIG`, `SERVICES_CONFIG` |
| Column builder | `build<Entity>Columns` | `buildCustomerColumns`, `buildServiceColumns` |

---

## 20. Backend Architecture Standard

The backend follows a layered architecture documented in `docs/BACKEND_ARCHITECTURE.md`:

```
Route → Authentication Middleware → Authorization Middleware → Scope Validation → Controller → Validation → Service → Model / Database
```

### Layer Responsibilities

| Layer | Responsibility | Must NOT |
|-------|---------------|----------|
| **Route** | HTTP method, URL, middleware chain | Contain business logic |
| **Auth Middleware** | Verify identity (JWT) | Perform authorization |
| **Authz Middleware** | Check permission: `authorize("entities.view")` | Use role-name bypasses |
| **Scope Validation** | Validate org + branch context | Trust client-provided org IDs |
| **Controller** | Read request context, call service, return response | Contain large business workflows |
| **Validation** | Validate body, query, params | Allow immutable field overrides |
| **Service** | Business rules, data access orchestration | Trust client tenant ownership |
| **Model** | Schema, indexes, persistence | Contain all business logic |

### Backend Endpoint Contract for New Modules

| Endpoint | Method | Permission | Response Type |
|----------|--------|------------|---------------|
| `/<entities>` | GET | `<module>.view` | `PaginatedResponse<T>` |
| `/<entities>/:id` | GET | `<module>.view` | `ApiResponse<T>` |
| `/<entities>` | POST | `<module>.create` | `ApiResponse<T>` |
| `/<entities>/:id` | PUT | `<module>.update` | `ApiResponse<T>` |
| `/<entities>/:id` | DELETE | `<module>.delete` | `ApiResponse<void>` |
| `/<entities>/:id/reactivate` | PUT | `<module>.update` | `ApiResponse<T>` |

---

## 21. Data Model Standard

### Canonical Entity Fields

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `_id` | ObjectId | Auto | MongoDB primary key |
| `organizationId` | ObjectId/String | MUST | Tenant isolation |
| `branchId` / `homeBranchId` | ObjectId/String | MUST for branch-scoped | Branch ownership |
| `name` | String | MUST | Primary display field |
| `status` or `isActive` | String/Boolean | MUST | Lifecycle state |
| `createdAt` | Date | MUST | Audit: creation time |
| `updatedAt` | Date | MUST | Audit: last modification |

### Immutable Scoping Fields

**MUST NOT** allow client updates to:
- `organizationId`
- `homeBranchId` (unless a dedicated domain operation exists)
- `visitedBranchIds` (derived field)

### Relationships

- **References:** Store `branchId`, `categoryId` as string IDs. Resolve via separate queries or backend population.
- **Embedded data:** Small, tightly coupled sub-objects (address, preferences, marketing preferences) may be embedded directly in the entity document.

### Timestamps

**MUST** include `createdAt` and `updatedAt` as ISO string dates. Mongoose `timestamps: true` handles this automatically.

---

## 22. Audit / History / Notes Standard

The Customer module demonstrates three separate data concerns:

### Notes

Managed as a **sub-resource** of the entity with its own API endpoints:

```
GET    /customers/:id/notes        → PaginatedResponse<CustomerNote>
POST   /customers/:id/notes        → CustomerNote
```

Notes have their own type:

```ts
interface CustomerNote {
  _id: string;
  text: string;
  createdBy: string | { _id: string; name: string };
  createdAt: string;
}
```

### Activity / Audit Logs

Managed as a **separate read-only sub-resource**:

```
GET    /customers/:id/activity     → PaginatedResponse<AuditLog>
```

Audit logs record actions (`CUSTOMER_CREATED`, `CUSTOMER_UPDATED`, `NOTE_ADDED`, etc.) and are generated server-side, not client-side.

### When to Separate

| Data Type | Location | Rationale |
|-----------|----------|-----------|
| Core entity fields | Primary document | Always needed, small |
| Embedded sub-objects | Primary document | Tightly coupled, small (address, preferences) |
| Notes | Separate collection/sub-resource | Unbounded, user-generated, independently paginated |
| Audit logs | Separate collection/sub-resource | Automatically generated, never modified, independently queried |

**SHOULD** move data to a separate collection/sub-resource when:
- The data is unbounded (grows over time)
- The data is independently paginated
- The data has different access patterns than the primary entity

---

## 23. Error Handling Standard

### Error Flow

```
Backend error
    ↓
Axios interceptor (401 → refresh token, redirect to login)
    ↓
API function (throws AxiosError)
    ↓
React Query (sets error state)
    ↓
Hook consumer (component checks isError)
    ↓
UI rendering (ErrorState, toast, or inline error)
```

### Shared Error Utilities

```ts
import { getErrorMessage, mapBackendValidationErrors, isBackendError } from "@/lib/api/errors";
```

| Utility | Usage |
|---------|-------|
| `getErrorMessage(error)` | Extract user-friendly message from any error |
| `mapBackendValidationErrors(error, setError)` | Map backend field errors to React Hook Form |
| `isBackendError(error)` | Type guard for Axios errors |

### Error Handling by Context

| Context | Pattern |
|---------|---------|
| **List query error** | `ErrorState` component with retry |
| **Detail query error** | `ErrorState` with retry; 403 → `Unauthorized` |
| **Mutation error** | `toast.error(getErrorMessage(err))` |
| **Form validation error** | Inline field errors via Zod |
| **Backend validation error** | `mapBackendValidationErrors` → inline field errors |
| **Network error** | `toast.error("Unable to connect...")` |
| **401 Unauthorized** | Automatic token refresh or redirect to login (handled by Axios interceptor) |
| **403 Forbidden** | `Unauthorized` component |

### Rules

- **MUST NOT** expose raw error messages, stack traces, or internal details to users
- **MUST** provide a retry mechanism for query failures
- **MUST** prevent double-submission by disabling buttons during mutation loading

---

## 24. Security Standard

### RBAC

- **MUST** check permissions via `hasPermission()` before showing/enabling actions
- **MUST NOT** use role names as permission proxies: `if (user.role === "Owner")` is forbidden
- **MUST** define all permissions in the backend registry first

### Branch Isolation

- **MUST** use `branchScope: "current"` on branch-scoped API calls
- **MUST NOT** send `X-Branch-Id: "all"` — omit the header for org-wide queries
- **MUST NOT** trust client-provided organization or branch IDs

### Authentication

- Access tokens stored in cookies via `@/lib/auth/token.ts`
- Refresh tokens stored in HttpOnly cookies (backend-managed, not accessible from client)
- Token refresh handled centrally by the Axios response interceptor
- **MUST NOT** implement auth logic inside individual components

### Sensitive Fields

- **MUST NOT** expose `NEXT_PUBLIC_*` environment variables for secrets
- **MUST NOT** store sensitive data in localStorage
- The `.env` file stores `NEXT_PUBLIC_API_BASE_URL` only

### Input Validation

- Frontend validation (Zod) is for UX only
- Backend MUST independently validate all inputs
- Backend MUST reject modification of immutable scoping fields

---

## 25. Performance Standard

### React Query Caching

- Default `staleTime: 60_000` (1 minute) is set globally
- `refetchOnWindowFocus: false` prevents unnecessary refetches
- **MUST NOT** override these without justification

### Pagination

- **MUST** paginate lists server-side (default 10 per page)
- **MUST NOT** fetch all records and filter/paginate client-side

### Avoiding Unnecessary Refetches

- Use targeted query invalidation after mutations (not global invalidation)
- Example: After updating a customer, invalidate `["customers"]` and `["customer", id]`, not all queries

### Memoization

- **MUST NOT** add `useMemo`/`useCallback` everywhere by default
- **SHOULD** memoize only when measurable performance benefit exists
- Column builder functions are already factory functions, avoiding recreation

### Dynamic Imports

- **MAY** use `next/dynamic` for heavy components that aren't needed on initial render
- Do not prematurely optimize simple components

### Image Optimization

- **SHOULD** use Next.js `Image` component for images when applicable

---

## 26. Testing Standard

### Test Location

**SHOULD** place tests in `src/features/<module>/__tests__/<module>.test.tsx`.

The Customer module provides the reference test implementation.

### Test Categories

#### Unit Tests (MUST)

- **Zod schema validation:** Test valid/invalid inputs, boundary conditions
- **Permission helpers:** Test allow/deny for each permission
- **Query key generation:** Verify branch-scoped keys are distinct

#### Component Tests (SHOULD)

- **Permission-based rendering:** Verify buttons show/hide based on permissions
- **Action callbacks:** Verify onView/onEdit/onDelete/onReactivate trigger correctly
- **Status-conditional UI:** Verify Deactivate shows for active, Reactivate for inactive

#### Integration Tests (MAY)

- **API service functions:** Mock Axios, verify request shape
- **Mutation hooks:** Verify cache invalidation keys

### Test Patterns from Customer Reference

```ts
// Permission testing
it("verifies view permission is checked independently", () => {
  expect(hasPermission(user, "entities.view")).toBe(true);
  expect(hasPermission(user, "entities.create")).toBe(false);
});

// Query key scoping
it("ensures Branch A and B lists have distinct cache keys", () => {
  const keyA = getScopeQueryKey("entities", "br_A");
  const keyB = getScopeQueryKey("entities", "br_B");
  expect(keyA).not.toEqual(keyB);
});

// Schema validation
it("rejects empty required fields", () => {
  const result = entitySchema.safeParse({ name: "", phone: "" });
  expect(result.success).toBe(false);
});
```

### Testing Framework

- **Runner:** Vitest
- **Environment:** jsdom
- **Rendering:** `@testing-library/react`
- **Mocking:** Vitest `vi.mock()` for auth hooks and branch context

---

## 27. Production Readiness Checklist

### Architecture

- [ ] Feature lives in `src/features/<module>/`
- [ ] Contains `api/`, `types/`, `schemas/`, `hooks/`, `components/`, `columns/`, `config/` directories
- [ ] API layer uses `apiClient` from `@/lib/api/axios`
- [ ] API layer uses `PaginatedResponse<T>` / `ApiResponse<T>`
- [ ] All API calls include `branchScope: "current"`
- [ ] Types are defined in `types/` (no inline `any`)
- [ ] Zod schemas are defined in `schemas/`
- [ ] Hooks use `getBranchQueryKey()` from `useBranchContext()`
- [ ] Mutations use `useEntityMutation` or follow the canonical pattern
- [ ] Column definitions use `EntityActionMenu`
- [ ] Config defines routes, permissions, labels, defaults

### Backend Contract

- [ ] Backend endpoints follow `Route → Auth → Authz → Controller → Service → Model`
- [ ] Response envelope matches `ApiResponse<T>` / `PaginatedResponse<T>`
- [ ] Immutable scoping fields are protected
- [ ] Organization isolation is enforced
- [ ] Branch scoping is enforced
- [ ] Permissions are registered in the backend

### Frontend CRUD

- [ ] List page works with pagination
- [ ] Search works
- [ ] Filters work
- [ ] Create form validates with Zod and submits
- [ ] Edit form pre-populates and updates
- [ ] Detail/profile page loads correctly
- [ ] Delete (deactivate) works with confirmation dialog
- [ ] Reactivate works with confirmation dialog

### State Management

- [ ] Loading states render skeletons (not blank pages)
- [ ] Empty states use `EmptyState` component
- [ ] Error states use `ErrorState` component with retry
- [ ] 403 errors render `Unauthorized`
- [ ] Mutation success shows toast
- [ ] Mutation error shows toast with user-friendly message
- [ ] Cache invalidation targets correct query keys

### Permissions

- [ ] `view` permission gates list queries (`enabled`)
- [ ] `create` permission gates create button visibility
- [ ] `edit` permission gates edit button visibility
- [ ] `delete` permission gates deactivate button visibility
- [ ] `edit` permission gates reactivate button visibility
- [ ] Permissions are defined in module config
- [ ] Backend independently authorizes each operation

### UX Quality

- [ ] Responsive: desktop table + mobile cards
- [ ] Dark mode compatible (semantic tokens only)
- [ ] Branch column appears in "All Branches" view
- [ ] Buttons show loading state during mutations
- [ ] Destructive actions have confirmation dialogs
- [ ] Toast feedback for success and error
- [ ] Icon-only buttons have `title` / `aria-label`

### Code Quality

- [ ] TypeScript: no `any` (except documented API normalization)
- [ ] No `@ts-ignore` or `@ts-expect-error`
- [ ] No unused imports
- [ ] No dead code
- [ ] No `console.log` in production code
- [ ] No duplicated shared component reimplementations
- [ ] Lint clean
- [ ] Build clean
- [ ] Tests pass

---

## 28. New Module Implementation Workflow

```
 1. Understand business requirements
         ↓
 2. Define domain model and entity fields
         ↓
 3. Define permissions (add to backend registry)
         ↓
 4. Define API contract (endpoints, request/response shapes)
         ↓
 5. Implement backend (Model → Service → Controller → Routes)
         ↓
 6. Create feature directory structure
         ↓
 7. Define TypeScript types (types/<entity>.types.ts)
         ↓
 8. Define Zod validation schemas (schemas/<entity>.schema.ts)
         ↓
 9. Implement API layer (api/<entity>.api.ts)
         ↓
10. Implement React Query hooks (hooks/)
         ↓
11. Create module config (config/<module>.config.ts)
         ↓
12. Define column definitions (columns/<entity>Columns.tsx)
         ↓
13. Implement list page (List, Search, Filters, MobileCard)
         ↓
14. Implement create/edit forms
         ↓
15. Implement detail/profile page
         ↓
16. Implement lifecycle actions (Deactivate/Reactivate)
         ↓
17. Add route pages in src/app/(dashboard)/<module>/
         ↓
18. Add route permission mapping in routePermissions.ts
         ↓
19. Add sidebar navigation entry
         ↓
20. Add loading/error/empty states
         ↓
21. Write tests
         ↓
22. Run production readiness checklist (Section 27)
         ↓
23. Run architecture audit (Section 29)
         ↓
24. TypeScript check: npx tsc --noEmit
         ↓
25. Lint check: npx eslint
         ↓
26. Build check: npm run build
         ↓
27. Final walkthrough
```

---

## 29. Architecture Audit Checklist

When auditing a module against the canonical standard, verify each item:

### API Contract Compliance

- [ ] Uses `apiClient` from `@/lib/api/axios`
- [ ] Uses `PaginatedResponse<T>` for lists
- [ ] Uses `ApiResponse<T>` for single entities
- [ ] All calls include `branchScope: "current"`
- [ ] ID normalization happens at API layer (`_id` → `id`)

### Query Architecture

- [ ] Uses `getBranchQueryKey()` from `useBranchContext()`
- [ ] No static query keys for branch-scoped data
- [ ] Query hooks gate on authentication + permission + branch context
- [ ] Mutations invalidate correct query keys

### Shared Component Usage

- [ ] Uses `DataTable` (not custom table)
- [ ] Uses `Pagination` (not custom pagination)
- [ ] Uses `EntityActionMenu` (not custom action buttons)
- [ ] Uses `EntityProfileLayout` (not custom tab layout)
- [ ] Uses `DeactivateDialog` (not custom delete confirmation)
- [ ] Uses `ReactivateDialog` (not custom reactivate confirmation)
- [ ] Uses `EmptyState` and `ErrorState` (not custom)

### Convention Compliance

- [ ] Feature directory structure matches standard
- [ ] File naming matches conventions
- [ ] Permission naming follows `domain.action` pattern
- [ ] Config object defines routes, permissions, labels, defaults
- [ ] Lifecycle field is single (not duplicated)

### Common Architectural Drift

**Mistakes future developers/AI agents MUST avoid:**

| Drift | Correct Approach |
|-------|-----------------|
| Creating custom API response normalization | Use `PaginatedResponse<T>` and `ApiResponse<T>` |
| Creating static query keys for branch-scoped data | Use `getBranchQueryKey()` |
| Duplicating `Pagination` component | Import from `@/components/ui/pagination` |
| Creating module-specific action menus | Use `EntityActionMenu` from `@/components/entity/` |
| Creating module-specific deactivate/reactivate dialogs | Use shared `DeactivateDialog` / `ReactivateDialog` |
| Putting business logic in components | Move to hooks or API layer |
| Creating inconsistent type definitions | Follow existing type patterns |
| Mixing API calls directly in components | Call API through hooks only |
| Creating duplicate `status` + `isActive` fields | Choose one lifecycle field |
| Bypassing shared `useEntityMutation` | Use the shared abstraction |
| Hardcoding branch ID in queries | Use `branchScope: "current"` |
| Checking wrong permission for reactivate | Reactivate uses `edit`/`update` permission, not `delete` |
| Using role names as permission checks | Always use `hasPermission()` with permission strings |
| Creating new Axios instances | Use `apiClient` from `@/lib/api/axios` |
| Storing API data in Redux | Use React Query for server state |

---

## 30. AI Coding Agent Instructions

When an AI coding agent works on this project, it **MUST**:

1. **Read this standard** before implementing any new module.
2. **Inspect the Customer and Services modules** as reference implementations.
3. **Inspect shared components** (`src/components/entity/`, `src/components/ui/`) before creating new ones.
4. **Inspect shared utilities** (`src/lib/api/`, `src/lib/permissions/`) before creating new ones.
5. **Reuse existing architecture** — never create a parallel implementation of existing shared infrastructure.
6. **Never introduce a new pattern** without documenting the justification.
7. **Never duplicate** an existing shared component, hook, or utility.
8. **Never invent API contracts** — verify backend endpoints and response shapes before frontend implementation.
9. **Preserve branch scoping** — every branch-scoped query must use `getBranchQueryKey()`, every API call must use `branchScope: "current"`.
10. **Preserve RBAC** — use `hasPermission()` with permission strings, never role names.
11. **Follow existing naming conventions** — see Section 19.
12. **Run the architecture audit** (Section 29) after implementation.
13. **Report deviations explicitly** — if the module differs from the standard, explain why.
14. **Do not silently introduce architectural changes** — any change to shared infrastructure must be documented and justified.

### Critical Rule

> **When a new module appears to require a different architecture, STOP and explain why before introducing the deviation.**

### Pre-Implementation Checklist for AI Agents

Before writing any code for a new module:

- [ ] Read `docs/MODULE_ARCHITECTURE_STANDARD.md` (this document)
- [ ] Inspect `src/features/customers/` as the primary reference
- [ ] Inspect `src/features/services/` as the secondary reference
- [ ] Inspect `src/components/entity/` for reusable entity components
- [ ] Inspect `src/components/ui/` for reusable UI components
- [ ] Inspect `src/lib/api/` for shared API utilities
- [ ] Inspect `src/lib/permissions/` for permission helpers
- [ ] Verify backend endpoints exist before building frontend
- [ ] Verify permissions are registered before using them in the frontend

---

## 31. Decision Log

| Decision | Standard | Reason |
|----------|----------|--------|
| **API response** | `ApiResponse<T>` / `PaginatedResponse<T>` from `@/types/api.types.ts` | Consistent contract prevents per-module response normalization |
| **Query keys** | `getBranchQueryKey()` → `[entity, { scope, branchId }, ...additionalKeys]` | Branch-aware cache isolation prevents data leaks between branches |
| **Branch scoping** | `branchScope: "current"` on API calls, `X-Branch-Id` header via interceptor | Centralized branch injection prevents forgotten/inconsistent branch headers |
| **Pagination** | Shared `Pagination` component + `PaginatedResponse.meta` contract | Single pagination implementation reduces bugs and ensures consistency |
| **Validation** | Zod schemas in `schemas/` + `zodResolver` with React Hook Form | Type-safe validation with automatic form integration |
| **Lifecycle** | `status` (string union) or `isActive` (boolean) — single field per entity | Prevents duplicate/conflicting lifecycle fields |
| **RBAC** | Permission-based via `hasPermission()`, never role-name-based | Role-agnostic architecture supports custom roles |
| **Tables** | Shared `DataTable` + module column builder + `EntityActionMenu` | Prevents per-module table reimplementations |
| **Detail pages** | `EntityProfileLayout` with tabbed navigation + `ProfileHeader` | Consistent profile page experience across modules |
| **Notes** | Separate sub-resource API (`/entities/:id/notes`) | Unbounded user-generated data, independently paginated |
| **Audit logs** | Separate sub-resource API (`/entities/:id/activity`) | Auto-generated, read-only, independently queried |
| **Mutations** | `useEntityMutation` shared abstraction preferred | Reduces boilerplate, centralizes invalidation pattern |
| **Deactivation** | Shared `DeactivateDialog` with `delete` permission | Consistent destructive action UX |
| **Reactivation** | Shared `ReactivateDialog` with `edit` permission | Reactivation is a restoration (edit), not a destructive action |
| **State management** | React Query for server state, Redux for client state (branch, UI) | Clear separation prevents state duplication |
| **Error handling** | `getErrorMessage()` + `mapBackendValidationErrors()` from `@/lib/api/errors` | Centralized, consistent error handling |

---

## 32. Customer + Services Reference Matrix

| Architecture Area | Customer Implementation | Services Implementation | Standard Going Forward |
|-------------------|------------------------|------------------------|----------------------|
| **API file** | `customers.api.ts` | `services.api.ts` + `serviceCategories.api.ts` | One file per entity, `<entity>.api.ts` |
| **Response types** | Module-specific aliases (`CustomerListResponse`) | Uses shared `PaginatedResponse<T>` directly | **Prefer shared `PaginatedResponse<T>` directly** (Services pattern) |
| **ID normalization** | `mapCustomerKeys()` | Generic `mapIdKey<T>()` | Generic `mapIdKey<T>()` preferred |
| **Query keys** | `getBranchQueryKey("customers", [params])` | `getBranchQueryKey("services", [filters])` | `getBranchQueryKey("<entity>", [params])` |
| **Branch scoping** | `branchScope: "current"` on all calls | `branchScope: "current"` on all calls | ✅ Consistent |
| **Mutation hooks** | Direct `useMutation` + `useQueryClient` | `useEntityMutation` shared abstraction | **Prefer `useEntityMutation`** (Services pattern) |
| **Form values type** | Manual `CustomerFormValues` type | `z.infer<typeof serviceSchema>` | **Prefer `z.infer`** (Services pattern) |
| **Lifecycle field** | `status: "active" \| "inactive" \| "blocked"` | `isActive: boolean` | Choose based on complexity; document choice |
| **Permission config** | `CUSTOMERS_CONFIG.permissions` | `SERVICES_CONFIG.permissions` | ✅ Consistent pattern |
| **Detail page** | `CustomerDetailsPage` with `EntityProfileLayout` + tabs | `ServiceProfilePage` with `EntityProfileLayout` + tabs | ✅ Consistent pattern |
| **Columns** | `buildCustomerColumns()` with `EntityActionMenu` | `buildServiceColumns()` with `EntityActionMenu` | ✅ Consistent pattern |
| **Delete dialog** | Module-specific `CustomerDeleteDialog` wrapping shared `DeactivateDialog` | Shared `DeactivateDialog` directly | **Use shared `DeactivateDialog` directly** (Services pattern) |
| **Reactivate dialog** | Module-specific `CustomerReactivateDialog` wrapping shared `ReactivateDialog` | Shared `ReactivateDialog` directly | **Use shared `ReactivateDialog` directly** (Services pattern) |
| **Notes** | `CustomerNotes` + `useCustomerNotes` + `useCreateCustomerNote` | Not applicable (no notes) | Follow Customer pattern when notes are needed |
| **Activity log** | `CustomerActivityLog` + `useCustomerActivity` | Not applicable (no activity log) | Follow Customer pattern when audit logs are needed |
| **Tests** | `__tests__/customers.test.tsx` | Not present | **SHOULD** add tests (Customer is the reference) |
| **Sub-entity hooks** | Flat `hooks/` directory | Sub-organized: `hooks/services/`, `hooks/categories/` | Sub-organize when multiple entities exist |
| **Components** | Flat `components/` directory | Sub-organized: `components/common/`, `components/services/`, `components/service-categories/` | Sub-organize when multiple entities exist |
| **Config** | `CUSTOMERS_CONFIG` | `SERVICES_CONFIG` | `<MODULE>_CONFIG` |
| **Constants** | Not present | `service.constants.ts` | **MAY** use when domain constants exist |
| **Filter types** | Inline `GetCustomersParams` in API file | Separate `filters.types.ts` | **Prefer separate filter type file** (Services pattern) for reusability |
| **Route pages** | `loading.tsx`, `error.tsx`, `not-found.tsx` absent | Present | **SHOULD** include route boundary files (Services pattern) |

### Key Takeaways

Where Customer and Services differ, the **Services module's patterns are generally preferred** for new modules because they:
- Use shared abstractions (`useEntityMutation`, shared dialogs directly)
- Use type inference (`z.infer`) over manual type definitions
- Use separate filter type files for reusability
- Organize sub-entities with sub-directories
- Include route boundary files (`loading.tsx`, `error.tsx`, `not-found.tsx`)

The Customer module's patterns remain the reference for:
- Notes sub-resource architecture
- Activity/audit log sub-resource architecture
- Tests (Customer is the only module with tests)
- Complex validation schemas (phone number regex, date validation)

---

```
Module Architecture Standard Version: 1.0
Reference Modules: Customer + Services
```
