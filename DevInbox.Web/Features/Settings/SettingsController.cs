using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Settings;

public class SettingsController : ISettingsBaseController, IComponent
{
    public Task<UserSettingsDto> GetSettingsAsync()
        => throw new NotImplementedException();

    public Task<UserSettingsDto> UpdateSettingsAsync(UpdateSettingsRequest body)
        => throw new NotImplementedException();
}
