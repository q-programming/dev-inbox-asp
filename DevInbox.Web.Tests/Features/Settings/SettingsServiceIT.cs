using DevInbox.Web.Features.Identity;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Settings;
using DevInbox.Web.Features.Settings.Domain;
using DevInbox.Web.Tests.Infrastructure;
using Microsoft.AspNetCore.Http;
using NSubstitute;

namespace DevInbox.Web.Tests.Features.Settings;

/// <summary>
/// Integration tests for <see cref="SettingsService"/> against a real PostgreSQL container.
/// Exercises <see cref="SettingsRepository"/> and EF Core mapping/conversions end-to-end
/// (e.g. the string-backed <see cref="ApplicationTheme"/>/<see cref="ApplicationDensity"/> enums).
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

        var userService = new UserService(new UserRepository(DataBase), Substitute.For<IHttpContextAccessor>(), Substitute.For<ILogger<UserService>>());
        _service = new SettingsService(new SettingsRepository(DataBase), userService);
    }

    [Fact(DisplayName = "GetSettings integration should create and persist default settings for a new user")]
    public Task GetSettingsShouldPersistDefaultSettingsOnFirstCallAsync() => throw new NotImplementedException();

    [Fact(DisplayName = "GetSettings integration should return the previously persisted settings without duplicating rows")]
    public Task GetSettingsShouldReturnPersistedSettingsWithoutDuplicatingAsync() => throw new NotImplementedException();

    [Fact(DisplayName = "SaveSettings integration should persist updated theme and density to the database")]
    public Task SaveSettingsShouldPersistUpdatedThemeAndDensityAsync() => throw new NotImplementedException();

    [Fact(DisplayName = "SaveSettings integration should not create a duplicate row when settings already exist")]
    public Task SaveSettingsShouldNotCreateDuplicateRowWhenSettingsExistAsync() => throw new NotImplementedException();
}
