using DevInbox.Web.Infrastructure.Security;
using DevInbox.Web.Infrastructure.Persistence;
using DevInbox.Web.Tests.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace DevInbox.Web.Tests.Infrastructure;

/// <summary>
/// Base class for integration tests that need a real PostgreSQL database, without the
/// overhead of spinning up the full ASP.NET Core host (contrast with <see cref="DevInboxWebApplicationFactory"/>,
/// which shares the same <see cref="PostgresDatabaseFixture"/> and production
/// <see cref="AppDbContextOptionsExtensions.UseAppNpgsql(DbContextOptionsBuilder{AppDbContext}, string?)"/>
/// combination for full-app tests).
/// Owns the container fixture, schema creation, DbContext, and disposal.
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

    /// <summary>
    /// Shared for the whole test process (mirrors production, where <see cref="EncryptionService"/> is
    /// registered as a singleton — see <c>AuthServiceCollectionExtensions.AddAuth</c>). EF Core caches the
    /// compiled model per <see cref="DbContext"/> type, and <see cref="AppDbContext.OnModelCreating"/>
    /// closes over whichever <see cref="EncryptionService"/> instance built that model first; giving every
    /// test class its own instance (and disposing it afterwards) would let a later test's <see cref="AppDbContext"/>
    /// reuse a cached model pointing at an already-disposed (zeroed-key) encryption service. Never disposed —
    /// same as the production singleton, it lives for the process lifetime.
    /// </summary>
    private static readonly EncryptionService SharedEncryption =
        new(EncryptionConfig, NullLogger<EncryptionService>.Instance);

    private readonly PostgresDatabaseFixture _fixture = new();

    /// <summary>Shared DbContext for the test — created after the container is ready.</summary>
    protected AppDbContext DataBase { get; private set; } = default!;

    /// <summary>Connection string for the test container — available after InitializeAsync.</summary>
    public string ConnectionString => _fixture.ConnectionString;

    public virtual async Task InitializeAsync()
    {
        await _fixture.InitializeAsync();

        DataBase = BuildDbContext();
        await DataBase.Database.EnsureCreatedAsync();
    }

    public virtual async Task DisposeAsync()
    {
        await DataBase.DisposeAsync();
        await _fixture.DisposeAsync();
    }

    /// <summary>
    /// Creates an additional independent <see cref="AppDbContext"/> for tests that need
    /// multiple concurrent contexts (e.g. concurrency/constraint tests).
    /// Caller is responsible for disposing it.
    /// </summary>
    protected AppDbContext BuildDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseAppNpgsql(ConnectionString)
            .Options;
        return new AppDbContext(options, SharedEncryption);
    }
}
