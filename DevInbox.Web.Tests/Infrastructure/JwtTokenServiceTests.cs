using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Infrastructure.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using NSubstitute;

namespace DevInbox.Web.Tests.Infrastructure;

public class JwtTokenServiceTests
{
    private const string ValidSigningKey = "super-secret-signing-key-min-32-chars!!";
    private const string TestEmail = "user@example.com";

    private static JwtTokenService BuildService(
        string signingKey = ValidSigningKey,
        HttpContext? httpContext = null)
    {
        var options = Options.Create(new JwtOptions
        {
            SigningKey = signingKey,
            AccessTokenLifetimeMinutes = 60
        });

        var accessor = Substitute.For<IHttpContextAccessor>();
        _ = accessor.HttpContext.Returns(httpContext);

        return new JwtTokenService(options, accessor);
    }

    [Fact(DisplayName = "IssueAccessToken writes HttpOnly jwt cookie to response")]
    public void IssueAccessTokenWritesCookieToResponse()
    {
        var context = new DefaultHttpContext();
        var service = BuildService(httpContext: context);

        service.IssueAccessToken(new User { Email = TestEmail, Id = 1 });

        Assert.Contains("jwt", context.Response.Headers.SetCookie.ToString());
    }

    [Fact(DisplayName = "IssueAccessToken produces a valid signed JWT with correct subject")]
    public void IssueAccessTokenProducesValidJwtWithCorrectSubject()
    {
        var context = new DefaultHttpContext();
        var service = BuildService(httpContext: context);

        service.IssueAccessToken(new User { Email = TestEmail, Id = 1 });

        var setCookie = context.Response.Headers.SetCookie.ToString();
        var tokenValue = setCookie.Split('=', 2)[1].Split(';')[0];

        var handler = new JwtSecurityTokenHandler();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(ValidSigningKey));
        _ = handler.ValidateToken(tokenValue, new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = key,
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true
        }, out var validatedToken);

        var jwt = (JwtSecurityToken)validatedToken;
        Assert.Equal("1", jwt.Subject);
    }

    [Fact(DisplayName = "IssueAccessToken includes additional claims in token")]
    public void IssueAccessTokenIncludesAdditionalClaims()
    {
        var context = new DefaultHttpContext();
        var service = BuildService(httpContext: context);
        var extra = new[] { new Claim("role", "admin") };

        service.IssueAccessToken(new User { Email = TestEmail, Id = 1 }, extra);

        var setCookie = context.Response.Headers.SetCookie.ToString();
        var tokenValue = setCookie.Split('=', 2)[1].Split(';')[0];
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(tokenValue);

        Assert.Contains(jwt.Claims, c => c.Type == "role" && c.Value == "admin");
    }

    [Fact(DisplayName = "IssueAccessToken does nothing when HttpContext is null")]
    public void IssueAccessTokenDoesNothingWhenHttpContextIsNull()
    {
        var service = BuildService(httpContext: null);

        // Should not throw
        service.IssueAccessToken(new User { Email = TestEmail, Id = 1 });
    }

    [Fact(DisplayName = "RevokeAccessToken deletes jwt cookie from response")]
    public void RevokeAccessTokenDeletesCookie()
    {
        var context = new DefaultHttpContext();
        var service = BuildService(httpContext: context);

        service.RevokeAccessToken();

        Assert.Contains("jwt=;", context.Response.Headers.SetCookie.ToString());
    }

    [Fact(DisplayName = "RevokeAccessToken does nothing when HttpContext is null")]
    public void RevokeAccessTokenDoesNothingWhenHttpContextIsNull()
    {
        var service = BuildService(httpContext: null);

        // Should not throw
        service.RevokeAccessToken();
    }

    [Fact(DisplayName = "IssueAccessToken throws ArgumentException when subject is empty")]
    public void IssueAccessTokenThrowsWhenSubjectIsEmpty()
    {
        var service = BuildService(httpContext: new DefaultHttpContext());

        Assert.Throws<ArgumentException>(() => service.IssueAccessToken(new User { Email = "", Id = 1 }));
    }

    [Fact(DisplayName = "IssueAccessToken throws InvalidOperationException when signing key is missing")]
    public void IssueAccessTokenThrowsWhenSigningKeyIsMissing()
    {
        var service = BuildService(signingKey: "", httpContext: new DefaultHttpContext());

        Assert.Throws<InvalidOperationException>(() => service.IssueAccessToken(new User { Email = TestEmail, Id = 1 }));
    }
}
