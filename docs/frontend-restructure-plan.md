# Frontend Restructure Plan

> Status: **Approved direction — pending implementation**
> Date: 2026-07-16
> Scope: `frontend/` only. No backend API changes required.
> Branch: `arena/019f6cef-ai-data-analisty`

## Locked Decisions

| Decision | Choice |
|---|---|
| Design direction | Standard **shadcn/ui** look — neutral zinc palette, **dark + light mode** toggle |
| Heavy effects | **Remove entirely** — `ogl`, both Ferrofluid implementations, SpecularButton, ambient blobs, all glow/glass CSS |
| Architecture | **Feature-based** — code organized by domain, not by technical layer |
| Server state | **TanStack Query v5** — zustand keeps only auth session + UI prefs |

---

## 1. Problems With the Current Frontend

### 1.1 Structural
- **Duplicated WebGL component**: two *different* Ferrofluid implementations — `components/effects/Ferrofluid.tsx` (252 lines, Flowmap-based) used by Dashboard/Login/Register/ForgotPassword, and `components/visuals/Ferrofluid.tsx` (418 lines, Triangle-based) used by Analytics.
- **Overlapping component buckets**: `common/`, `effects/`, `visuals/` mean nothing is predictable — there's no rule for where a new component goes.
- **Flat `pages/`**: 10 page components, each doing its own data fetching with inline axios calls and string-literal endpoints.
- **Thin API layer**: one axios instance in `lib/api.ts`; no per-feature API modules; page-local type declarations (`ChartData`/`ChartResponse` live inside `VisualizationsPage.tsx`); `types/api.ts` is a 77-line grab-bag covering a fraction of the backend schemas.
- **Routing anti-patterns**: nested `<Routes>` under `path="/*"` inside `AppShell`, plus legacy redirects (`/analysis`, `/analyst`, `/reports`) hardcoded inline in `App.tsx`.
- **Silent failures**: multiple `catch {}` blocks swallow errors with no user feedback.

### 1.2 Styling
- **Three styling systems fighting**: a 504-line global CSS file (tokens + base + keyframes + component classes like `.rail-item`, `.console-border`, `.brand-mark`), Tailwind utilities, *and* inline `style={{}}` objects — often all three on the same element.
- **Global CSS component classes** for specific components (rail items, console frame) live far from the components that use them.
- **Design is performance-hostile**: full-screen WebGL canvas + two `blur(90px)` blobs + `backdrop-blur` on nearly every surface.

### 1.3 Data integrity
- **Hardcoded fake data presented as real**: LeftRail "Recent queries" is a static array; Dashboard shows "$482,190 Q3 revenue", "8 running weekly", a fake bar bento — none of it from the API.
- The Dashboard LLM console duplicates the LLM page feature with a fake result panel.

---

## 2. Target Structure

```
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── components.json                      # shadcn config (existing)
└── src/
    ├── main.tsx                         # bootstrap only
    ├── app/
    │   ├── router.tsx                   # createBrowserRouter — single route table
    │   ├── providers.tsx                # QueryClientProvider + ThemeProvider + Tooltip + Toaster
    │   └── layouts/
    │       ├── AppLayout.tsx            # sidebar + header + <Outlet/> (replaces AppShell/LeftRail/TopBar)
    │       └── AuthLayout.tsx           # centered-card shell for auth pages
    ├── components/
    │   ├── ui/                          # shadcn primitives ONLY (generated/vendored)
    │   │   ├── avatar.tsx  badge.tsx  button.tsx  card.tsx*  dialog.tsx
    │   │   ├── dropdown-menu.tsx  input.tsx  label.tsx  select.tsx
    │   │   ├── separator.tsx*  sheet.tsx*  sidebar.tsx*  skeleton.tsx*
    │   │   ├── sonner.tsx*  table.tsx  tabs.tsx*  textarea.tsx*  tooltip.tsx*
    │   │   └── chart.tsx*               # shadcn chart wrapper (recharts)
    │   └── shared/                      # cross-feature app components (hand-written)
    │       ├── PageHeader.tsx           # title + description + actions slot
    │       ├── EmptyState.tsx
    │       ├── ErrorState.tsx
    │       ├── LoadingSpinner.tsx
    │       ├── ConfirmDialog.tsx
    │       ├── ModeToggle.tsx           # dark/light switch
    │       ├── NotFoundPage.tsx
    │       └── ErrorBoundary.tsx
    ├── config/
    │   ├── navigation.ts                # nav items — single source of truth (with role gating)
    │   └── env.ts                       # typed import.meta.env access (VITE_API_BASE_URL etc.)
    ├── features/
    │   ├── auth/
    │   │   ├── api.ts                   # login, register, logout, refresh, me, forgot/reset password
    │   │   ├── types.ts                 # User, LoginRequest, RegisterRequest…
    │   │   ├── store.ts                 # zustand — session user only (moved from stores/authStore)
    │   │   ├── hooks.ts                 # useCurrentUser, useLogin, useRegister, useLogout…
    │   │   ├── components/              # LoginForm, RegisterForm, ProtectedRoute, RoleGuard
    │   │   └── pages/                   # LoginPage, RegisterPage, ForgotPasswordPage
    │   ├── datasets/
    │   │   ├── api.ts                   # list, get, upload (multipart + progress), delete
    │   │   ├── types.ts                 # Dataset schema types (from types/api.ts)
    │   │   ├── hooks.ts                 # useDatasets, useDataset, useUploadDataset, useDeleteDataset
    │   │   ├── components/              # DatasetList, DatasetCard/TableRow, UploadDatasetDialog, DatasetStatusBadge
    │   │   └── pages/                   # DatasetsPage
    │   ├── analytics/
    │   │   ├── api.ts  types.ts  hooks.ts  components/  pages/
    │   ├── visualizations/
    │   │   ├── api.ts                   # chart generation endpoints
    │   │   ├── types.ts                 # ChartData, ChartResponse (moved out of the page)
    │   │   ├── hooks.ts
    │   │   ├── components/              # ChartRenderer (recharts), ChartTypePicker
    │   │   └── pages/                   # VisualizationsPage
    │   ├── transforms/
    │   │   ├── api.ts  types.ts  hooks.ts  components/  pages/
    │   ├── llm/                         # nav label: "AI Assistant"
    │   │   ├── api.ts                   # /llm/query, /llm/history
    │   │   ├── types.ts                 # LLMQuery… (from types/api.ts)
    │   │   ├── hooks.ts                 # useLlmHistory, useAskQuestion
    │   │   ├── components/              # QueryConsole, QueryHistoryList, QueryResultCard
    │   │   └── pages/                   # LLMPage
    │   ├── dashboard/
    │   │   ├── hooks.ts                 # composes auth/datasets/llm hooks — no own backend calls
    │   │   ├── components/              # StatCards, RecentDatasets, QuickActions
    │   │   └── pages/                   # DashboardPage
    │   └── admin/
    │       ├── api.ts  types.ts  hooks.ts  components/  pages/
    ├── lib/
    │   ├── api-client.ts                # axios instance — CSRF header + 401 refresh interceptor (as today)
    │   ├── api-error.ts                 # ApiError type + formatApiError (split out of api.ts)
    │   └── utils.ts                     # cn(), formatBytes, formatDate…
    ├── hooks/                           # cross-feature hooks only
    │   ├── use-error-handler.ts
    │   ├── use-media-query.ts*
    │   └── use-debounce.ts*
    ├── styles/
    │   └── globals.css                  # tailwind import + shadcn light/dark tokens + fonts. ~120 lines max
    └── test/
        └── setup.ts
```
`*` = new files to add.

### Layering rules
1. `features/*` may import from `lib/`, `components/`, `config/`, `hooks/`, and **their own folder**. Features never import from each other — shared needs go up a level (or compose at page level, e.g. dashboard composing other features' hooks).
2. `components/ui/` contains only unmodified-pattern shadcn primitives. App-specific composition goes in `components/shared/` or the feature folder.
3. Pages never call axios directly and never contain endpoint strings — only feature hooks.
4. No global CSS beyond tokens and base resets in `styles/globals.css`. Everything else is Tailwind classes.
5. No inline `style={{}}` except values that are genuinely dynamic at runtime.

---

## 3. Routing Plan

Migrate from nested `<Routes>` to a **data router** (`createBrowserRouter` + `RouterProvider`) — gives real nested layouts, per-route lazy loading, and error boundaries.

```
/login, /register, /forgot-password   → AuthLayout     (redirect to / if already authed)
/                                      → AppLayout (ProtectedRoute)
    index                              → DashboardPage        (lazy)
    /datasets                          → DatasetsPage         (lazy)
    /analytics                         → AnalyticsPage        (lazy)
    /visualizations                    → VisualizationsPage   (lazy)
    /transforms                        → TransformsPage       (lazy)
    /assistant                         → LLMPage              (lazy, renamed from /llm)
    /admin                             → AdminPage            (lazy, RoleGuard: admin)
    (legacy: /dashboard /analysis /analyst /reports /llm → <Navigate> shims, one block)
*                                      → NotFoundPage         (replaces silent redirect to /)
```

- All legacy redirects live in **one** clearly-labeled block of the route table instead of being scattered.
- Every lazy route gets a `<Suspense>` fallback (skeleton) and the route-level `ErrorBoundary`.

---

## 4. Design System

### 4.1 Theme
- **shadcn default "zinc"** palette with CSS variables, light + dark via `.dark` class on `<html>` (`darkMode: "class"` semantics in Tailwind 4 via `@custom-variant dark`).
- `ThemeProvider` (small custom, no dep): `light | dark | system`, persisted to `localStorage`, default **system**. `ModeToggle` in the app header.
- Fonts: **Inter** (UI) + **JetBrains Mono** (data/code), self-hosted via `@fontsource-variable/*` — replaces Space Grotesk / IBM Plex Mono and removes render-blocking Google Fonts if any.

### 4.2 What dies
`glass*`, `console-border`, `shimmer-overlay`, `ambient-*`, `brand-mark`, `rail-item`, `btn-glow`, `stagger-children`, `card-lift`, the entire `@property --angle` block, every glow shadow, both Ferrofluid `*.css` files, and the `void/ink/teal-glow/...` custom palette.

Replacements:
- `.glass rounded-[var(--radius-lg)] p-5` → `<Card>` (`ui/card.tsx`, flat `bg-card border`).
- `.section-heading` → `<PageHeader>` / a muted-foreground label style inside components.
- `.rail-item` → `ui/sidebar.tsx` menu items.
- SpecularButton → `ui/button.tsx` variants.
- Fake bento bars → `recharts` via `ui/chart.tsx` (only where backed by real data).

### 4.3 Layout
- shadcn **Sidebar** (collapsible to icons on desktop, `Sheet` drawer on mobile) — items from `config/navigation.ts`: Console/Dashboard, Datasets, Analytics, Visualizations, Transforms, AI Assistant; Admin section gated by role.
- Header: sidebar trigger, page title/breadcrumb, spacer, `ModeToggle`, user `DropdownMenu` (existing pattern).
- Content: centered `max-w` container, consistent `PageHeader` per page, `Skeleton` loading states, `EmptyState`, `ErrorState` with retry.
- Motion buried to near-zero: subtle transitions only; keep the existing `prefers-reduced-motion` respect and teal→primary focus rings become `ring-ring`.

### 4.4 Feedback
- Add `sonner` toasts. Every mutation failure surfaces `formatApiError(e).userMessage` — kills the silent `catch {}` pattern.
- Query errors render `ErrorState` with a refetch button instead of blank sections.

---

## 5. Data Layer

### 5.1 TanStack Query
- `config/queryClient` shape inside `providers.tsx`: `staleTime: 30s`, `retry: 1`, `refetchOnWindowFocus: false`.
- **Query key factories** per feature:
  ```ts
  // features/datasets/hooks.ts
  export const datasetKeys = {
    all: ["datasets"] as const,
    lists: () => [...datasetKeys.all, "list"] as const,
    detail: (id: string) => [...datasetKeys.all, "detail", id] as const,
  };
  ```
- Mutations (`useUploadDataset`, `useDeleteDataset`, `useAskQuestion`…) invalidate their feature's `all` key on success.
- Upload progress stays **local component state** in `UploadDatasetDialog` (axios `onUploadProgress`), not in a store.

### 5.2 What stays / what goes
- `lib/api-client.ts` keeps the existing CSRF header injection and single-flight 401 refresh interceptor — that logic is good, just relocated.
- **`datasetStore` is deleted** — fully replaced by query hooks.
- **`authStore` (zustand) stays** but moves to `features/auth/store.ts`; hydrated by a `useCurrentUser` query (`/auth/me`) — zustand holds the session snapshot, React Query owns fetching.
- New tiny `useUiStore` only if needed (sidebar collapsed pref); theme lives in `ThemeProvider`.

### 5.3 API base URL
`config/env.ts`: `VITE_API_BASE_URL ?? "/api/v1"` — removes the hardcoded constant from the axios module.

---

## 6. Dependencies

**Remove:** `ogl`

**Add:**
| Package | Why |
|---|---|
| `@tanstack/react-query` | server state |
| `recharts` | real charts (shadcn chart compat) |
| `sonner` | toasts |
| `tw-animate-css` | shadcn Tailwind-4 animation utilities |
| `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono` | self-hosted fonts |
| `@tanstack/react-query-devtools` (dev) | debugging |

Radix deps already present cover dialog/select/avatar/dropdown/label/tabs/separator; add `@radix-ui/react-tooltip` (+ whatever `sidebar`/`sheet` need) during shadcn adds.

---

## 7. File Migration Map

| Old | New |
|---|---|
| `src/lib/api.ts` | split → `src/lib/api-client.ts` + `src/lib/api-error.ts` |
| `src/types/api.ts` | split → `features/*/types.ts` |
| `src/stores/authStore.ts` | `features/auth/store.ts` |
| `src/stores/datasetStore.ts` | **deleted** (→ `features/datasets/hooks.ts`) |
| `src/pages/LoginPage.tsx` etc. | `features/auth/pages/*` |
| `src/pages/DatasetsPage.tsx` | `features/datasets/pages/DatasetsPage.tsx` + extracted components |
| `src/pages/{Analytics,Visualizations,Transforms,LLM,Admin}Page.tsx` | corresponding `features/*/pages/` |
| `src/pages/DashboardPage.tsx` | `features/dashboard/` (console → `features/llm/components/QueryConsole`) |
| `src/components/layout/AppShell.tsx` + `LeftRail.tsx` + `TopBar.tsx` | `src/app/layouts/AppLayout.tsx` + `ui/sidebar` + shared header |
| `src/components/layout/ProtectedRoute.tsx` | `features/auth/components/ProtectedRoute.tsx` |
| `src/components/common/GlassCard.tsx` | **deleted** → `ui/card` |
| `src/components/common/AmbientBackground.tsx` | **deleted** |
| `src/components/effects/*`, `src/components/visuals/*` | **deleted** |
| `src/index.css` | `src/styles/globals.css` (rewrite) |
| `src/App.tsx` | `src/app/router.tsx` + `src/app/providers.tsx` (App.tsx deleted) |

---

## 8. Fake-Data Removal (backend gaps to flag)

The redesign must not resurface hardcoded numbers. Items needing real sources:

| Current fake | Real source |
|---|---|
| LeftRail "Recent queries" | `/llm/history` (real endpoint exists) — rendered in Assistant page; dropped from nav |
| Dashboard "$482,190 / ▲12.4% / Top regions" bento | LLM query response → `QueryResultCard`; hidden until a real answer arrives |
| Dashboard "8 running weekly" scheduled reports | No backend endpoint — **gap**: either hide the card or add endpoint later |
| Dashboard quick-access counts | `datasets.length` (real), `history.length` (real) — keep |

Rule: if data doesn't come from an endpoint, it doesn't render.

---

## 9. Execution Phases

Each phase ends with `npm run lint && npm test && npm run build` green.

- **Phase 0 — Baseline**: confirm `lint`/`test`/`build` green on current code; snapshot warnings that already exist.
- **Phase 1 — Foundation**: deps add/remove → `styles/globals.css` tokens → `config/env.ts` → `lib/api-client.ts` + `lib/api-error.ts` (update imports) → `providers.tsx` (QueryClient, Theme, Tooltip, Toaster) → shadcn adds (`card`, `skeleton`, `sonner`, `separator`, `tooltip`, `sheet`, `sidebar`, `textarea`, `tabs`). Old pages keep working through this phase.
- **Phase 2 — Shell & router**: `router.tsx` (data router, lazy pages, legacy redirect block, NotFound) → `AppLayout` (sidebar + header + ModeToggle) → `AuthLayout` → move `ProtectedRoute`. Delete `AppShell`/`LeftRail`/`TopBar`/`App.tsx` and the `index.css` leftovers.
- **Phase 3 — Feature migration** (one feature at a time, in order):
  1. **auth** (pages + forms + store move; Login/Register/Forgot on AuthLayout)
  2. **datasets** (hooks real; upload dialog; toasts; delete `datasetStore`)
  3. **llm** (`QueryConsole` extracted as reusable; history wired)
  4. **dashboard** (compose real hooks; StatCards/RecentDatasets; embed compact `QueryConsole`; delete fake bento)
  5. **analytics**
  6. **visualizations** (recharts `ChartRenderer`; types moved out of page)
  7. **transforms**
  8. **admin**
- **Phase 4 — Purge**: delete `effects/`, `visuals/`, `common/`, `types/api.ts` (once empty); remove `ogl`; purge dead CSS; verify no `style={{}}` leftovers except dynamic values.
- **Phase 5 — Quality**: update `api.test.ts` imports; add a smoke test for router + one feature hook; a11y pass (focus-visible, aria on sidebar/nav); bundle-size check; update `frontend/README.md` (structure + conventions) and root README screenshots section.

---

## 10. Conventions (go in `frontend/README.md`)

1. New domain code → a feature folder, never loose in `components/`.
2. Endpoint strings exist only in `features/*/api.ts`.
3. Server data only via feature hooks (TanStack Query); zustand never holds server state.
4. Styling = Tailwind + shadcn tokens only. No new global CSS, no inline styles for static values.
5. Every mutation failure → sonner toast with `formatApiError().userMessage`.
6. Loading → `Skeleton`; empty → `EmptyState`; error → `ErrorState` + retry.
7. No fake data. If the endpoint doesn't exist, the UI doesn't show the number.

---

## 11. Open Decisions (small, can decide during Phase 1–2)

1. **Nav label for `/assistant`** — feature folder stays `llm/` (mirrors backend); display label proposed "AI Assistant".
2. **Analytics "8 running weekly"** — hide card now, or leave a `—` placeholder until a backend endpoint exists.
3. **Admin page scope** — restyle only, or also break out tabs (users/roles/audit) from the current 164-line page.
4. **Default theme** — `system` (recommended) vs forced dark.
