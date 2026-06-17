# Dev Inbox

Personal developer workspace — unified inbox aggregating **GitHub PRs**, **Azure DevOps work items**, and **personal notes** in a single, filterable view.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Java 21 · Spring Boot 3.5 · Spring Modulith · PostgreSQL · Flyway |
| API | OpenAPI-first (springdoc generates spec → TypeScript client auto-generated) |
| Frontend | React 18 · TypeScript 5 · Vite · TanStack Query · Zustand · Tailwind v4 |
| Testing | Testcontainers (Java) · Vitest browser mode + Playwright (React) |
| Observability | Micrometer · OpenTelemetry OTLP · Prometheus |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- JDK 21+
- Node.js 22+

### Run everything

```bash
# 1. Start PostgreSQL + OTel Collector
make db-up

# 2. Install frontend dependencies (first time only)
make install-frontend

# 3. Start both backend and frontend dev servers
make dev
```

App is available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api
- Swagger UI: http://localhost:8080/swagger-ui.html

## Development Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start full stack (DB + backend + frontend) |
| `make test-backend` | Run Java tests (Testcontainers required) |
| `make test-frontend` | Run Vitest browser tests |
| `make build` | Full Maven build (generates client, runs all tests, packages jar) |
| `make generate-api` | Regenerate OpenAPI server stubs + TypeScript client |
| `make db-reset` | Wipe and recreate the database |
| `make help` | Show all available commands |

## Project Structure

```
dev-inbox/
├── src/main/java/pl/qprogramming/devinbox/
│   ├── identity/       # User entity, integration credentials
│   ├── github/         # GitHub API client, PR/mention import
│   ├── ado/            # Azure DevOps API client, work item import
│   ├── inbox/          # Read model, query service, REST endpoints
│   ├── notes/          # Personal notes CRUD
│   ├── sync/           # Scheduler, sync orchestration
│   └── shared/         # Shared value objects, domain events
├── src/main/resources/
│   ├── config/liquibase/  # Liquibase versioned SQL migrations
│   └── swagger/           # OpenAPI specs — one file per module (source of truth)
│       ├── shared/shared.yml
│       ├── inbox/inbox.yml
│       ├── notes/notes.yml
│       ├── identity/auth.yml
│       ├── identity/settings.yml
│       └── sync/sync.yml
├── src/main/webapp/    # React frontend (Vite + TypeScript)
│   ├── src/features/   # Feature-based component structure
│   ├── src/shared/     # API facade, UI primitives, hooks, utils
│   └── generated/      # Auto-generated TypeScript API client (git-ignored)
└── docker/             # Docker Compose for local infrastructure
```

## Architecture

The backend is a **modular monolith** using Spring Modulith. Each top-level package is an isolated module. Cross-module communication uses domain events via the transactional outbox pattern (Spring Modulith event publication registry).

See [`docs/dev inbox - concept.txt`](docs/dev%20inbox%20-%20concept.txt) for the full project specification.
