using DevInbox.Web.Features.GitHub.Config;
using DevInbox.Web.Infrastructure.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace DevInbox.Web.Tests.Infrastructure;

/// <summary>
/// Tests for <see cref="AuthServiceCollectionExtensions"/>.
/// Validates that registration succeeds with valid config and fails fast with missing/invalid config.
/// Equivalent to Spring @Configuration tests that verify bean wiring throws for bad properties.
/// </summary>
public class AuthServiceCollectionExtensionsTests
{
    private const string ValidSigningKey = "super-secret-signing-key-min-32-chars!!";
    private const string ValidClientId = "gh-client-id";
    private const string ValidClientSecret = "gh-client-secret";

    // -------------------------------------------------------------------------
    // AddJwtAuthentication
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AddJwtAuthentication should register authentication services when config is valid")]
    public void AddJwtAuthenticationShouldRegisterServicesWhenConfigValid()
    {
        var services = new ServiceCollection();
        var config = BuildConfig(new Dictionary<string, string?>
        {
            ["Jwt:SigningKey"] = ValidSigningKey
        });

        services.AddJwtAuthentication(config);

        var provider = services.BuildServiceProvider();
        var authSchemeProvider = provider.GetService<Microsoft.AspNetCore.Authentication.IAuthenticationSchemeProvider>();
        Assert.NotNull(authSchemeProvider);
    }

    [Fact(DisplayName = "AddJwtAuthentication should register JWT bearer as the default scheme")]
    public async Task AddJwtAuthenticationShouldRegisterJwtBearerAsDefaultScheme()
    {
        var services = new ServiceCollection();
        var config = BuildConfig(new Dictionary<string, string?>
        {
            ["Jwt:SigningKey"] = ValidSigningKey
        });

        services.AddJwtAuthentication(config);

        var provider = services.BuildServiceProvider();
        var schemeProvider = provider.GetRequiredService<Microsoft.AspNetCore.Authentication.IAuthenticationSchemeProvider>();
        var defaultScheme = await schemeProvider.GetDefaultAuthenticateSchemeAsync();
        Assert.Equal(JwtBearerDefaults.AuthenticationScheme, defaultScheme?.Name);
    }

    [Fact(DisplayName = "AddJwtAuthentication should throw when Jwt section is missing")]
    public void AddJwtAuthenticationShouldThrowWhenJwtSectionMissing()
    {
        var services = new ServiceCollection();
        var config = BuildConfig([]);

        Assert.Throws<InvalidOperationException>(() => services.AddJwtAuthentication(config));
    }

    [Fact(DisplayName = "AddJwtAuthentication should throw when SigningKey is empty")]
    public void AddJwtAuthenticationShouldThrowWhenSigningKeyEmpty()
    {
        var services = new ServiceCollection();
        var config = BuildConfig(new Dictionary<string, string?>
        {
            ["Jwt:SigningKey"] = ""
        });

        Assert.Throws<InvalidOperationException>(() => services.AddJwtAuthentication(config));
    }

    // -------------------------------------------------------------------------
    // AddGitHubOAuth
    // -------------------------------------------------------------------------

    [Fact(DisplayName = "AddGitHubOAuth should register IOptions<GithubOptions> when config is valid")]
    public void AddGitHubOAuthShouldRegisterOptionsWhenConfigValid()
    {
        var services = new ServiceCollection();
        var config = BuildConfig(new Dictionary<string, string?>
        {
            ["GitHub:ClientId"] = ValidClientId,
            ["GitHub:ClientSecret"] = ValidClientSecret
        });

        services.AddGitHubClient(config);

        var provider = services.BuildServiceProvider();
        var options = provider.GetService<Microsoft.Extensions.Options.IOptions<GithubOptions>>();
        Assert.NotNull(options);
        Assert.Equal(ValidClientId, options.Value.ClientId);
    }

    [Fact(DisplayName = "AddGitHubOAuth should register named github HttpClient")]
    public void AddGitHubOAuthShouldRegisterNamedHttpClient()
    {
        var services = new ServiceCollection();
        var config = BuildConfig(new Dictionary<string, string?>
        {
            ["GitHub:ClientId"] = ValidClientId,
            ["GitHub:ClientSecret"] = ValidClientSecret
        });

        services.AddGitHubClient(config);

        var provider = services.BuildServiceProvider();
        var factory = provider.GetRequiredService<IHttpClientFactory>();
        var client = factory.CreateClient("github");
        Assert.Equal("https://api.github.com/", client.BaseAddress?.ToString());
    }

    [Fact(DisplayName = "AddGitHubOAuth should throw when GitHub section is missing")]
    public void AddGitHubOAuthShouldThrowWhenGitHubSectionMissing()
    {
        var services = new ServiceCollection();
        var config = BuildConfig([]);

        Assert.Throws<InvalidOperationException>(() => services.AddGitHubClient(config));
    }

    [Fact(DisplayName = "AddGitHubOAuth should throw when ClientId is empty")]
    public void AddGitHubOAuthShouldThrowWhenClientIdEmpty()
    {
        var services = new ServiceCollection();
        var config = BuildConfig(new Dictionary<string, string?>
        {
            ["GitHub:ClientId"] = "",
            ["GitHub:ClientSecret"] = ValidClientSecret
        });

        Assert.Throws<InvalidOperationException>(() => services.AddGitHubClient(config));
    }

    [Fact(DisplayName = "AddGitHubOAuth should throw when ClientSecret is empty")]
    public void AddGitHubOAuthShouldThrowWhenClientSecretEmpty()
    {
        var services = new ServiceCollection();
        var config = BuildConfig(new Dictionary<string, string?>
        {
            ["GitHub:ClientId"] = ValidClientId,
            ["GitHub:ClientSecret"] = ""
        });

        Assert.Throws<InvalidOperationException>(() => services.AddGitHubClient(config));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static IConfiguration BuildConfig(IEnumerable<KeyValuePair<string, string?>> values)
    {
        return new ConfigurationBuilder().AddInMemoryCollection(values).Build();
    }
}
