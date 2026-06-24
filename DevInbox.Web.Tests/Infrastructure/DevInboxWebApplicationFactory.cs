using DevInbox.Web.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace DevInbox.Web.Tests.Infrastructure;

public class DevInboxWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _ = builder.UseEnvironment("Testing");

        _ = builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:AutoMigrate"] = "false",
            });
        });

        _ = builder.ConfigureServices(services =>
        {
            // Replace real PostgreSQL DbContext with in-memory for isolation
            _ = services.RemoveAll<DbContextOptions<AppDbContext>>()
                .AddDbContext<AppDbContext>(options =>
                    options.UseInMemoryDatabase("context-load-tests"));

            // Replace the DB health check with an always-healthy stub so the
            // in-memory provider does not falsely report DOWN in test runs
            services.Configure<HealthCheckServiceOptions>(opts =>
            {
                var dbCheck = opts.Registrations.FirstOrDefault(r => r.Name == "database");
                if (dbCheck is not null)
                    opts.Registrations.Remove(dbCheck);
            });
        });
    }
}
