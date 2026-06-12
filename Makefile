.PHONY: dev dev-backend dev-frontend build test test-backend test-frontend e2e \
        db-up db-down clean help

# ──────────────────────────────────────────────
#  Dev Inbox — Root Makefile
# ──────────────────────────────────────────────

## dev: Start PostgreSQL + OTel, then run backend and frontend dev servers in parallel
dev: db-up
	@echo "Starting backend and frontend..."
	@trap 'kill %1 %2 2>/dev/null; exit 0' INT; \
	  ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev & \
	  npm --prefix src/main/webapp run dev & \
	  wait

## dev-backend: Run only the Spring Boot backend (requires DB up)
dev-backend: db-up
	./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

## dev-frontend: Run only the Vite frontend dev server
dev-frontend:
	npm --prefix src/main/webapp run dev

## build: Full Maven build (generates API client, runs both test suites, packages jar)
build:
	./mvnw clean package

## build-skip-tests: Full Maven build without tests
build-skip-tests:
	./mvnw clean package -DskipTests

## generate-api: Regenerate OpenAPI server stubs and TypeScript client
generate-api:
	./mvnw generate-sources -pl .

## test: Run all tests (backend + frontend)
test: test-backend test-frontend

## test-backend: Run Java tests only (uses Testcontainers — Docker required)
test-backend:
	./mvnw test -pl . -Dfrontend.skip=true

## test-frontend: Run Vitest browser tests only
test-frontend:
	npm --prefix src/main/webapp run test:ci

## test-frontend-watch: Run Vitest in watch mode
test-frontend-watch:
	npm --prefix src/main/webapp run test

## coverage-frontend: Run frontend tests with V8 coverage report
coverage-frontend:
	npm --prefix src/main/webapp run test:coverage

## db-up: Start PostgreSQL and OTel Collector via Docker Compose
db-up:
	docker compose -f docker/docker-compose.yml up -d
	@echo "Waiting for Postgres to be ready..."
	@until docker exec devinbox-postgres pg_isready -U devinbox -d devinbox 2>/dev/null; do sleep 1; done
	@echo "Postgres is ready."

## db-down: Stop and remove Docker Compose services
db-down:
	docker compose -f docker/docker-compose.yml down

## db-reset: Drop and recreate the database (destructive!)
db-reset: db-down
	docker compose -f docker/docker-compose.yml down -v
	$(MAKE) db-up

## clean: Remove Maven target and frontend build artifacts
clean:
	./mvnw clean
	rm -rf src/main/webapp/dist src/main/webapp/generated src/main/webapp/node_modules

## install-frontend: Install npm dependencies (run after cloning or after package.json changes)
install-frontend:
	npm --prefix src/main/webapp install

## lint-frontend: Run ESLint on frontend sources
lint-frontend:
	npm --prefix src/main/webapp run lint

## help: Show this help
help:
	@grep -E '^##' Makefile | sed 's/^## //'
