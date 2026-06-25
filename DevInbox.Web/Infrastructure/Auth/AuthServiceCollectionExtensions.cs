using System.Text;
using DevInbox.Web.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace DevInbox.Web.Infrastructure.Auth;

/// <summary>
/// Extension methods to register JWT authentication and authorization services.
/// Equivalent to a Spring @Configuration class for security.
/// </summary>
public static class AuthServiceCollectionExtensions
{
    /// <summary>
    /// Registers JWT bearer authentication using settings from the "Jwt" config section.
    /// </summary>
    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        // JWT
        var jwtSection = configuration.GetSection("Jwt");
        var jwtOptions = jwtSection.Get<JwtOptions>()
            ?? throw new InvalidOperationException("Jwt configuration section is missing.");

        if (string.IsNullOrWhiteSpace(jwtOptions.SigningKey))
        {
            throw new InvalidOperationException("Jwt:SigningKey is required.");
        }
        services.Configure<JwtOptions>(jwtSection);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey));
        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = key,
                    ValidateIssuer = !string.IsNullOrWhiteSpace(jwtOptions.Issuer),
                    ValidIssuer = jwtOptions.Issuer,
                    ValidateAudience = !string.IsNullOrWhiteSpace(jwtOptions.Audience),
                    ValidAudience = jwtOptions.Audience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };

                // Also read JWT from HttpOnly cookie named "jwt"
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = ctx =>
                    {
                        if (ctx.Request.Cookies.TryGetValue("jwt", out var token))
                        {
                            ctx.Token = token;
                        }

                        return Task.CompletedTask;
                    }
                };
            });
        _ = services.AddAuthorization();
        return services;
    }
    public static IServiceCollection AddGitHubOAuth(this IServiceCollection services, IConfiguration configuration)
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
        // HTTP client
        services.AddHttpClient("github", client =>
        {
            client.BaseAddress = new Uri("https://api.github.com");
            client.DefaultRequestHeaders.Add("Accept", "application/vnd.github+json");
            client.DefaultRequestHeaders.Add("User-Agent", "DevInbox");
            client.DefaultRequestHeaders.Add("X-GitHub-Api-Version", "2022-11-28");
        }).AddStandardResilienceHandler();
        return services;
    }

    /// <summary>
    /// Registers <see cref="EncryptionService"/> as a singleton.
    /// The AES-256 key is derived once at startup from <c>Encryption:Password</c> and
    /// <c>Encryption:Salt</c> via PBKDF2 — equivalent to a Spring <c>@PostConstruct</c> init.
    /// </summary>
    public static IServiceCollection AddEncryption(this IServiceCollection services, IConfiguration configuration)
    {
        if (string.IsNullOrWhiteSpace(configuration["Encryption:Password"]))
        {
            throw new InvalidOperationException("Encryption:Password is required.");
        }

        if (string.IsNullOrWhiteSpace(configuration["Encryption:Salt"]))
        {
            throw new InvalidOperationException("Encryption:Salt is required.");
        }

        services.AddSingleton<EncryptionService>();
        return services;
    }
}
