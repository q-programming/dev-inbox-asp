using DevInbox.Web.Features.GitHub.Client;

namespace DevInbox.Web.Features.GitHub.Config;
public static class GithubServiceCollectionExtensions
{
    public static IServiceCollection AddGitHubClient(this IServiceCollection services, IConfiguration configuration)
    {
        // GitHub
        var ghSection = configuration.GetSection("GitHub");
        var ghOptions = ghSection.Get<GithubOptions>() ?? throw new InvalidOperationException("GitHub configuration section is missing.");
        if (string.IsNullOrWhiteSpace(ghOptions.ClientId))
        {
            throw new InvalidOperationException("GitHub:ClientId is required.");
        }
        if (string.IsNullOrWhiteSpace(ghOptions.ClientSecret))
        {
            throw new InvalidOperationException("GitHub:ClientSecret is required.");
        }
        _ = services.Configure<GithubOptions>(ghSection);
        // HTTP client — named "github" so it can also be resolved via IHttpClientFactory.CreateClient("github")
        services.AddHttpClient<IGitHubClient, GitHubClient>("github", (sp, client) =>
        {
            client.BaseAddress = new Uri("https://api.github.com");
            client.DefaultRequestHeaders.Add("Accept", "application/vnd.github+json");
            client.DefaultRequestHeaders.Add("User-Agent", "DevInbox");
            client.DefaultRequestHeaders.Add("X-GitHub-Api-Version", "2022-11-28");
        }).AddStandardResilienceHandler();
        return services;
    }
}