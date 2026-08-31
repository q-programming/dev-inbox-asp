using DevInbox.Web.Infrastructure.Persistence;

namespace DevInbox.Web.Features.ADO.Domain;

public class AdoProfileRepository(AppDbContext db) : Repository<AdoProfile>(db), IAdoProfileRepository
{
    public Task<AdoProfile?> GetByUserIdAsync(long userId)
    {
        return db.AdoProfiles.Include(p => p.User)
            .SingleOrDefaultAsync(p => p.UserId == userId);
    }

    public async Task DeleteByUserIdAsync(long userId)
    {
        var profile = await GetByUserIdAsync(userId)
            ?? throw new NotFoundException("No Azure DevOps integration to disconnect.");
        await DeleteAsync(profile);
    }
}
