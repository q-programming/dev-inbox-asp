using System.Text;
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
        var jwtOptions = configuration.GetSection("Jwt").Get<JwtOptions>()
            ?? throw new InvalidOperationException("Jwt configuration section is missing.");

        if (string.IsNullOrWhiteSpace(jwtOptions.SigningKey))
            throw new InvalidOperationException("Jwt:SigningKey is required.");

        services.Configure<JwtOptions>(configuration.GetSection("Jwt"));

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
                            ctx.Token = token;
                        return Task.CompletedTask;
                    }
                };
            });

        services.AddAuthorization();

        return services;
    }
}
