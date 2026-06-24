using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace DevInbox.Web.Infrastructure.Auth;

public class JwtTokenService(IOptions<JwtOptions> jwtOptions, IHttpContextAccessor httpContextAccessor) : IJwtTokenService, IService
{
    private readonly JwtOptions _jwtOptions = jwtOptions.Value;

    /// <summary>
    /// Generates a JWT access token and writes it to an HttpOnly cookie on the current response.
    /// </summary>
    public void IssueAccessToken(string subject, IEnumerable<Claim>? additionalClaims = null)
    {
        var token = GenerateAccessToken(subject, additionalClaims);

        httpContextAccessor.HttpContext?.Response.Cookies.Append("jwt", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = httpContextAccessor.HttpContext.Request.IsHttps,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddMinutes(_jwtOptions.AccessTokenLifetimeMinutes)
        });
    }

    /// <summary>
    /// Removes the JWT cookie from the current response, effectively logging the user out.
    /// </summary>
    public void RevokeAccessToken() =>
        httpContextAccessor.HttpContext?.Response.Cookies.Delete("jwt");

    private string GenerateAccessToken(string subject, IEnumerable<Claim>? additionalClaims = null)
    {
        if (string.IsNullOrWhiteSpace(subject))
            throw new ArgumentException("Token subject must be provided.", nameof(subject));

        if (string.IsNullOrWhiteSpace(_jwtOptions.SigningKey))
            throw new InvalidOperationException("JWT signing key is missing. Configure Jwt:SigningKey.");

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, subject),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        if (additionalClaims is not null)
            claims.AddRange(additionalClaims);

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwtOptions.AccessTokenLifetimeMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
