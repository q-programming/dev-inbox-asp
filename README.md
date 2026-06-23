# Dev Inbox

A personal developer workspace that aggregates GitHub PRs, Azure DevOps work items, and private notes into a unified inbox.

**Backend**: ASP.NET Core 10 (C#) · **Frontend**: React 18 + TypeScript + Vite

See [`docs/dev-inbox-asp.txt`](docs/dev-inbox-asp.txt) for the full product and architecture document.

---

## Project Structure

```
DevInbox.Web/
  ClientApp/        ← React + TypeScript (Vite)
  Features/         ← Feature folders (Inbox, Notes, Settings, …) — implement here
  Infrastructure/   ← Persistence, Security, Scheduling, OpenApi — implement here
  openapi/          ← OpenAPI spec files (source of truth for the API contract)
  wwwroot/          ← React build output (generated; not committed)
  Program.cs
  DevInbox.Web.csproj
docker/             ← Docker Compose (PostgreSQL)
docs/               ← Product & architecture document
DevInbox.sln
Makefile
```

---

## Prerequisites

| Tool | Version |
|---|---|
| .NET SDK | 10.0+ |
| Node.js | 20+ |
| Docker | for PostgreSQL |
| Java | 17+ (only for `openapi-generator-cli` if used via npx) |

---

## Dev Commands

| Command | Description |
|---|---|
| `make dev` | Start DB + backend (watch mode) + frontend dev server |
| `make dev-backend` | Backend only (watch mode) |
| `make dev-frontend` | Frontend only (Vite HMR) |
| `make build` | Compile the .NET project |
| `make publish` | Full release build — compiles .NET + React → `publish/` |
| `make generate-api` | Regenerate TypeScript clients from `openapi/` specs |
| `make test` | Run all tests |
| `make db-up` | Start PostgreSQL container |
| `make db-down` | Stop PostgreSQL container |
| `make clean` | Remove all build artifacts |

---

## API Client Generation

TypeScript clients are generated automatically by the **ASP.NET build** via `NSwag.MSBuild` — no Java, no separate Node script.

```bash
make build
# or
dotnet build DevInbox.Web
```

Generated clients land in `DevInbox.Web/ClientApp/generated/` (git-ignored).

---

## Building a Self-Contained Package

```bash
make publish
# Output: ./publish/
# Run:    ./publish/DevInbox.Web
```

The React app is compiled and embedded in `wwwroot/` during publish. No separate frontend server needed.
