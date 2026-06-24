using DevInbox.Web.Common;
using DevInbox.Web.Features.Identity;
using DevInbox.Web.Infrastructure.Auth;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using NSubstitute;

namespace DevInbox.Web.Tests.Features.Identity;

public class UserControllerTests
{
    private const string TestEmail = "jan@example.com";
    private const string FirstName = "Jan";
    private const string LastName = "Kowalski";
    private const string StrongPassword = "strongpassword123";

    private readonly IUserService _userService;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly UserController _controller;

    public UserControllerTests()
    {
        _userService = Substitute.For<IUserService>();
        _jwtTokenService = Substitute.For<IJwtTokenService>();
        _controller = new UserController(_userService, _jwtTokenService);
    }

    [Fact(DisplayName = "LogoutAsync should revoke the JWT token")]
    public async Task LogoutAsyncShouldRevokeTokenAsync()
    {
        await _controller.LogoutAsync();

        _jwtTokenService.Received(1).RevokeAccessToken();
    }

    [Fact(DisplayName = "LoginAsync should issue JWT token for authenticated user email")]
    public async Task LoginAsyncShouldIssueTokenForAuthenticatedUserAsync()
    {
        _ = _userService.LoginAsync(Arg.Any<LoginRequest>()).Returns(BuildUser());

        await _controller.LoginAsync(new LoginRequest { Email = TestEmail, Password = StrongPassword });

        _jwtTokenService.Received(1).IssueAccessToken(TestEmail);
    }

    [Fact(DisplayName = "LoginAsync should return user dto on success")]
    public async Task LoginAsyncShouldReturnUserDtoAsync()
    {
        _ = _userService.LoginAsync(Arg.Any<LoginRequest>()).Returns(BuildUser());

        var result = await _controller.LoginAsync(new LoginRequest { Email = TestEmail, Password = StrongPassword });

        Assert.Equal(TestEmail, result.Email);
        Assert.Equal(FirstName, result.FirstName);
        Assert.Equal(LastName, result.LastName);
    }

    [Fact(DisplayName = "LoginAsync should propagate UnauthorizedException and not issue token")]
    public async Task LoginAsyncShouldPropagateUnauthorizedExceptionAsync()
    {
        _ = _userService.LoginAsync(Arg.Any<LoginRequest>()).Returns<User>(_ => throw new UnauthorizedException("Authentication failed"));

        _ = await Assert.ThrowsAsync<UnauthorizedException>(() =>
            _controller.LoginAsync(new LoginRequest { Email = TestEmail, Password = "wrong" }));

        _jwtTokenService.DidNotReceive().IssueAccessToken(Arg.Any<string>());
    }

    [Fact(DisplayName = "MeAsync should return dto for currently authenticated user")]
    public async Task MeAsyncShouldReturnCurrentUserDtoAsync()
    {
        _ = _userService.GetCurrentUserAsync().Returns(BuildUser());

        var result = await _controller.MeAsync();

        Assert.Equal(TestEmail, result.Email);
        Assert.Equal(FirstName, result.FirstName);
        Assert.Equal(LastName, result.LastName);
    }

    [Fact(DisplayName = "RegisterAsync should return dto for newly registered user")]
    public async Task RegisterAsyncShouldReturnUserDtoAsync()
    {
        _ = _userService.RegisterAsync(Arg.Any<RegisterRequest>()).Returns(BuildUser());

        var result = await _controller.RegisterAsync(new RegisterRequest
        {
            FirstName = FirstName,
            LastName = LastName,
            Email = TestEmail,
            Password = StrongPassword
        });

        Assert.Equal(TestEmail, result.Email);
        Assert.Equal(FirstName, result.FirstName);
        Assert.Equal(LastName, result.LastName);
    }

    private static User BuildUser() => new()
    {
        FirstName = FirstName,
        LastName = LastName,
        Email = TestEmail,
        Password = "hashed"
    };
}
