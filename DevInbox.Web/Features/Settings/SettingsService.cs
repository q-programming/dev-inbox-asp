using DevInbox.Web.Features.Identity;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Settings.Domain;
using DevInbox.Web.Features.Settings.Mapping;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Settings;

public class SettingsService(ISettingsRepository repository, IUserService userService) : IService, ISettingsService
{

    private static readonly SettingsMapper _mapper = new();
    public async Task<UserSettings> GetSettingsAsync()
    {
        var user = await userService.GetCurrentUserAsync();
        var userSettings = await repository.GetByUserId(user.Id);
        if (userSettings is null)
        {
            userSettings = CreateDefaultSettings(user);
            await repository.AddAsync(userSettings);

        }
        return userSettings;
    }

    public async Task<UserSettings> SaveSettingsAsync(UserSettingsDto settingsDto)
    {
        var user = await userService.GetCurrentUserAsync();
        var userSettings = await repository.GetByUserId(user.Id) ?? CreateDefaultSettings(user);
        _mapper.UpdateFromDto(settingsDto, userSettings);
        if (userSettings.Id != 0)
        {
            await repository.UpdateAsync(userSettings);
        }
        else
        {
            await repository.AddAsync(userSettings);

        }
        return userSettings;
    }

    private static UserSettings CreateDefaultSettings(User user)
    {
        return new UserSettings
        {
            Theme = Domain.Theme.Light,
            Density = Domain.Density.Relaxed,
            FontSize = 14,
            User = user,
        };
    }
}