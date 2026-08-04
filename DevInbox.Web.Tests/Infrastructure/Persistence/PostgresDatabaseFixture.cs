using Testcontainers.PostgreSql;

namespace DevInbox.Web.Tests.Infrastructure.Persistence;

/// <summary>
/// Owns a single PostgreSQL Testcontainer for the lifetime of a test class.
/// Its only responsibility is starting/stopping the container and exposing the
/// resulting connection string — building an <see cref="AppDbContext"/> from it (with the
/// same provider configuration as production) is handled by <see cref="PostgresDbContextOptionsExtensions"/>.
/// Shared by both <see cref="DatabaseIntegrationTest"/> (database-only tests) and
/// <see cref="DevInboxWebApplicationFactory"/> (full ASP.NET Core host tests) so there is a
/// single place that owns the container lifecycle.
/// </summary>
public sealed class PostgresDatabaseFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:16-alpine").Build();

    /// <summary>Connection string for the running container — available after <see cref="InitializeAsync"/>.</summary>
    public string ConnectionString { get; private set; } = default!;

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        ConnectionString = _postgres.GetConnectionString();
    }

    public async Task DisposeAsync() => await _postgres.DisposeAsync();
}
