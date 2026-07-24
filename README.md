# Unisex Parlour ERP Frontend

A production-grade, highly-scalable Frontend ERP web application built with **Next.js 15 (App Router)** and **TypeScript** for a Unisex Parlour. This frontend communicates exclusively via HTTP APIs with an external Express.js API server.

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
