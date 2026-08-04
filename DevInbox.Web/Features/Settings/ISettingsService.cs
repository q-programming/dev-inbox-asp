using DevInbox.Web.Features.Settings.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Settings;


public interface ISettingsService
{
    Task<UserSettings> GetSettingsAsync();
    Task<UserSettings> SaveSettingsAsync(UserSettingsDto settings);
}