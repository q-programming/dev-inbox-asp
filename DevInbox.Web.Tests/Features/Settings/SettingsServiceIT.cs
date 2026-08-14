using System.Security.Claims;
using DevInbox.Web.Features.GitHub;
using DevInbox.Web.Features.GitHub.Client;
using DevInbox.Web.Features.GitHub.Domain;
using DevInbox.Web.Features.Identity;
using DevInbox.Web.Features.Identity.Config;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Settings;
using DevInbox.Web.Features.Settings.Domain;
using DevInbox.Web.Infrastructure.Events;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using DevInbox.Web.Tests.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NSubstitute;

namespace DevInbox.Web.Tests.Features.Settings;

/// <summary>
/// Integration tests for <see cref="SettingsService"/> against a real PostgreSQL container.
/// Exercises <see cref="SettingsRepository"/> and EF Core mapping/conversions end-to-end
/// (e.g. the string-backed <see cref="Theme"/>/<see cref="Density"/> enums).
/// Mirrors the structure of <c>UserServiceIT</c> in Features/Identity.
/// </summary>
public class SettingsServiceIT : DatabaseIntegrationTest
{
    private const string TestEmail = "jan@example.com";
    private const string FirstName = "Jan";
    private const string LastName = "Kowalski";

    private SettingsService _service = default!;
    private User _user = default!;

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();

        _user = new User
        {
            FirstName = FirstName,
            LastName = LastName,
            Email = TestEmail,
            Password = "hashed"
        };
        await DataBase.Users.AddAsync(_user);
        await DataBase.SaveChangesAsync();

        var claimsIdentity = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, _user.Id.ToString())], "TestAuth");
        var httpContextAccessor = Substitute.For<IHttpContextAccessor>();
        httpContextAccessor.HttpContext.Returns(new DefaultHttpContext { User = new ClaimsPrincipal(claimsIdentity) });

        var gitHubIntegrationService = new GitHubIntegrationService(
            Substitute.For<IGitHubProfileRepository>(),
            Substitute.For<IGitHubClient>(),
            Substitute.For<ILogger<GitHubIntegrationService>>());
        var userService = new UserService(new UserRepository(DataBase), httpContextAccessor, Substitute.For<ILogger<UserService>>(), Substitute.For<IPublisher>(), gitHubIntegrationService, Options.Create(new IdentityOptions()));
        _service = new SettingsService(new SettingsRepository(DataBase), userService);
    }

    public override async Task DisposeAsync()
    {
        await DataBase.UserSettings.ExecuteDeleteAsync();
        await base.DisposeAsync();
    }

    [Fact(DisplayName = "GetSettings integration should create and persist default settings for a new user")]
    public Task GetSettingsShouldPersistDefaultSettingsOnFirstCallAsync() => Task.Run(async () =>
    {
        // Act
        var result = await _service.GetSettingsAsync();
        // Assert
        Assert.NotNull(result);
        Assert.Equal(_user.Id, result.UserId);
        Assert.Equal(Web.Features.Settings.Domain.Theme.Light, result.Theme);
        Assert.Equal(Web.Features.Settings.Domain.Density.Relaxed, result.Density);
    });

    [Fact(DisplayName = "GetSettings integration should return the previously persisted settings without duplicating rows")]
    public Task GetSettingsShouldReturnPersistedSettingsWithoutDuplicatingAsync() => Task.Run(async () =>
    {
        await DataBase.UserSettings.AddAsync(new UserSettings
        {
            UserId = _user.Id,
            User = _user,
            Theme = Web.Features.Settings.Domain.Theme.Dark,
            Density = Web.Features.Settings.Domain.Density.Tight,
            FontSize = 16
        });
        await DataBase.SaveChangesAsync();
        // Act
        var result = await _service.GetSettingsAsync();
        // Assert
        Assert.NotNull(result);
        Assert.Equal(_user.Id, result.UserId);
        Assert.Equal(Web.Features.Settings.Domain.Theme.Dark, result.Theme);
        Assert.Equal(Web.Features.Settings.Domain.Density.Tight, result.Density);
    });

    [Fact(DisplayName = "SaveSettings integration should persist updated theme and density to the database")]
    public Task SaveSettingsShouldPersistUpdatedThemeAndDensityAsync() => Task.Run(async () =>
    {
        await DataBase.UserSettings.AddAsync(new UserSettings
        {
            UserId = _user.Id,
            User = _user,
            Theme = Web.Features.Settings.Domain.Theme.Dark,
            Density = Web.Features.Settings.Domain.Density.Tight,
            FontSize = 16
        });
        await DataBase.SaveChangesAsync();
        // Act
        var result = await _service.SaveSettingsAsync(new UserSettingsDto
        {
            Theme = Web.Infrastructure.OpenApi.Generated.Theme.Light,
            Density = Web.Infrastructure.OpenApi.Generated.Density.Relaxed,
            FontSize = 18
        });
        // Assert
        Assert.NotNull(result);
        Assert.Equal(_user.Id, result.UserId);
        Assert.Equal(Web.Features.Settings.Domain.Theme.Light, result.Theme);
        Assert.Equal(Web.Features.Settings.Domain.Density.Relaxed, result.Density);
    });

    [Fact(DisplayName = "SaveSettings should create new settings and link them to the current user when none exist")]
    public Task SaveSettingsShouldCreateNewSettingsWhenNoneExistAsync() => Task.Run(async () =>
    {
        // Act
        var result = await _service.SaveSettingsAsync(new UserSettingsDto
        {
            Theme = Web.Infrastructure.OpenApi.Generated.Theme.Light,
            Density = Web.Infrastructure.OpenApi.Generated.Density.Relaxed,
            FontSize = 18
        });
        // Assert
        Assert.NotNull(result);
        Assert.Equal(_user.Id, result.UserId);
        Assert.Equal(Web.Features.Settings.Domain.Theme.Light, result.Theme);
        Assert.Equal(Web.Features.Settings.Domain.Density.Relaxed, result.Density);
    });
}
