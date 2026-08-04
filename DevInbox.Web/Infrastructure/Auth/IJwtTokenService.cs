using System.Security.Claims;
using DevInbox.Web.Features.Identity.Domain;

namespace DevInbox.Web.Infrastructure.Auth;

/// <summary>Contract for issuing and revoking JWT access tokens via HttpOnly cookie.</summary>
public interface IJwtTokenService
{
    /// <summary>Generates a JWT and writes it to the response as an HttpOnly cookie.</summary>
    void IssueAccessToken(User user, IEnumerable<Claim>? additionalClaims = null);

    /// <summary>Deletes the JWT cookie, effectively ending the session.</summary>
    void RevokeAccessToken();
}
