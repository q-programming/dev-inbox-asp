using DevInbox.Web.Infrastructure.Persistence;

namespace DevInbox.Web.Features.Settings.Domain;

public class SettingsRepository(AppDbContext db) : Repository<UserSettings>(db), ISettingsRepository
{
    public Task<UserSettings?> GetByUserId(long userId)
    {
        return db.UserSettings.SingleOrDefaultAsync(settings => settings.UserId == userId);
    }
}
