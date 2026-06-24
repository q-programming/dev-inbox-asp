namespace DevInbox.Web.Infrastructure.Auth;

/// <summary>
/// Configuration options for JWT token generation and validation.
/// Bound from the "Jwt" section in appsettings.json.
/// </summary>
public class JwtOptions
{
    public string SigningKey { get; set; } = string.Empty;
    public string? Issuer { get; set; }
    public string? Audience { get; set; }
    public int AccessTokenLifetimeMinutes { get; set; } = 60;
}
