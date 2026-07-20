using DevInbox.Web.Features.Identity;
using DevInbox.Web.Features.Settings;
using DevInbox.Web.Features.Settings.Domain;
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

    public SettingsServiceTests()
    {
        _settingsRepository = Substitute.For<ISettingsRepository>();
        _userService = Substitute.For<IUserService>();
        _service = new SettingsService(_settingsRepository, _userService);
    }

    [Fact(DisplayName = "GetSettings should return existing settings when found for the current user")]
    public Task GetSettingsShouldReturnExistingSettingsWhenFoundAsync() => throw new NotImplementedException();

    [Fact(DisplayName = "GetSettings should create and persist default settings when none exist yet")]
    public Task GetSettingsShouldCreateDefaultSettingsWhenNoneExistAsync() => throw new NotImplementedException();

    [Fact(DisplayName = "GetSettings should default to Light theme and Relaxed density for new users")]
    public Task GetSettingsShouldDefaultToLightThemeAndRelaxedDensityAsync() => throw new NotImplementedException();

    [Fact(DisplayName = "SaveSettings should update the tracked entity when settings already exist")]
    public Task SaveSettingsShouldUpdateExistingSettingsAsync() => throw new NotImplementedException();

    [Fact(DisplayName = "SaveSettings should not call AddAsync when settings already exist")]
    public Task SaveSettingsShouldNotAddWhenSettingsAlreadyExistAsync() => throw new NotImplementedException();

    [Fact(DisplayName = "SaveSettings should create new settings and link them to the current user when none exist")]
    public Task SaveSettingsShouldCreateNewSettingsLinkedToUserWhenNoneExistAsync() => throw new NotImplementedException();

    [Fact(DisplayName = "SaveSettings should map dto theme/density/fontSize/sideBarCollapsed onto the entity")]
    public Task SaveSettingsShouldMapDtoFieldsOntoEntityAsync() => throw new NotImplementedException();

    [Fact(DisplayName = "SaveSettings should not overwrite Id or UserId from the incoming dto")]
    public Task SaveSettingsShouldNotOverwriteIdOrUserIdFromDtoAsync() => throw new NotImplementedException();
}
