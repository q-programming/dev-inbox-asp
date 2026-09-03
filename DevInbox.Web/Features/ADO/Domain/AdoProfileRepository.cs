using DevInbox.Web.Infrastructure.Persistence;

namespace DevInbox.Web.Features.ADO.Domain;

public class AdoProfileRepository(AppDbContext db) : Repository<AdoProfile>(db), IAdoProfileRepository
{
    public async Task<IReadOnlyList<AdoProfile>> GetAllByUserIdAsync(long userId)
    {
        return await db.AdoProfiles.Include(p => p.User)
            .Where(p => p.UserId == userId)
            .ToListAsync();
    }

    public Task<AdoProfile?> GetByUserIdAndOrganizationAsync(long userId, string organization)
    {
        return db.AdoProfiles.Include(p => p.User)
            .SingleOrDefaultAsync(p => p.UserId == userId && p.Organization == organization);
    }

    public async Task DeleteByUserIdAndOrganizationAsync(long userId, string organization)
    {
        var profile = await GetByUserIdAndOrganizationAsync(userId, organization)
            ?? throw new NotFoundException($"No Azure DevOps integration for organization '{organization}' to disconnect.");
        await DeleteAsync(profile);
    }
}
