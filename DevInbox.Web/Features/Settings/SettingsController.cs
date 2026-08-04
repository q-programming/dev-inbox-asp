using DevInbox.Web.Features.Settings.Mapping;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Settings;

public class SettingsController(ISettingsService settingsService) : ISettingsBaseController, IComponent
{

    private static readonly SettingsMapper _mapper = new();
    public async Task<UserSettingsDto> GetSettingsAsync()
    {
        var userSettings = await settingsService.GetSettingsAsync();
        return _mapper.ToDto(userSettings);
    }

    public async Task<UserSettingsDto> UpdateSettingsAsync(UserSettingsDto body)
    {
        var updated = await settingsService.SaveSettingsAsync(body);
        return _mapper.ToDto(updated);
    }
}
