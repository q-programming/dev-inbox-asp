using DevInbox.Web.Infrastructure.Security;
using DevInbox.Web.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Testcontainers.PostgreSql;

namespace DevInbox.Web.Tests.Infrastructure;

/// <summary>
/// Base class for integration tests that need a real PostgreSQL database.
/// Owns the full lifecycle: container, schema creation, DbContext, and disposal.
/// Subclasses access the ready-to-use <see cref="DataBase"/> and can override
/// <see cref="InitializeAsync"/> to set up services — call <c>await base.InitializeAsync()</c> first.
/// </summary>
public abstract class DatabaseIntegrationTest : IAsyncLifetime
{
    private static readonly IConfiguration EncryptionConfig = new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Encryption:Password"] = "integration-test-password",
            ["Encryption:Salt"] = "integration-test-salt"
        })
        .Build();

    private readonly EncryptionService _encryption =
        new(EncryptionConfig, NullLogger<EncryptionService>.Instance);

    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:16-alpine").Build();

    /// <summary>Shared DbContext for the test — created after the container is ready.</summary>
    protected AppDbContext DataBase { get; private set; } = default!;

    /// <summary>Connection string for the test container — available after InitializeAsync.</summary>
    public string ConnectionString { get; private set; } = default!;

    public virtual async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        ConnectionString = _postgres.GetConnectionString();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(ConnectionString)
            .Options;

        DataBase = new AppDbContext(options, _encryption);
        await DataBase.Database.EnsureCreatedAsync();
    }

    public virtual async Task DisposeAsync()
    {
        await DataBase.DisposeAsync();
        _encryption.Dispose();
        await _postgres.DisposeAsync();
    }

    /// <summary>
    /// Creates an additional independent <see cref="AppDbContext"/> for tests that need
    /// multiple concurrent contexts (e.g. concurrency/constraint tests).
    /// Caller is responsible for disposing it.
    /// </summary>
    protected AppDbContext BuildDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(ConnectionString)
            .Options;
        return new AppDbContext(options, _encryption);
    }
}
