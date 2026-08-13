using System.Security.Claims;
using DevInbox.Web.Common;
using DevInbox.Web.Features.GitHub;
using DevInbox.Web.Features.GitHub.Client;
using DevInbox.Web.Features.GitHub.Client.DTO;
using DevInbox.Web.Features.GitHub.Domain;
using DevInbox.Web.Features.Identity;
using DevInbox.Web.Features.Identity.Config;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Identity.Events;
using DevInbox.Web.Features.Identity.Exceptions;
using DevInbox.Web.Infrastructure.Events;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using NSubstitute;

namespace DevInbox.Web.Tests.Features.Identity;

public class UserServiceTests
{
    private const string TestEmail = "jan@example.com";
    private const long TestUserId = 42;
    private const string FirstName = "Jan";
    private const string LastName = "Kowalski";
    private const string StrongPassword = "strongpassword123";
    private const string AccessToken = "accessToken";
    private const string InvalidEmail = "login@github.invalid";
    private readonly IUserRepository _userRepository;
    private readonly IGitHubIntegrationService _gitHubIntegrationService;
    private readonly UserService _service;
    private readonly IPublisher _asyncPublisher;
    private static IOptions<IdentityOptions> MockDataOptions => Options.Create(new IdentityOptions { UseMockData = true });
    private static IOptions<IdentityOptions> DefaultOptions => Options.Create(new IdentityOptions());

    public UserServiceTests()
    {
        _userRepository = Substitute.For<IUserRepository>();
        _asyncPublisher = Substitute.For<IPublisher>();
        _gitHubIntegrationService = new GitHubIntegrationService(
            Substitute.For<IGitHubProfileRepository>(),
            Substitute.For<IGitHubClient>(),
            Substitute.For<ILogger<GitHubIntegrationService>>());
        _service = new UserService(_userRepository, Substitute.For<IHttpContextAccessor>(), Substitute.For<ILogger<UserService>>(), _asyncPublisher, _gitHubIntegrationService, MockDataOptions);
    }

    [Fact(DisplayName = "RegisterAsync should normalize email, hash password, and persist user")]
    public async Task RegisterAsyncShouldMapUserAndPersistViaRepositoryAsync()
    {
        _ = _userRepository.ExistsByEmailAsync(TestEmail).Returns(false);

        var request = new RegisterRequest
        {
            FirstName = FirstName,
            LastName = LastName,
            Email = TestEmail,
            Password = StrongPassword
        };

        var result = await _service.RegisterAsync(request);

        _ = await _userRepository.Received(1).ExistsByEmailAsync(TestEmail);
        await _userRepository.Received(1).AddAsync(Arg.Is<User>(u =>
            u.Email == TestEmail &&
            u.FirstName == FirstName &&
            u.LastName == LastName &&
            u.GitHubProfile != null &&
            u.GitHubProfile.GitHubLogin == "jkowalski"));
        await _asyncPublisher.Received(1).PublishAsync(Arg.Is<UserCreatedEvent>(ev => ev.Email == TestEmail));

        Assert.Equal(TestEmail, result.Email);
        Assert.Equal(FirstName, result.FirstName);
        Assert.Equal(LastName, result.LastName);
    }

    [Fact(DisplayName = "RegisterAsync should not add a GitHub profile when UseMockData is disabled")]
    public async Task RegisterAsyncShouldNotAddGitHubProfileWhenMockDataDisabledAsync()
    {
        _ = _userRepository.ExistsByEmailAsync(TestEmail).Returns(false);
        var service = new UserService(_userRepository, Substitute.For<IHttpContextAccessor>(), Substitute.For<ILogger<UserService>>(), _asyncPublisher, _gitHubIntegrationService, DefaultOptions);

        var request = new RegisterRequest
        {
            FirstName = FirstName,
            LastName = LastName,
            Email = TestEmail,
            Password = StrongPassword
        };

        _ = await service.RegisterAsync(request);

        await _userRepository.Received(1).AddAsync(Arg.Is<User>(u => u.GitHubProfile == null));
    }

    [Fact(DisplayName = "LoginAsync should authenticate user and return mapped dto")]
    public async Task LoginAsyncShouldSucceedAsync()
    {
        _ = _userRepository.FindByEmailAsync(TestEmail).Returns(new User
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
        await _asyncPublisher.Received(1).PublishAsync(Arg.Is<UserAuthenticatedEvent>(ev => ev.Email == TestEmail));
        Assert.Equal(TestEmail, result.Email);
        Assert.Equal(FirstName, result.FirstName);
        Assert.Equal(LastName, result.LastName);
    }

    [Fact(DisplayName = "LoginAsync should fail for wrong password")]
    public async Task LoginAsyncShouldFailForWrongPasswordAsync()
    {
        _ = _userRepository.FindByEmailAsync(TestEmail).Returns(new User
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
        await _asyncPublisher.Received(1).PublishAsync(Arg.Is<AuthenticationFailedEvent>(ev => ev.Email == TestEmail));
    }

    [Fact(DisplayName = "LoginAsync should fail for not existing user")]
    public async Task LoginAsyncShouldFailForNotExistingUserAsync()
    {
        _ = _userRepository.FindByEmailAsync(TestEmail).Returns((User?)null);
        var request = new LoginRequest
        {
            Email = TestEmail,
            Password = StrongPassword
        };
        _ = await Assert.ThrowsAsync<UnauthorizedException>(async () => await _service.LoginAsync(request));
        await _asyncPublisher.Received(0).PublishAsync(Arg.Is<AuthenticationFailedEvent>(ev => ev.Email == TestEmail));
    }

    [Fact(DisplayName = "RegisterAsync should throw when user with email already exists")]
    public async Task RegisterAsyncShouldThrowErrorForExistingEmailAsync()
    {
        _ = _userRepository.ExistsByEmailAsync(TestEmail).Returns(true);

        var request = new RegisterRequest
        {
            FirstName = FirstName,
            LastName = LastName,
            Email = TestEmail,
            Password = StrongPassword
        };

        _ = await Assert.ThrowsAsync<UserAlreadyExistsException>(async () => await _service.RegisterAsync(request));

        _ = await _userRepository.Received(1).ExistsByEmailAsync(TestEmail);
        await _userRepository.DidNotReceive().AddAsync(Arg.Is<User>(user =>
            user.Email == TestEmail &&
            user.FirstName == FirstName &&
            user.LastName == LastName));
    }

    [Fact(DisplayName = "GetCurrentUserAsync should return user when NameIdentifier claim is present")]
    public async Task GetCurrentUserAsyncShouldReturnUserForAuthenticatedRequestAsync()
    {
        var service = new UserService(_userRepository, CreateAccessorWithClaim(TestUserId), Substitute.For<ILogger<UserService>>(), _asyncPublisher, _gitHubIntegrationService, DefaultOptions);

        _ = _userRepository.FindByIdAsync(TestUserId).Returns(new User
        {
            Id = TestUserId,
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
        var service = new UserService(_userRepository, accessor, Substitute.For<ILogger<UserService>>(), Substitute.For<IPublisher>(), _gitHubIntegrationService, DefaultOptions);

        _ = await Assert.ThrowsAsync<UnauthorizedException>(() => service.GetCurrentUserAsync());
    }

    [Fact(DisplayName = "GetCurrentUserAsync should throw when NameIdentifier claim is missing")]
    public async Task GetCurrentUserAsyncShouldThrowWhenEmailClaimMissingAsync()
    {
        var httpContext = Substitute.For<HttpContext>();
        httpContext.User.Returns(new ClaimsPrincipal(new ClaimsIdentity()));
        var accessor = Substitute.For<IHttpContextAccessor>();
        accessor.HttpContext.Returns(httpContext);
        var service = new UserService(_userRepository, accessor, Substitute.For<ILogger<UserService>>(), _asyncPublisher, _gitHubIntegrationService, DefaultOptions);

        _ = await Assert.ThrowsAsync<UnauthorizedException>(() => service.GetCurrentUserAsync());
    }

    [Fact(DisplayName = "GetCurrentUserAsync should throw when user no longer exists in the database")]
    public async Task GetCurrentUserAsyncShouldThrowWhenUserNoLongerExistsAsync()
    {
        var service = new UserService(_userRepository, CreateAccessorWithClaim(TestUserId), Substitute.For<ILogger<UserService>>(), _asyncPublisher, _gitHubIntegrationService, DefaultOptions);
        _ = _userRepository.FindByIdAsync(TestUserId).Returns((User?)null);

        _ = await Assert.ThrowsAsync<UnauthorizedException>(() => service.GetCurrentUserAsync());
    }

    [Fact(DisplayName = "LoginOrCreateGitHubUserAsync should create new user if not existing")]
    public async Task LoginOrCreateGitHubUserAsyncShouldCreateUserAsync()
    {
        _ = _userRepository.FindByEmailAsync(TestEmail).Returns((User?)null);
        var result = await _service.LoginOrCreateGitHubUserAsync(new GitHubUserProfileDTO
        {
            Email = TestEmail,
            Name = $"{FirstName} {LastName}"
        }, AccessToken);
        await _userRepository.Received(1).AddAsync(Arg.Is<User>(user =>
            user.Email == TestEmail &&
            user.FirstName == FirstName &&
            user.LastName == LastName));
        await _asyncPublisher.Received(1).PublishAsync(Arg.Is<UserCreatedEvent>(ev => ev.Email == TestEmail));
        await _asyncPublisher.Received(1).PublishAsync(Arg.Is<UserAuthenticatedEvent>(ev => ev.Email == TestEmail));

        Assert.Equal(TestEmail, result.Email);
        Assert.Equal(FirstName, result.FirstName);
        Assert.Equal(LastName, result.LastName);
    }

    [Fact(DisplayName = "LoginOrCreateGitHubUserAsync should create new user without email")]
    public async Task LoginOrCreateGitHubUserAsyncShouldCreateUserNoEmailAsync()
    {
        _ = _userRepository.FindByEmailAsync(InvalidEmail).Returns((User?)null);
        var result = await _service.LoginOrCreateGitHubUserAsync(new GitHubUserProfileDTO
        {
            Login = "login",
            Name = $"{FirstName} {LastName}"
        }, AccessToken);
        await _userRepository.Received(1).AddAsync(Arg.Is<User>(user =>
            user.Email == InvalidEmail &&
            user.FirstName == FirstName &&
            user.LastName == LastName));

        Assert.NotEqual(TestEmail, result.Email);
        Assert.Equal(FirstName, result.FirstName);
        Assert.Equal(LastName, result.LastName);
    }

    [Fact(DisplayName = "LoginOrCreateGitHubUserAsync should return existing user")]
    public async Task LoginOrCreateGitHubUserAsyncShouldReturnExistingAsync()
    {
        var user = new User
        {
            Email = TestEmail,
            FirstName = FirstName,
            LastName = LastName,
            GitHubProfile = new GitHubProfile
            {
                GitHubLogin = "octocat",
                GitHubUserId = 1,
                AccessToken = "old-token"
            }
        };
        _ = _userRepository.FindByEmailWithGitHubProfileAsync(TestEmail).Returns(user);
        var result = await _service.LoginOrCreateGitHubUserAsync(new GitHubUserProfileDTO
        {
            Email = TestEmail,
            Name = $"{FirstName} {LastName}"
        }, AccessToken);
        await _userRepository.DidNotReceive().AddAsync(Arg.Any<User>());

        Assert.Equal(TestEmail, result.Email);
        Assert.Equal(FirstName, result.FirstName);
        Assert.Equal(LastName, result.LastName);
    }

    private static IHttpContextAccessor CreateAccessorWithClaim(long userId)
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        ]));
        var httpContext = Substitute.For<HttpContext>();
        httpContext.User.Returns(principal);
        var accessor = Substitute.For<IHttpContextAccessor>();
        accessor.HttpContext.Returns(httpContext);
        return accessor;
    }
}
