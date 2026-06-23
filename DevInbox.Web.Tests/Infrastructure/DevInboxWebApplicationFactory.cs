using DevInbox.Web.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

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
            _ = services.RemoveAll<DbContextOptions<AppDbContext>>()
            .AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase("context-load-tests")); ;

        });
    }
}
