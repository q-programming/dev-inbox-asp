# Copilot Instructions — Dev Inbox

## Project Overview

Dev Inbox is a personal developer workspace that aggregates GitHub PRs, Azure DevOps work items, and personal notes into
a unified, filterable inbox. It is a **learning project** exploring Spring Modulith, domain events, and a
well-structured React frontend.

- **Frontend**: `src/main/webapp/` — React 18 · TypeScript 5 · Vite · TanStack Query · Zustand · Tailwind v4 · shadcn/ui
- **Backend**: `src/main/java/pl/qprogramming/devinbox/` — Java 21 · Spring Boot 3.5 · Spring Modulith · PostgreSQL ·
  Flyway
- **API contract**: `src/main/resources/swagger/api.yml` (OpenAPI-first; TypeScript client is auto-generated into
  `src/main/webapp/generated/`)

---

## Java / Spring Standards

### General

- Java 21; use **virtual threads** (`spring.threads.virtual.enabled=true`) — no reactive streams needed.
- Prefer **records** for DTOs and value objects.
- Use **Lombok** with it's @ annotations , val/var etc.
- All public APIs must have proper Javadoc on the _why_, not the _what_.

### Spring Modulith

- Each top-level package under `pl.qprogramming.devinbox` is an **isolated module**. Never inject internal types from
  another module.
- Cross-module communication **only** via domain events published through Spring Modulith's event publication registry (
  transactional outbox — no dual-write).
- Keep module public API surface minimal: expose only the types needed by other modules in the package root; internals
  go in sub-packages.
- `ModularityTests` must pass; add ArchUnit rules for custom architectural constraints.

### Persistence

- Liquidbase versioned migrations in `src/main/resources/config/liquidbase/`.
- liquidbase upgrade scripts to be written in sql
- For fresh db , there is pl.qprogramming.devinbox.config.DatabaseInitializer which will do auto db creation if it's
  empty
- Use Spring Data JPA repositories; write `@Query` JPQL when needed — avoid raw SQL in Java code.
- The `inbox_projection` table is a **read model** — update it only from inbox-module event handlers.

### REST / API

- OpenAPI spec (`api.yml`) is the **source of truth**; generate server stubs from it, do not hand-write controllers that
  contradict the spec.
- Return proper HTTP status codes; use `ProblemDetail` (RFC 9457) for error responses.
- DTOs live in the `inbox` or respective module — never expose JPA entities over the API.

### Testing

- Integration tests use **Testcontainers** with a real PostgreSQL container.
- Unit tests use JUnit 5 + AssertJ; avoid Mockito overuse — prefer real objects and in-memory fakes.
- Test class names: `*Test` for unit, `*IT` for integration.

---

## React / TypeScript Standards

### General

- TypeScript strict mode; no `any`, no `@ts-ignore` without a comment explaining why.
- Functional components only; no class components.
- Use **arrow functions** for all components and hooks (`const Foo = () => ...`). Default export is only for route-level
  pages.
- File names match the exported component name (`InboxList.tsx`).

### State Management

- **TanStack Query** owns all server state (fetching, caching, invalidation). Never store fetched data in `useState` or
  Zustand.
- **Zustand** is for UI-only state (selected item, panel open, density). Keep stores small and focused.
- **React Hook Form + Zod** for all forms; define schemas in a `*.schema.ts` file co-located with the form.

### API Layer

- Never import directly from `generated/`. Always go through `src/shared/api/` wrappers that map DTOs to view models.
- Use the `@api` path alias for the generated client (configured in tsconfig + vite).

### Feature Structure

- **`src/app/`** — the app's skeleton. Nothing works without these, organized by concern:
    - `auth/` — LoginPage, RegisterPage
    - `guard/` — AuthGuard (route protection)
    - `layout/` — Layout (app shell)
    - `ui/` — Alert (global overlay)
- **`src/features/<feature>/`** — product features (inbox, notes, settings) each with `components/`, `hooks/`, `types/`
  subdirectories.
- **`src/shared/`** — genuinely cross-cutting infrastructure used by multiple features:
    - `api/` — `httpClient.ts`, `queryClient.ts`
    - `hooks/` — `useAuthQuery.ts`, `useHealthQuery.ts`
    - `store/` — `auth.store.ts`, `alert.store.ts`
    - `utils/` — pure utility functions
- URL query parameters drive all filter state; query keys must include filter params.

### Styling

- **MUI v9 is the primary UI library** — use it for all components, layout, and theming.
- Tailwind CSS v4 may be used for fine-grained utility overrides only when MUI `sx` is insufficient.
- **Never use raw hex colours, magic pixel values, or hardcoded font sizes in component files.**
  All visual tokens must come from the MUI theme (`theme.palette.*`, `theme.spacing()`, `theme.shape.borderRadius`, `theme.typography.*`).
- Use `sx` prop for one-off style overrides; extract repeated patterns into the theme's `components` overrides.
- **Never use emojis as icons** — always use `@mui/icons-material` SVG icons. They scale, theme-inherit colour, and are accessible.
- Theme is defined in `src/shared/theme/theme.ts` via `buildTheme(mode)`. To add a new colour token:
  1. Add it to the `palette` object in `buildTheme`.
  2. Add TypeScript augmentation in the `declare module '@mui/material/styles'` block at the top of `theme.ts`.
  3. Reference it in components via `sx={{ color: 'hero.gradientBg' }}` or `theme => theme.palette.hero.badgeBg`.
- Light/dark mode is driven by `useAuthStore().profile.theme` (a `Theme` enum). `AppThemeProvider` reads it and rebuilds the MUI theme. Toggle by calling `useAuthStore().toggleTheme()`.
- `background.default` and `background.paper` are set in the theme and must be the only background colours used on page wrappers. Never hardcode `bg-gray-50` or `bgcolor: '#fff'`.
- `typography.button` has `textTransform: 'none'` and `fontWeight: 600` — do not override these per-component.
- `shape.borderRadius` is `4` — use `theme.shape.borderRadius` or multiples via `sx={{ borderRadius: 2 }}` (which multiplies by 4px = 8px).
- MUI v9 breaking changes to remember:
  - `fontWeight`, `fontStyle`, `lineHeight`, `textAlign`, `alignItems` are **not** direct props on `Typography` or `Link` — put them in `sx`.
  - `Grid` item uses `size={{ xs: 12, md: 6 }}` (v9 API), not `item xs={12}`.
  - `Grid` container alignment: `sx={{ alignItems: 'center' }}`, not `alignItems="center"`.
- **Always verify changes with Playwright MCP** after visual updates.
- Responsive design is secondary; this is a desktop-first developer tool.

### Testing

- **Vitest + Testing Library** for unit and component tests; **MSW** for API mocking.
- **Playwright** for E2E tests on critical flows only.
- Do not test implementation details; test user-visible behaviour.

---

## Dev Commands

| Command              | Description                                     |
|----------------------|-------------------------------------------------|
| `make dev`           | Start full stack (DB + backend + frontend)      |
| `make test-backend`  | Run Java tests                                  |
| `make test-frontend` | Run Vitest browser tests                        |
| `make build`         | Full Maven build (generates client, runs tests) |
| `make generate-api`  | Regenerate OpenAPI stubs + TS client            |

---

## Things to Avoid

- Do not manually edit files in `src/main/webapp/generated/` or `target/generated-sources/` — they are regenerated by
  `make generate-api`. Update the OpenAPI spec and regenerate.
- Do not commit generated files in `src/main/webapp/generated/`.
- Do not write back personal overlays (priority, status, tags) to GitHub or Azure DevOps APIs.
- Do not add shared mutable state between Spring Modulith modules via direct bean injection.
- Do not use `useEffect` to fetch data — use TanStack Query.
- Do not introduce new dependencies without discussing the tradeoff.
