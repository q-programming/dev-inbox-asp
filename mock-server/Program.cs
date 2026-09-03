using GitHubMockServer;
using GitHubMockServer.Ado;
using GitHubMockServer.GitHub;
using Serilog;
using WireMock.Server;
using WireMock.Settings;

// Shared local mock server for external services Dev Inbox integrates with. Each service gets its
// own path prefix and mapping registrar (e.g. GitHub -> /github/graphql) so more services (ADO,
// Jira, ...) can be added later without needing a separate process/port per service.
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console(outputTemplate: "{Timestamp:HH:mm:ss} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

var server = WireMockServer.Start(new WireMockServerSettings
{
    Port = 8089,
    UseSSL = false,
    Logger = new SerilogWireMockLogger()
});

Log.Information("Mock server listening on {Url}", server.Urls[0]);

var gitHubFixturesDir = Path.Combine(AppContext.BaseDirectory, "GitHub", "Fixtures");
GitHubMappings.Register(server, gitHubFixturesDir);
Log.Information("GitHub GraphQL mocked at /github/graphql (fixtures: {FixturesDir})", gitHubFixturesDir);

var adoFixturesDir = Path.Combine(AppContext.BaseDirectory, "Ado", "Fixtures");
AdoMappings.Register(server, adoFixturesDir);
Log.Information("ADO connect/sync mocked at /ado (fixtures: {FixturesDir})", adoFixturesDir);

Log.Information("Press Ctrl+C to stop.");
var exit = new ManualResetEventSlim(false);
Console.CancelKeyPress += (_, e) =>
{
    e.Cancel = true;
    exit.Set();
};
exit.Wait();
server.Stop();
Log.CloseAndFlush();
