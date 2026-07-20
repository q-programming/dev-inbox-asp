namespace DevInbox.Web.Features.Settings.Domain;

public interface ISettingsRepository : IRepository<UserSettings>
{
    Task<UserSettings?> GetByUserId(long userId);
}
