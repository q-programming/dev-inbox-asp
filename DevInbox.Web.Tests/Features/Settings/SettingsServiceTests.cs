using DevInbox.Web.Features.Identity;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Settings;
using DevInbox.Web.Features.Settings.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using NSubstitute;

namespace DevInbox.Web.Tests.Features.Settings;

/// <summary>
/// Unit tests for <see cref="SettingsService"/>.
/// Repository and user service are mocked — no database involved.
/// Mirrors the structure of <c>UserServiceTests</c> in Features/Identity.
/// </summary>
public class SettingsServiceTests
{
    private readonly ISettingsRepository _settingsRepository;
    private readonly IUserService _userService;
    private readonly SettingsService _service;

    private const string TestEmail = "jan@example.com";

    public SettingsServiceTests()
    {
        _settingsRepository = Substitute.For<ISettingsRepository>();
        _userService = Substitute.For<IUserService>();
        _service = new SettingsService(_settingsRepository, _userService);
    }

    [Fact(DisplayName = "GetSettings should return existing settings when found for the current user")]
    public Task GetSettingsShouldReturnExistingSettingsWhenFoundAsync() => Task.Run(async () =>
    {
        // Arrange
        var existingUser = new User { Id = 1, Email = TestEmail };
        var existingSettings = new UserSettings { Id = 1, UserId = 1, Theme = Web.Features.Settings.Domain.Theme.Dark, Density = Web.Features.Settings.Domain.Density.Relaxed, User = existingUser };
        _userService.GetCurrentUserAsync().Returns(existingUser);
        _settingsRepository.GetByUserId(1).Returns(existingSettings);
        // Act
        var result = await _service.GetSettingsAsync();
        // Assert
        Assert.Equal(existingSettings, result);
    });

    [Fact(DisplayName = "GetSettings should create and persist default settings when none exist yet")]
    public Task GetSettingsShouldCreateDefaultSettingsWhenNoneExistAsync() => Task.Run(async () =>
    {
        // Arrange
        var existingUser = new User { Id = 1, Email = TestEmail };
        _userService.GetCurrentUserAsync().Returns(existingUser);
        _settingsRepository.GetByUserId(1).Returns((UserSettings?)null);
        _settingsRepository.AddAsync(Arg.Any<UserSettings>()).Returns(callInfo =>
        {
            var settings = callInfo.Arg<UserSettings>();
            settings.UserId = settings.User.Id;
            settings.Id = 1;
            return Task.FromResult(settings);
        });
        // Act
        var result = await _service.GetSettingsAsync();
        // Assert
        Assert.NotNull(result);
        Assert.Equal(existingUser.Id, result.UserId);
        Assert.Equal(Web.Features.Settings.Domain.Theme.Light, result.Theme);
        Assert.Equal(Web.Features.Settings.Domain.Density.Relaxed, result.Density);
    });

    [Fact(DisplayName = "SaveSettings should update the tracked entity when settings already exist")]
    public Task SaveSettingsShouldUpdateExistingSettingsAsync() => Task.Run(async () =>
    {
        // Arrange
        var existingUser = new User { Id = 1, Email = TestEmail };
        var existingSettings = new UserSettings { Id = 1, UserId = 1, Theme = Web.Features.Settings.Domain.Theme.Dark, Density = Web.Features.Settings.Domain.Density.Relaxed, User = existingUser };
        _userService.GetCurrentUserAsync().Returns(existingUser);
        _settingsRepository.GetByUserId(1).Returns(existingSettings);
        _settingsRepository.UpdateAsync(existingSettings).Returns(Task.FromResult(existingSettings));

        // Act
        var result = await _service.SaveSettingsAsync(new UserSettingsDto { Theme = Web.Infrastructure.OpenApi.Generated.Theme.Light, Density = Web.Infrastructure.OpenApi.Generated.Density.Tight });

        // Assert
        Assert.Same(existingSettings, result);
        Assert.Equal(Web.Features.Settings.Domain.Theme.Light, result.Theme);
        Assert.Equal(Web.Features.Settings.Domain.Density.Tight, result.Density);

        await _settingsRepository.Received(1).UpdateAsync(existingSettings);
        await _settingsRepository.DidNotReceive().AddAsync(Arg.Any<UserSettings>());
    });

    [Fact(DisplayName = "SaveSettings should create new settings and link them to the current user when none exist")]
    public Task SaveSettingsShouldCreateNewSettingsLinkedToUserWhenNoneExistAsync() => Task.Run(async () =>
    {
        var existingUser = new User { Id = 1, Email = TestEmail };
        _userService.GetCurrentUserAsync().Returns(existingUser);
        _settingsRepository.GetByUserId(1).Returns((UserSettings?)null);
        _settingsRepository.AddAsync(Arg.Any<UserSettings>()).Returns(callInfo =>
        {
            var settings = callInfo.Arg<UserSettings>();
            settings.UserId = settings.User.Id;
            settings.Id = 1;
            return Task.FromResult(settings);
        });

        var result = await _service.SaveSettingsAsync(new UserSettingsDto { Theme = Web.Infrastructure.OpenApi.Generated.Theme.Light, Density = Web.Infrastructure.OpenApi.Generated.Density.Tight });

        Assert.Equal(1L, result.Id);
        Assert.Equal(existingUser.Id, result.UserId);
        Assert.Equal(existingUser, result.User);
        Assert.Equal(Web.Features.Settings.Domain.Theme.Light, result.Theme);
        Assert.Equal(Web.Features.Settings.Domain.Density.Tight, result.Density);
    });
}
