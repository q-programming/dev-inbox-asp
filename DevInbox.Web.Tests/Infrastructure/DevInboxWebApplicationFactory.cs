using DevInbox.Web.Infrastructure.Persistence;
using DevInbox.Web.Infrastructure.Security;
using DevInbox.Web.Tests.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging.Abstractions;

namespace DevInbox.Web.Tests.Infrastructure;

/// <summary>
/// Spins up the full ASP.NET Core host against a real PostgreSQL Testcontainer, using the same
/// <see cref="PostgresDatabaseFixture"/> and production <see cref="AppDbContextOptionsExtensions.UseAppNpgsql(DbContextOptionsBuilder, string?)"/>
/// extension as <see cref="DatabaseIntegrationTest"/>, so both flavors of test always mirror the
/// production Npgsql + snake_case naming configuration in <c>Program.cs</c>.
/// </summary>
public class DevInboxWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private static readonly IConfiguration EncryptionConfig = new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Encryption:Password"] = "integration-test-password",
            ["Encryption:Salt"] = "integration-test-salt"
        })
        .Build();

    /// <summary>
    /// Shared for the whole test process — never disposed. EF Core caches the compiled model per
    /// <see cref="DbContext"/> type, and <see cref="AppDbContext.OnModelCreating"/> closes over whichever
    /// <see cref="EncryptionService"/> instance builds that model first; a later disposed instance would
    /// leave the cached converter pointing at a zeroed key even though other <see cref="AppDbContext"/>
    /// instances (including the DI-hosted one) keep reusing that same cached model. Mirrors production,
    /// where <see cref="EncryptionService"/> is a singleton for the app's whole lifetime.
    /// </summary>
    private static readonly EncryptionService SharedEncryption =
        new(EncryptionConfig, NullLogger<EncryptionService>.Instance);

    private readonly PostgresDatabaseFixture _fixture = new();

    public async Task InitializeAsync()
    {
        await _fixture.InitializeAsync();
        await EnsureSchemaCreatedAsync();
    }

    public new async Task DisposeAsync()
    {
        await _fixture.DisposeAsync();
        await base.DisposeAsync();
    }

    /// <summary>
    /// Wipes all application tables. Tests that share this factory via <c>IClassFixture</c> run against
    /// the same container/schema for the whole test class — call this from an <see cref="IAsyncLifetime"/>
    /// before/after cycle in the consuming test class to isolate each test method from data left behind
    /// by previous ones (child tables first to satisfy FK constraints).
    /// </summary>
    public async Task ResetDatabaseAsync()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseAppNpgsql(_fixture.ConnectionString)
            .Options;

        await using var db = new AppDbContext(options, SharedEncryption);

        await db.InboxItemStates.ExecuteDeleteAsync();
        await db.InboxItems.ExecuteDeleteAsync();
        await db.Inboxes.ExecuteDeleteAsync();
        await db.AuditEntries.ExecuteDeleteAsync();
        await db.UserSettings.ExecuteDeleteAsync();
        await db.GitHubProfiles.ExecuteDeleteAsync();
        await db.Users.ExecuteDeleteAsync();
    }

    /// <summary>
    /// The host runs with <c>Database:AutoMigrate</c> disabled (see <see cref="ConfigureWebHost"/>), so the
    /// schema must be created up-front against the fresh container — mirroring what <see cref="DatabaseIntegrationTest"/>
    /// does for its own DbContext.
    /// </summary>
    private async Task EnsureSchemaCreatedAsync()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseAppNpgsql(_fixture.ConnectionString)
            .Options;

        await using var db = new AppDbContext(options, SharedEncryption);
        await db.Database.EnsureCreatedAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:AutoMigrate"] = "false",
                ["GitHub:ClientId"] = "test-client-id",
                ["GitHub:ClientSecret"] = "test-client-secret",
            });
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>()
                .AddDbContext<AppDbContext>(options =>
                    options.UseAppNpgsql(_fixture.ConnectionString));

            services.Configure<HealthCheckServiceOptions>(opts =>
            {
                var dbCheck = opts.Registrations.FirstOrDefault(r => r.Name == "database");
                if (dbCheck is not null)
                {
                    opts.Registrations.Remove(dbCheck);
                }
            });
        });
    }
}
