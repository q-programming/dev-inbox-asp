namespace DevInbox.Web.Features.GitHub.Domain;

public interface IGitHubProfileRepository : IRepository<GitHubProfile>
{
    Task<GitHubProfile?> GetByUserIdAsync(long userId);

    /// <summary>Removes the user's GitHub profile/token row. Silent no-op when none exists — the caller
    /// (disconnect event handler) is responsible for removing the synced inbox items separately.</summary>
    Task DeleteByUserIdAsync(long userId);
}
