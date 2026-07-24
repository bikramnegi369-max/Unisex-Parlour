# Unisex Parlour ERP — Frontend

A production-grade, multi-branch ERP frontend for a Unisex Parlour business. Built with **Next.js 16 (App Router)** and **TypeScript**. Communicates exclusively with a separate **Express.js backend** via HTTP APIs.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Server State | TanStack React Query v5 |
| Global Client State | Redux Toolkit |
| HTTP Client | Axios (centralized instance) |
| Forms & Validation | React Hook Form + Zod |
| Data Tables | TanStack Table v8 |
| Charts | Recharts |
| Icons | Lucide React |
| Font | Google Poppins (via next/font) |

---

## 📂 Project Structure

```text
src/
  app/
    (auth)/           # Login, forgot-password, reset-password
    (dashboard)/      # All ERP module pages (protected)
      layout.tsx      # Auth guard + sidebar + header + branch init
  components/
    ui/               # Button, Input, Card, Dialog, Select
    layout/           # Sidebar, Header, Breadcrumbs, BranchSwitcher,
    │                 # ProtectedRoute, PermissionGate
    tables/           # Reusable DataTable
    forms/            # Shared form field wrappers
  features/
    auth/             # useAuth hook, login mutation, session query
    branches/         # useBranches hook, branches API service
    customers/        # (planned)
    appointments/     # (planned)
    dashboard/        # (planned)
  lib/
    api/              # axios.ts — centralized Axios client
    auth/             # token.ts — access/refresh token storage
    branch/           # storage.ts — branch selection persistence
    permissions/      # index.ts — RBAC helpers + PermissionType
    utils.ts          # cn() class merger utility
  store/
    index.ts          # Redux store configuration
    slices/
      uiSlice.ts      # Sidebar open/collapsed, light/dark theme
      branchSlice.ts  # currentBranchId, availableBranches, org
  types/
    branch.ts         # Organization, Branch, BranchAccess types
  hooks/
    store.ts          # useAppDispatch, useAppSelector typed hooks
    useMediaQuery.ts  # useSyncExternalStore-based media query hook
    useBranchContext.ts  # Convenience hook for branch state access
```

---

## 🏢 Multi-Branch Architecture

> **This ERP is designed as a multi-branch system from the foundation.**
> An Owner / Organization manages multiple physical branches from one ERP.

### Business Hierarchy

```
Organization (Owner account)
    ├── Branch A  (e.g. Koramangala)
    ├── Branch B  (e.g. Indiranagar)
    └── Branch C  (e.g. Whitefield)
```

### Branch State Flow

```
Login
  └── useBranches() (React Query)
        └── fetches GET /branches
              └── populates Redux branchSlice
                    ├── availableBranches[]
                    ├── currentOrganization
                    └── restores currentBranchId from localStorage
```

### Key Files

| File | Responsibility |
|---|---|
| [`src/types/branch.ts`](src/types/branch.ts) | `Organization`, `Branch`, `BranchAccess` type definitions |
| [`src/lib/branch/storage.ts`](src/lib/branch/storage.ts) | localStorage persistence for selected branch ID |
| [`src/store/slices/branchSlice.ts`](src/store/slices/branchSlice.ts) | Redux slice: `currentBranchId`, `availableBranches`, `currentOrganization` |
| [`src/features/branches/api/branches.api.ts`](src/features/branches/api/branches.api.ts) | Isolated API contracts for `GET /branches` |
| [`src/features/branches/hooks/useBranches.ts`](src/features/branches/hooks/useBranches.ts) | React Query fetch → Redux population → branch validation |
| [`src/hooks/useBranchContext.ts`](src/hooks/useBranchContext.ts) | `currentBranch`, `branchKey`, `selectBranch()` — use in all components |
| [`src/components/layout/BranchSwitcher.tsx`](src/components/layout/BranchSwitcher.tsx) | Global dropdown in Header — shows accessible branches |

### Branch Switcher Rules

- Owners see **"All Branches"** + individual branch list
- Managers/Receptionists/Stylists see **only their assigned branches**
- Selected branch persists via `localStorage` across page refreshes
- On page load, the stored branch ID is validated against the user's current access — invalid stored values fall back to the first available branch

### Axios Branch Injection

Every outgoing API request automatically carries the active branch context via a centralized Axios request interceptor:

```
X-Branch-Id: branch-1
```

Change the injection mechanism (to query param, route param, etc.) in one place: `src/lib/api/axios.ts`.

### TanStack Query Key Convention

All branch-scoped queries **must** include organization and branch scope in their query keys to prevent cross-branch data leakage:

```ts
// Get branchKey from useBranchContext — it is 'all' or '<branchId>'
const { branchKey, currentOrganization } = useBranchContext();

useQuery({
  queryKey: ['customers', currentOrganization?.id, branchKey, filters],
  queryFn: () => getCustomers(params),
});
```

Switching branches automatically causes a **cache miss** for the new branch scope, triggering a fresh fetch and preventing Branch A data from appearing in Branch B views.

### Module Scoping Reference

| Module | Scope |
|---|---|
| Dashboard | Branch-specific + org-wide consolidated |
| Customers | Branch-specific |
| Appointments | Branch-specific |
| Employees | Branch-specific |
| Services | Organization-wide (branch availability may vary) |
| Memberships | Org-wide plans, branch-specific sales |
| Coupons | Org-wide, optionally branch-specific |
| Billing / POS | Branch-specific |
| Inventory | Branch-specific |
| Suppliers | Organization-wide |
| Finance | Branch-specific + org-wide consolidated |
| Loyalty | Organization-wide |
| Reports | Branch-specific + org-wide consolidated |
| Users & Roles | Organization-wide |
| Settings | Org-wide + branch-level overrides |
| Activity Logs | Branch-specific + org-wide |

---

## 🔐 RBAC Architecture

### Permission Model

RBAC separates **what** a user can do from **which branches** they can access.

```ts
// What the user can do
user.permissions: ['customers.view', 'customers.create', 'billing.view']

// Which branches the user can access
user.branchAccess: [
  { branchId: 'branch-1', branchName: 'Koramangala', isActive: true },
  { branchId: 'branch-2', branchName: 'Indiranagar', isActive: true },
]
```

### Permission Helpers (`src/lib/permissions/index.ts`)

```ts
hasPermission(user, 'billing.refund')         // single permission
hasAnyPermission(user, ['billing.view', 'billing.create'])
hasAllPermissions(user, ['finance.view', 'finance.edit'])

hasBranchAccess(user, 'branch-2')             // branch access check
getAccessibleBranches(user)                   // list of active branches
hasOrgWideAccess(user)                        // true for Owner role
```

### Gate Component

```tsx
<PermissionGate permission="billing.refund">
  <RefundButton />
</PermissionGate>
```

> **Important**: Frontend RBAC is a UX layer only. The Express backend must enforce all real authorization. Never rely on frontend checks as a security boundary.

---

## 🔑 Authentication Flow

```
POST /auth/login
  └── stores accessToken (memory) + refreshToken (localStorage)
      └── GET /auth/me → populates useAuth() session
            └── ProtectedRoute checks session → renders or redirects to /login
```

If no token exists in storage, the session query immediately returns `null` — the user is never auto-authenticated without first completing the login form.

### Token Refresh

The Axios interceptor uses a **thread-safe queue** to handle concurrent `401` responses:
1. First `401` triggers `POST /auth/refresh`
2. All other failing requests are queued
3. On success: new token applied, queue replayed
4. On failure: all tokens cleared, user redirected to `/login`

---

## 🧩 Shared Coding Conventions

### useEffect
Use `useSyncExternalStore` for browser subscriptions (e.g. `useMediaQuery`). Do not call `setState` synchronously inside `useEffect`.

### State Management Decision Guide

| Data type | Where it lives |
|---|---|
| Auth session / user profile | TanStack React Query (`auth-user`) |
| Branch lists from backend | TanStack React Query (`branches`) |
| Currently selected branch | Redux (`branchSlice.currentBranchId`) |
| Sidebar open / theme | Redux (`uiSlice`) |
| POS cart (Phase 8) | Redux (`billingSlice`) |
| Filter/search/pagination state | `useSearchParams` (URL) |
| Modal/drawer open state | Local `useState` |

---

## 🚀 Running Locally

```bash
# Development server with hot reload
npm run dev

# TypeScript type check (no emit)
npx tsc --noEmit

# Full production build + compilation check
npm run build

# Lint
npm run lint
```

---

## ✅ Build Phase Status

| Phase | Description | Status |
|---|---|---|
| 1 | Foundation Setup — store, Axios, RBAC, auth tokens, UI base | ✅ Complete |
| 2 | Dashboard Shell — Sidebar, Header, Breadcrumbs, layout | ✅ Complete |
| 3 | Auth & RBAC Views — Login, Staff Directory, Roles Matrix | ✅ Complete |
| 3.5 | Multi-Branch Foundation — branch types, Redux, switcher, Axios | ✅ Complete |
| 4 | Dashboard Panel — KPI cards, revenue chart, today's bookings | 🔲 Planned |
| 5 | Customers, Employees, Services — CRUD modules + DataTable | 🔲 Planned |
| 6 | Appointments & Calendar — day/week/month views | 🔲 Planned |
| 7 | Memberships, Coupons, Loyalty | 🔲 Planned |
| 8 | Billing / POS | 🔲 Planned |
| 9 | Inventory & Suppliers | 🔲 Planned |
| 10 | Finance — P&L, Cash Flow, GST | 🔲 Planned |
| 11 | Reports & Analytics | 🔲 Planned |
| 12 | Settings, WhatsApp/SMS/Email templates, Activity Logs, Branches | 🔲 Planned |

---

## 📌 Pre-Commit Verification Checklist

Before completing any phase or merging changes:

- [ ] `npm run build` passes with 0 errors
- [ ] `npx tsc --noEmit` passes with 0 type errors
- [ ] No `any` types, `@ts-ignore`, or `console.log` left in code
- [ ] No unused imports or dead code
- [ ] All API-driven views handle: Loading, Empty, Success, Error states
- [ ] `<PermissionGate>` wraps all restricted UI actions
- [ ] No backend endpoints invented without a clearly marked API contract
- [ ] Responsive verified at: 375px / 768px / 1024px / 1280px+
- [ ] Branch-scoped queries include `[orgId, branchKey]` in query keys


---

## 🛠️ Tech Stack & Foundations

- **Core Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) & [Radix UI primitives](https://www.radix-ui.com/)
- **State Management**: 
  - **Server State**: [React Query (TanStack Query) v5](https://tanstack.com/query/latest) (handling caching, synchronization, and API mutations)
  - **Client State**: [Redux Toolkit](https://redux-toolkit.js.org/) (reserved for UI layout state and complex temporary client transactions like active POS billing sessions)
- **API Communication**: [Axios](https://axios-http.com/)
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Data Tables**: [TanStack Table v8](https://tanstack.com/table/latest) (Server-side paginated, sorted, and filtered)
- **Charts & Dashboard**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📂 Folder Directory Structure

The codebase is organized using a scalable architecture structure:

```text
src/
  ├── app/                  # Routing, Layouts, and Pages (Next.js App Router)
  │   ├── (auth)/           # Authentication routes (login, forgot-password, etc.)
  │   └── (dashboard)/      # Protected ERP panel routes (billing, customers, etc.)
  ├── components/           # Domain-agnostic UI and core components
  │   ├── ui/               # Lower-level design components (shadcn buttons, inputs, etc.)
  │   ├── layout/           # Sidebar, Navigation, Headers
  │   ├── tables/           # Reusable server-side data tables
  │   └── forms/            # Shared form components
  ├── features/             # Domain-specific modules encapsulating logic, hooks, and views
  │   ├── auth/             # Login forms, token management, auth state
  │   ├── customers/        # Profiles, visit history, preferences
  │   ├── appointments/     # Calendars, allocation, walk-in/advance booking
  │   └── billing/          # POS flow, discounts, calculations
  ├── lib/                  # Configurations, client instantiations, and helpers
  │   ├── api/              # Centralized Axios client and interceptors
  │   ├── auth/             # Token storage management
  │   ├── permissions/      # RBAC gates and authorization logic
  │   └── utils/            # Utility helpers (cn class merging, formatters)
  ├── store/                # Redux Toolkit global store and slices
  └── types/                # Global TypeScript definitions & contracts
```

---

## 🔐 Key Architectures

### 1. API Integration & Interceptors (`src/lib/api/axios.ts`)
- Utilizes a centralized Axios client targeting `NEXT_PUBLIC_API_BASE_URL`.
- Attaches the bearer token automatically via a request interceptor.
- Includes a response interceptor with a thread-safe queue mechanism. If a token expires (401 Unauthorized), it pauses outgoing requests, triggers a refresh token handshake (`/auth/refresh`), updates the local store, and replays all blocked requests safely. If refresh fails, it clears credentials and routes the user to `/login`.

### 2. RBAC & Frontend Security (`src/lib/permissions/`)
- Relies on string-based permissions (e.g., `customers.view`, `billing.create`) passed within the user session.
- Features helper methods: `hasPermission`, `hasAnyPermission`, `hasAllPermissions`.
- Leverages a wrapper `<PermissionGate permission="...">` to cleanly hide/show interface actions based on permissions, providing a clean UX layer.

### 3. Git Hygiene & Ignored Files
- The project is configured with a strict `.gitignore` ensuring that dependency bundles (`node_modules`), build artifacts (`.next/`, `build/`), environment settings (`.env*` except `.env.example`), and editor-specific directories (`.vscode`, `.idea`) are never tracked.

---

## 🚀 Running the Project

### Development
```bash
npm run dev
```

### Production Build & Compilation Check
```bash
npm run build
```
This performs a full TypeScript check, ESLint validation, and compiles static routing output.

---

## 📌 Development Verification Lifecycle (Mandatory Checklist)
Before concluding any feature addition or architectural phase, the developer **must** verify:
1. **TypeScript compilation**: Run `npx tsc --noEmit`.
2. **ESLint constraints**: Run `npm run lint`.
3. **Optimized Build**: Run `npm run build` to ensure webpack/turbopack compiles all assets.
4. **Git Cache Verification**: Run `git status` to ensure `node_modules` or `.env` are not leaking into git staging.
