using System.Security.Claims;
using DevInbox.Web.Features.Identity.Exceptions;
using DevInbox.Web.Features.Identity;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using Microsoft.AspNetCore.Http;
using NSubstitute;
using DevInbox.Web.Common;

namespace DevInbox.Web.Tests.Features.Identity;

public class UserServiceTests
{
    private const string TestEmail = "jan@example.com";
    private const string FirstName = "Jan";
    private const string LastName = "Kowalski";
    private const string StrongPassword = "strongpassword123";
    private readonly IUserRepository _users;
    private readonly UserService _service;

    public UserServiceTests()
    {
        _users = Substitute.For<IUserRepository>();
        _service = new UserService(_users, Substitute.For<IHttpContextAccessor>());
    }

    [Fact(DisplayName = "RegisterAsync should normalize email, hash password, and persist user")]
    public async Task RegisterAsyncShouldMapUserAndPersistViaRepositoryAsync()
    {
        _ = _users.ExistsByEmailAsync(TestEmail).Returns(false);

        var request = new RegisterRequest
        {
            FirstName = FirstName,
            LastName = LastName,
            Email = TestEmail,
            Password = StrongPassword
        };

        var result = await _service.RegisterAsync(request);

        _ = await _users.Received(1).ExistsByEmailAsync(TestEmail);
        await _users.Received(1).AddAsync(Arg.Is<User>(u =>
            u.Email == TestEmail &&
            u.FirstName == FirstName &&
            u.LastName == LastName));

        Assert.Equal(TestEmail, result.Email);
        Assert.Equal(FirstName, result.FirstName);
        Assert.Equal(LastName, result.LastName);
    }

    [Fact(DisplayName = "LoginAsync should authenticate user and return mapped dto")]
    public async Task LoginAsyncShouldSucceedAsync()
    {
        _ = _users.FindByEmailAsync(TestEmail).Returns(new User
        {
            FirstName = FirstName,
            LastName = LastName,
            Email = TestEmail,
            Password = BCrypt.Net.BCrypt.HashPassword(StrongPassword)
        });

        var request = new LoginRequest
        {
            Email = TestEmail,
            Password = StrongPassword
        };
        var result = await _service.LoginAsync(request);

        Assert.Equal(TestEmail, result.Email);
        Assert.Equal(FirstName, result.FirstName);
        Assert.Equal(LastName, result.LastName);
    }

    [Fact(DisplayName = "LoginAsync should fail for wrong password")]
    public async Task LoginAsyncShouldFailForWrongPasswordAsync()
    {
        _ = _users.FindByEmailAsync(TestEmail).Returns(new User
        {
            FirstName = FirstName,
            LastName = LastName,
            Email = TestEmail,
            Password = BCrypt.Net.BCrypt.HashPassword(StrongPassword)
        });

        var request = new LoginRequest
        {
            Email = TestEmail,
            Password = "wrongpassword"
        };
        _ = await Assert.ThrowsAsync<UnauthorizedException>(async () => await _service.LoginAsync(request));
    }

    [Fact(DisplayName = "LoginAsync should fail for not existing user")]
    public async Task LoginAsyncShouldFailForNotExistingUserAsync()
    {
        _ = _users.FindByEmailAsync(TestEmail).Returns((User?)null);
        var request = new LoginRequest
        {
            Email = TestEmail,
            Password = StrongPassword
        };
        _ = await Assert.ThrowsAsync<UnauthorizedException>(async () => await _service.LoginAsync(request));
    }

    [Fact(DisplayName = "RegisterAsync should throw when user with email already exists")]
    public async Task RegisterAsyncShouldThrowErrorForExistingEmailAsync()
    {
        _ = _users.ExistsByEmailAsync(TestEmail).Returns(true);

        var request = new RegisterRequest
        {
            FirstName = FirstName,
            LastName = LastName,
            Email = TestEmail,
            Password = StrongPassword
        };

        _ = await Assert.ThrowsAsync<UserAlreadyExistsException>(async () => await _service.RegisterAsync(request));

        _ = await _users.Received(1).ExistsByEmailAsync(TestEmail);
        await _users.DidNotReceive().AddAsync(Arg.Is<User>(user =>
            user.Email == TestEmail &&
            user.FirstName == FirstName &&
            user.LastName == LastName));
    }

    [Fact(DisplayName = "GetCurrentUserAsync should return user when NameIdentifier claim is present")]
    public async Task GetCurrentUserAsyncShouldReturnUserForAuthenticatedRequestAsync()
    {
        var service = new UserService(_users, CreateAccessorWithClaim(TestEmail));
        _ = _users.FindByEmailAsync(TestEmail).Returns(new User
        {
            FirstName = FirstName,
            LastName = LastName,
            Email = TestEmail,
            Password = "hashed"
        });

        var result = await service.GetCurrentUserAsync();

        Assert.Equal(TestEmail, result.Email);
        Assert.Equal(FirstName, result.FirstName);
    }

    [Fact(DisplayName = "GetCurrentUserAsync should throw when HttpContext is null")]
    public async Task GetCurrentUserAsyncShouldThrowWhenNoHttpContextAsync()
    {
        var accessor = Substitute.For<IHttpContextAccessor>();
        accessor.HttpContext.Returns((HttpContext?)null);
        var service = new UserService(_users, accessor);

        _ = await Assert.ThrowsAsync<UnauthorizedException>(() => service.GetCurrentUserAsync());
    }

    [Fact(DisplayName = "GetCurrentUserAsync should throw when NameIdentifier claim is missing")]
    public async Task GetCurrentUserAsyncShouldThrowWhenEmailClaimMissingAsync()
    {
        var httpContext = Substitute.For<HttpContext>();
        httpContext.User.Returns(new ClaimsPrincipal(new ClaimsIdentity()));
        var accessor = Substitute.For<IHttpContextAccessor>();
        accessor.HttpContext.Returns(httpContext);
        var service = new UserService(_users, accessor);

        _ = await Assert.ThrowsAsync<UnauthorizedException>(() => service.GetCurrentUserAsync());
    }

    [Fact(DisplayName = "GetCurrentUserAsync should throw when user no longer exists in the database")]
    public async Task GetCurrentUserAsyncShouldThrowWhenUserNoLongerExistsAsync()
    {
        var service = new UserService(_users, CreateAccessorWithClaim(TestEmail));
        _ = _users.FindByEmailAsync(TestEmail).Returns((User?)null);

        _ = await Assert.ThrowsAsync<UnauthorizedException>(() => service.GetCurrentUserAsync());
    }

    private static IHttpContextAccessor CreateAccessorWithClaim(string email)
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, email)
        ]));
        var httpContext = Substitute.For<HttpContext>();
        httpContext.User.Returns(principal);
        var accessor = Substitute.For<IHttpContextAccessor>();
        accessor.HttpContext.Returns(httpContext);
        return accessor;
    }
}
