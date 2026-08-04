using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DevInbox.Web.Features.Identity.Domain;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace DevInbox.Web.Infrastructure.Auth;

public class JwtTokenService(IOptions<JwtOptions> jwtOptions, IHttpContextAccessor httpContextAccessor) : IJwtTokenService, IService
{
    private readonly JwtOptions _options = jwtOptions.Value; // .Value evaluated once — avoids repeated boxing

    /// <summary>
    /// Generates a JWT access token and writes it to an HttpOnly cookie on the current response.
    /// </summary>
    public void IssueAccessToken(User user, IEnumerable<Claim>? additionalClaims = null)
    {
        var token = GenerateAccessToken(user, additionalClaims);

        httpContextAccessor.HttpContext?.Response.Cookies.Append("jwt", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = httpContextAccessor.HttpContext.Request.IsHttps,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddMinutes(_options.AccessTokenLifetimeMinutes)
        });
    }

    /// <summary>
    /// Removes the JWT cookie from the current response, effectively logging the user out.
    /// </summary>
    public void RevokeAccessToken()
    {
        httpContextAccessor.HttpContext?.Response.Cookies.Delete("jwt");
    }

    private string GenerateAccessToken(User user, IEnumerable<Claim>? additionalClaims = null)
    {
        if (string.IsNullOrEmpty(user.Email))
        {
            throw new ArgumentException("Token user must have a valid email.", nameof(user));
        }

        if (string.IsNullOrWhiteSpace(_options.SigningKey))
        {
            throw new InvalidOperationException("JWT signing key is missing. Configure Jwt:SigningKey.");
        }

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        if (additionalClaims is not null)
        {
            claims.AddRange(additionalClaims);
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_options.AccessTokenLifetimeMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
