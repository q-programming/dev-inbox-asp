# Dev Inbox

A personal developer workspace that aggregates GitHub PRs, Azure DevOps work items, and private notes into a unified inbox.

| Layer | Stack |
|---|---|
| Backend | ASP.NET Core 10 · C# 13 · EF Core · PostgreSQL |
| Frontend | React 18 · TypeScript 5 · Vite · MUI v9 · TanStack Query · Zustand |
| API contract | OpenAPI 3 — NSwag generates C# controller bases + TypeScript client on every build |

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| [.NET SDK](https://dotnet.microsoft.com/download) | 10.0+ | Backend + NSwag code generation |
| [Node.js](https://nodejs.org) | 20+ | Frontend dev server and build |
| [Docker](https://www.docker.com) | any recent | PostgreSQL via Docker Compose |

---

## Getting Started

```bash
# 1. Restore dotnet local tools (nswag — needed for API client generation)
dotnet tool restore

# 2. Install frontend dependencies (once, or after package.json changes)
make install-frontend

# 3. Start everything — DB, backend (watch mode), frontend dev server
make dev
```

The app will be available at:
- **Frontend** → http://localhost:3000
- **Backend / Swagger** → http://localhost:5080/swagger

### VS Code

Launch configurations are committed in `.vscode/`:

| Configuration | What it does |
|---|---|
| **Run Backend** | Launches the ASP.NET app with debugger attached |
| **Run UI** | Starts the Vite dev server and opens the browser |
| **Full Stack** | Starts UI + backend together |

Default build task (`Ctrl+Shift+B`) runs `dotnet build` and regenerates all API clients.

---

## Project Structure

```
DevInbox.Web/
  Features/                   ← Business capabilities — all related code in one place
    Identity/                 ← Auth/user: controller, service, entity, mapper, exceptions
    Inbox/                    ← Aggregated GitHub PRs + Azure DevOps items
    Notes/                    ← Personal notes
    SavedViews/               ← Saved filter configurations
    Settings/                 ← User preferences and PAT management
    Sync/                     ← Background sync orchestration
  Infrastructure/
    Auth/                     ← JWT + ASP.NET Core Identity configuration
    Filters/                  ← Global MVC filters (e.g. ApiExceptionFilter)
    Persistence/              ← EF Core AppDbContext + repositories
    OpenApi/
      Generated/              ← NSwag output — git-ignored, never edit manually
  Common/                     ← Cross-cutting: IService, IComponent, base exceptions
  openapi/
    api.yml                   ← Single source of truth for the API contract
  ClientApp/                  ← React application
    src/
      app/                    ← Auth pages, layout, route guards, global UI
      features/               ← Product features (inbox, notes, settings…)
      shared/                 ← API client, hooks, Zustand stores, theme, utils
    generated/                ← NSwag TypeScript client — git-ignored, never edit manually
  Program.cs
  DevInbox.Web.csproj
DevInbox.Web.Tests/           ← xUnit integration + unit tests
docker/
  docker-compose.yml          ← PostgreSQL
docs/                         ← Architecture and product documentation
Makefile
DevInbox.sln
```

---

## Dev Commands

| Command | Description |
|---|---|
| `make dev` | Start DB + backend (watch mode) + frontend dev server |
| `make dev-backend` | Backend only in watch mode (requires DB running) |
| `make dev-frontend` | Frontend Vite dev server only |
| `make build` | `dotnet build` — compiles and regenerates API clients |
| `make generate-api` | Explicitly regenerate C# + TypeScript clients from `api.yml` |
| `make publish` | Full release build — embeds React into `wwwroot/`, outputs to `./publish/` |
| `make test` | Run all tests (backend + frontend) |
| `make test-backend` | `dotnet test` only |
| `make test-frontend` | Vitest only |
| `make db-up` | Start PostgreSQL container |
| `make db-down` | Stop PostgreSQL container |
| `make db-reset` | Destroy and recreate the database volume (destructive) |
| `make clean` | Remove build artifacts |

---

## API Contract (OpenAPI-First)

`openapi/api.yml` is the **single source of truth**. Never hand-write controllers that contradict the spec.

Every `dotnet build` (or `make build`) runs NSwag and regenerates:
- `Infrastructure/OpenApi/Generated/Controllers.cs` — C# abstract controller base classes + DTOs
- `ClientApp/generated/api-client/index.ts` — TypeScript fetch client

Both outputs are git-ignored. To add or change an endpoint:
1. Edit `openapi/api.yml`
2. Run `make build` (or `Ctrl+Shift+B` in VS Code)
3. Implement the new method in the relevant `Features/` controller

---

## Database

PostgreSQL via Docker Compose for local development:

```bash
make db-up    # start
make db-down  # stop
make db-reset # nuke and recreate (destructive!)
```

Connection string is in `appsettings.Development.json`. Schema is applied automatically on startup when `Database:AutoMigrate` is `true` (development only). For production, use EF Core migrations explicitly.

---

## Running in Production

```bash
make publish
# Output: ./publish/
# Run:    ./publish/DevInbox.Web
```

The React app is compiled and embedded into `wwwroot/` at publish time. The result is a single self-contained binary — no separate frontend server needed.

