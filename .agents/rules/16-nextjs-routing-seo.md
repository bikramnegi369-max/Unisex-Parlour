---
trigger: model_decision
description: Apply when creating or modifying Next.js routes, layouts, pages, dynamic routes, metadata, SEO, Open Graph, canonical URLs, sitemap, robots, loading states, error pages, or navigation.
---

# Next.js Routing, SEO & Metadata Rules

Follow modern Next.js App Router best practices for routing, navigation, rendering, metadata, and SEO.

Follow the project's existing routing architecture before introducing changes.

## App Router

Use the Next.js App Router conventions already established by the project.

Follow the appropriate structure for:

- `page.tsx`
- `layout.tsx`
- `loading.tsx`
- `error.tsx`
- `not-found.tsx`
- `route.ts`

Do not introduce Pages Router patterns into an App Router project unless explicitly required.

## Route Structure

Keep routes organized according to the application's domain.

Use route groups when they improve organization without affecting URLs.

Examples:

```text id="k6m2pz"
app/
  (dashboard)/
  (auth)/
  (marketing)/
```

Use route groups to organize layouts and page structure without unnecessarily changing public URLs.

## Layouts

Use layouts for shared UI and persistent application structure.

Good candidates include:

- Dashboard navigation
- Sidebar
- Header
- Authentication layouts
- Marketing layouts

Do not duplicate shared layout markup across individual pages.

Keep layouts focused on shared structure.

## Dynamic Routes

Use dynamic routes for entity-specific pages.

Examples:

```text id="x8v4qn"
/workers/[id]
/projects/[id]
/blogs/[slug]
```

Use descriptive parameter names.

Validate route parameters when necessary.

Do not assume a dynamic parameter is valid simply because it exists in the URL.

## Route Parameters

Handle missing or invalid route parameters appropriately.

For entity routes:

1. Validate the parameter.
2. Fetch the resource.
3. Handle not-found responses.
4. Render the appropriate page.

Use `notFound()` when the requested resource genuinely does not exist and the project's architecture supports it.

Do not show a generic empty page for a missing resource.

## Navigation

Use Next.js `Link` for internal navigation.

Prefer:

```tsx id="e5r2m9"
<Link href="/workers">Workers</Link>
```

over manually handling navigation with `window.location`.

Use programmatic navigation only when navigation is triggered by application logic.

## Navigation State

Preserve relevant navigation state when appropriate.

For example:

- Search
- Filters
- Pagination
- Sorting

Use URL search parameters when state should be shareable or preserved through navigation.

## Loading UI

Use `loading.tsx` or localized loading states when appropriate.

Provide useful feedback during navigation and data loading.

Avoid unnecessarily blocking the entire page when only a small section is loading.

Follow the project's existing loading and skeleton patterns.

## Error UI

Use Next.js error boundaries where appropriate.

Provide a user-friendly fallback.

Include recovery actions when possible.

Do not expose internal implementation details.

Follow the project's existing error-handling architecture.

## Not Found Pages

Use `not-found.tsx` for appropriate 404 scenarios.

Provide a clear message.

Offer useful navigation such as:

- Return home
- Go to dashboard
- Return to previous section

Do not show raw backend 404 responses directly to users.

## Metadata

Use Next.js Metadata APIs.

Prefer:

- Static metadata for static pages.
- `generateMetadata` for dynamic pages.

Keep metadata relevant to the actual page.

Avoid duplicating metadata logic unnecessarily.

## Page Titles

Every important public-facing page should have a meaningful title.

Prefer descriptive titles such as:

```text id="r6p2vz"
Workers | Company ERP
```

Avoid generic titles such as:

```text id="x2m7qd"
Page
Dashboard
Home
```

unless appropriate for the application.

## Meta Descriptions

Public-facing pages should have meaningful descriptions when SEO is relevant.

Descriptions should:

- Describe the page accurately.
- Be unique when appropriate.
- Avoid keyword stuffing.
- Match the page content.

Do not use the same generic description for every page.

## Canonical URLs

Use canonical URLs when necessary to prevent duplicate-content issues.

Ensure canonical URLs represent the preferred public URL.

Do not create conflicting canonical URLs across similar pages.

## Open Graph

For public-facing pages that may be shared, configure appropriate Open Graph metadata.

Include when relevant:

- Title
- Description
- URL
- Image
- Site name

Use the project's existing Open Graph image strategy.

Do not create duplicate image-generation or metadata systems unnecessarily.

## Twitter Metadata

Follow the project's existing social metadata strategy.

Configure appropriate social sharing metadata when required.

Do not add redundant metadata implementations.

## Dynamic Metadata

For dynamic pages, generate metadata based on the actual resource.

Examples:

```text id="m7v2kc"
Blog title
Product name
Event name
Project name
```

Handle missing data safely.

Do not generate metadata from untrusted or unsafe HTML without appropriate processing.

## SEO and Client Components

Keep metadata generation in server-compatible code.

Do not unnecessarily convert pages to Client Components just to generate metadata.

Use server-side metadata APIs where possible.

## Robots

Follow the project's SEO architecture for robots configuration.

Prevent indexing of pages that should not appear in search engines when appropriate.

Examples may include:

- Admin dashboards
- Authentication pages
- Internal application routes

Do not accidentally block important public pages.

## Sitemap

Include relevant public-facing routes in the sitemap when appropriate.

Do not include private application routes unnecessarily.

For dynamic content, follow the project's established sitemap generation strategy.

## Private ERP Routes

Internal ERP pages generally should not be treated as public SEO pages.

Do not spend unnecessary effort generating SEO metadata for private dashboard screens unless required by the application.

Focus SEO optimization on public-facing routes.

## Authentication Routes

Authentication pages should follow the application's SEO requirements.

If login and private routes should not be indexed, configure appropriate robots behavior according to the project's architecture.

Do not expose authenticated content through publicly accessible metadata.

## Route Protection

Do not assume that hiding a route from navigation protects it.

Protected routes must use the project's established authentication and authorization architecture.

The backend must continue enforcing access control.

## URL Design

Use clean, descriptive URLs.

Prefer:

```text id="d8x2kv"
/workers
/workers/123
/projects
/projects/123
```

Avoid unnecessarily complex URLs.

Use consistent naming conventions throughout the application.

## Redirects

Use Next.js routing mechanisms for redirects.

Do not implement arbitrary client-side redirects when server-side redirects are more appropriate.

Validate user-controlled redirect destinations.

Avoid open redirect vulnerabilities.

## Caching and Revalidation

Follow the project's established Next.js data caching strategy.

Do not disable caching globally to solve a single stale-data issue.

Use appropriate revalidation or invalidation strategies based on data freshness requirements.

## Avoid Unnecessary Client Components

Do not mark an entire route as `"use client"` unnecessarily.

Keep server-rendered content on the server when possible.

Use client components only for interactive functionality.

## Final Check

Before completing routing or SEO work, verify:

- App Router conventions are followed.
- Existing route structure is preserved.
- Shared layouts are reused.
- Dynamic routes validate parameters.
- Missing resources use appropriate not-found behavior.
- Internal navigation uses Next.js `Link`.
- Loading states are handled.
- Error states are handled.
- Metadata is meaningful and accurate.
- Dynamic pages generate appropriate metadata.
- Canonical URLs are correct when required.
- Open Graph metadata is configured where appropriate.
- Private routes are not unnecessarily indexed.
- Sitemap includes relevant public routes.
- Robots configuration is correct.
- Authentication and authorization are not bypassed.
- Redirects are safe.
- No unnecessary Client Components were introduced.
- Existing SEO and metadata utilities were reused where available.
