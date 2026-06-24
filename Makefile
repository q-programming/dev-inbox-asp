.PHONY: dev dev-backend dev-frontend build publish generate-api \
        test test-backend test-frontend install-frontend \
        db-up db-down db-reset clean help

CLIENT = DevInbox.Web/ClientApp
API    = DevInbox.Web

# ──────────────────────────────────────────────────────────────
#  Dev Inbox — Makefile
# ──────────────────────────────────────────────────────────────

## dev: Start PostgreSQL, backend (watch), and frontend dev server in parallel
dev: db-up
	@echo "Starting backend and frontend..."
	@trap 'kill %1 %2 2>/dev/null; exit 0' INT; \
	  dotnet watch --project $(API) run & \
	  npm --prefix $(CLIENT) run dev & \
	  wait

## dev-backend: Run only the ASP.NET backend in watch mode (requires DB up)
dev-backend: db-up
	dotnet watch --project $(API) run

## dev-frontend: Run only the Vite frontend dev server
dev-frontend:
	npm --prefix $(CLIENT) run dev

## build: Compile the .NET project (no tests, no publish)
build:
	dotnet build $(API)

## publish: Full publish — compiles .NET, builds React, produces self-contained output
publish:
	dotnet publish $(API)/$(notdir $(API)).csproj -c Release -o ./publish

## generate-api: Regenerate C# controller bases and TypeScript client from api.yml
generate-api:
	dotnet build $(API) /p:GenerateClients=true

## test: Run all tests (backend + frontend)
test: test-backend test-frontend

## test-backend: Run .NET tests
test-backend:
	dotnet test $(API) --settings .runsettings

## test-frontend: Run Vitest tests
test-frontend:
	npm --prefix $(CLIENT) run test:ci

## install-frontend: Install npm dependencies
install-frontend:
	npm --prefix $(CLIENT) install

## lint-frontend: Run ESLint on frontend sources
lint-frontend:
	npm --prefix $(CLIENT) run lint

## db-up: Start PostgreSQL via Docker Compose
db-up:
	docker compose -f docker/docker-compose.yml up -d postgres
	@echo "Waiting for Postgres to be ready..."
	@until docker exec devinbox-postgres pg_isready -U devinbox -d devinbox 2>/dev/null; do sleep 1; done
	@echo "Postgres is ready."

## db-down: Stop Docker Compose services
db-down:
	docker compose -f docker/docker-compose.yml down

## db-reset: Drop and recreate volumes (destructive!)
db-reset: db-down
	docker compose -f docker/docker-compose.yml down -v
	$(MAKE) db-up

## clean: Remove build artifacts
clean:
	dotnet clean $(API)
	rm -rf publish
	rm -rf $(CLIENT)/node_modules $(CLIENT)/generated $(CLIENT)/coverage

## help: Show this help
help:
	@grep -E '^##' Makefile | sed 's/^## //'
