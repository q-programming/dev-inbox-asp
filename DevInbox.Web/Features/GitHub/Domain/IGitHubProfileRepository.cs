namespace DevInbox.Web.Features.GitHub.Domain;

public interface IGitHubProfileRepository : IRepository<GitHubProfile>
{
    Task<GitHubProfile?> GetByUserIdAsync(long userId);

    Task DeleteByUserIdAsync(long userId);
}
