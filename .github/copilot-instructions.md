# Copilot Instructions — Dev Inbox

## About the Developer

The developer is a **Java engineer with 18+ years of experience** (Spring Boot, Spring Modulith, JPA, Maven) who is **learning .NET / C# as a deliberate skill expansion**. This project is the learning vehicle.

### Copilot's role

- **Tutor first, implementer second.** When the developer asks how to do something, explain the idiomatic .NET way, draw comparisons to Java/Spring where helpful, and let the developer implement it.
- **Do not do everything for them.** Scaffold, guide, point to the right API — but leave the implementation to the developer unless explicitly asked to write it.
- **Always explain the why.** A Java developer already understands concepts such as DI, middleware, ORM, auth, modules and events. Focus on how .NET expresses those concepts differently.
- When asked to implement, write **clean, idiomatic C# 13 / .NET 10** — not Java-style code translated literally.

---

## Project Overview

Dev Inbox is a personal developer workspace that aggregates GitHub PRs, Azure DevOps work items, and personal notes into a unified inbox. It is a **.NET learning project** with a real-world feature scope.

- **Backend**: `DevInbox.Web/` — ASP.NET Core 10 · C# 13 · EF Core · PostgreSQL
- **Frontend**: `DevInbox.Web/ClientApp/` — React 18 · TypeScript 5 · Vite · TanStack Query · Zustand · MUI v9
- **API contract**: `DevInbox.Web/openapi/api.yml` — OpenAPI-first; NSwag generates both C# controller bases and the TypeScript client on build

---

## Project Structure

Validated against Microsoft's eShop reference application conventions.

```text
DevInbox.Web/
  Common/              ← cross-cutting: IService, IComponent, ApiException, shared utilities
  Features/            ← business capabilities; feature slices keep related code together
    Identity/
      Exceptions/
    Inbox/
    Notes/
    SavedViews/
    Settings/
    Sync/
    GitHub/
    ADO/
    Audit/
  Infrastructure/
    Auth/              ← JWT, cookies, auth configuration
    Events/            ← custom in-process event publisher
    Filters/           ← global MVC filters, e.g. ApiExceptionFilter
    Http/              ← GitHub and Azure DevOps HTTP clients
      GitHub/
      AzureDevOps/
    OpenApi/
      Generated/       ← NSwag output — git-ignored, never edit manually
    Persistence/       ← EF Core AppDbContext, migrations
    Scheduling/        ← IHostedService / BackgroundService sync jobs
  openapi/
    api.yml            ← single source of truth for the API contract
  ClientApp/
    generated/         ← NSwag TypeScript client — git-ignored, never edit manually
    src/
  GlobalUsings.cs
  Program.cs
```

### Structure rules

- **Feature slices over layers** — `Features/Identity/` may contain controller, service, entity, mapper and feature exceptions together.
- Do **not** create top-level `Controllers/`, `Services/`, `Repositories/` folders.
- **`Common/`** is for cross-cutting concerns only — markers, base exceptions, shared utilities.
- **`Infrastructure/`** is for technical concerns — DB, auth config, HTTP clients, generated OpenAPI, event plumbing, filters. Never business logic.
- **Entities live inside their feature** — e.g. `Features/Identity/User.cs`, not a global `Domain/` folder.
- Use `GlobalUsings.cs` for frequently used namespaces.

---

## Build System

| Command | Description |
|---|---|
| `make dev` | Start DB + backend watch + frontend dev server |
| `make build` | `dotnet build` — also regenerates NSwag outputs |
| `make publish` | Full release build — embeds React in `wwwroot` |
| `make generate-api` | Alias for `dotnet build` |
| `make db-up` | Start PostgreSQL via Docker Compose |
| `make test` | Run all tests |

`dotnet build` regenerates:

1. C# controller bases + DTOs from `openapi/api.yml`
2. TypeScript fetch client in `ClientApp/generated/api-client/`

Never edit generated files directly.

---

## C# / ASP.NET Core Standards

### General

- Target **C# 13 / .NET 10**.
- Use modern language features: primary constructors, pattern matching, records, `required` properties, collection expressions.
- Prefer **records** for DTOs and value objects.
- Use `ILogger<T>` for logging — never `Console.WriteLine` in application code.
- Prefer `async` / `await` throughout — no `.Result` or `.Wait()`.
- Public types should have XML docs when the intent or design rationale is not obvious.

### Java → .NET mental model

| Java / Spring | .NET equivalent |
|---|---|
| `@Component` / `@Service` | `builder.Services.AddScoped<I, Impl>()` |
| `@RestController` | `[ApiController]` + `[Route]` |
| `@RequestBody` | `[FromBody]` |
| `@PathVariable` | `[FromRoute]` |
| `@RequestParam` | `[FromQuery]` |
| `application.yml` | `appsettings.json` |
| `@ConfigurationProperties` | options pattern + `IOptions<T>` |
| `JpaRepository` | repository abstraction over EF Core / `DbSet<T>` |
| Flyway migrations | EF Core migrations |
| `@Scheduled` | `IHostedService` / `BackgroundService` |
| `@ExceptionHandler` | middleware, filters, or `IExceptionHandler` |
| `ProblemDetail` | `ProblemDetails` |
| Testcontainers | Testcontainers for .NET |

### Dependency Injection

- Register services in `Program.cs` using the built-in DI container.
- Business services, repositories and EF Core `DbContext` are normally **scoped**.
- Singleton is reserved for stateless infrastructure such as clocks, caches, metadata registries or event plumbing that creates scopes explicitly.
- Use constructor injection; primary constructors are preferred when readable.

Example:

```csharp
public sealed class InboxController(
    IInboxService inboxService,
    ILogger<InboxController> logger)
    : InboxBase
{
}
```

---

## Event-Driven Communication

Dev Inbox uses a lightweight custom event system for communication between modules.

Core contracts:

```csharp
public interface IEvent
{
}

public interface IEventHandler<in T>
    where T : IEvent
{
    Task Handle(
        T message,
        CancellationToken cancellationToken);
}

public interface IPublisher
{
    Task Publish<T>(
        T message,
        CancellationToken cancellationToken = default)
        where T : IEvent;

    Task PublishAsync<T>(
        T message,
        CancellationToken cancellationToken = default)
        where T : IEvent;
}
```

### Publishing modes

```csharp
await publisher.Publish(message, cancellationToken);
```

- synchronous
- handlers execute sequentially
- caller waits
- exceptions propagate to the caller
- use for consistency-sensitive workflows

```csharp
await publisher.PublishAsync(message, cancellationToken);
```

- fire-and-forget
- handlers execute independently
- each handler receives its own DI scope
- exceptions are isolated and logged
- use for background workflows such as login-triggered GitHub / ADO refresh

### Guidance

Prefer:

```text
Feature -> Event -> Feature
```

Example:

```text
Identity -> UserAuthenticatedEvent -> GitHub
Identity -> UserAuthenticatedEvent -> ADO
Identity -> UserAuthenticatedEvent -> Audit
```

Avoid:

```text
IdentityService -> GitHubService -> AdoService
```

The project intentionally does **not** use MediatR.

---

## OpenAPI-First Pattern

- `openapi/api.yml` is the **single source of truth**.
- NSwag generates controller bases and DTOs into `Infrastructure/OpenApi/Generated/`.
- Implement generated interfaces/classes in feature folders.
- Do not hand-write controllers that contradict `api.yml`.
- Do not expose EF Core entities over the API; use generated DTOs.

---

## REST / Error Handling

- Return `ProblemDetails` for error responses.
- Use proper HTTP status codes.
- Avoid leaking internal exceptions or sensitive payloads.
- Prefer centralized exception handling through filters or middleware.

---

## Persistence

- Use EF Core with PostgreSQL.
- Use EF Core migrations.
- Repositories should hide EF Core details from features.
- Features should depend on repository interfaces, not directly on `AppDbContext`, unless a conscious exception is made.
- Avoid raw SQL in application code unless justified.

---

## Security / Auth

- Use JWT bearer tokens or ASP.NET Core authentication primitives configured under `Infrastructure/Auth/`.
- Credentials and PATs must be encrypted at rest.
- Never log secrets, tokens, request bodies, response bodies, note bodies or external API payloads that may contain PII.

---

## Testing

- Use **xUnit 2** for unit and integration tests.
- Use **NSubstitute** for mocking.
- Use real `ServiceCollection` for infrastructure components that are tightly coupled to DI behavior.
- Do not over-mock `IServiceProvider` or `IServiceScopeFactory`.
- Use Testcontainers for .NET for integration tests against PostgreSQL.
- Test observable behavior, not implementation details.
- Test method names should be readable PascalCase and avoid underscores.
- Use `MartinCostello.Logging.XUnit` if test logging is needed.

---

## React / TypeScript Standards

### General

- TypeScript strict mode.
- No `any` unless explicitly justified.
- Functional components only.
- File names should match the exported component name.

### API Layer

- Generated client lives in `ClientApp/generated/api-client/` — never edit directly.
- Import generated API through the configured alias.
- Wrap generated clients behind feature/shared API functions when useful.

### State Management

- TanStack Query owns server state.
- Zustand owns UI-only state.
- Do not fetch server data in `useEffect`; use TanStack Query.
- Keep stores small and focused.

### Styling

- MUI v9 is the primary UI library.
- Use theme values instead of hardcoded colors.
- Use Material icons, not emoji icons, for UI affordances.

---

## Things to Avoid

- Do not edit generated files.
- Do not commit generated files if they are git-ignored.
- Do not expose EF Core entities over the API.
- Do not block async code.
- Do not write personal overlays back to GitHub or Azure DevOps.
- Do not introduce new dependencies without discussing the trade-off.
- Do not introduce MediatR, CQRS, Kafka, RabbitMQ or MassTransit unless there is a clear requirement.
