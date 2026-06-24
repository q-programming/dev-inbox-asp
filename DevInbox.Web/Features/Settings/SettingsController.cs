using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Settings;

public class SettingsController : ISettingsBaseController, IComponent
{
    public Task<UserSettingsDto> GetSettingsAsync()
    {
        throw new ServiceNotImplementedException();
    }

    public Task<UserSettingsDto> UpdateSettingsAsync(UpdateSettingsRequest body)
    {
        throw new ServiceNotImplementedException();
    }
}
