using DevInbox.Web.Infrastructure.Persistence;

namespace DevInbox.Web.Features.GitHub.Domain;

public class GitHubProfileRepository(AppDbContext db) : Repository<GitHubProfile>(db), IGitHubProfileRepository
{
    public Task<GitHubProfile?> GetByUserIdAsync(long userId)
    {
        return db.GitHubProfiles.Include(p => p.User)
            .SingleOrDefaultAsync(p => p.UserId == userId);
    }
}
