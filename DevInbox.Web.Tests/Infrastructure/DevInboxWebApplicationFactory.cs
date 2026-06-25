using DevInbox.Web.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace DevInbox.Web.Tests.Infrastructure;

public class DevInboxWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly DatabaseIntegrationTest _database = new FactoryDatabase();

    public async Task InitializeAsync() => await _database.InitializeAsync();

    public new async Task DisposeAsync()
    {
        await _database.DisposeAsync();
        await base.DisposeAsync();
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
                    options.UseNpgsql(_database.ConnectionString));

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

    /// <summary>Concrete adapter so the factory can use DatabaseIntegrationTest via composition.</summary>
    private sealed class FactoryDatabase : DatabaseIntegrationTest;
}
