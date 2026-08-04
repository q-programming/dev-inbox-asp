using DevInbox.Web.Features.GitHub.Domain;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.GitHub;

public class GitHubService(
    IGitHubProfileRepository repository, ILogger<GitHubService> logger) : IService, IGitHubService
{
    /// <summary>
    /// Gets the details of a GitHub pull request for the given inbox item.
    /// </summary>
    /// <param name="item"></param>
    /// <returns></returns>
    public Task<GitHubPullRequestDetail> GetDetailsAsync(InboxItem item)
    {
        return Task.FromResult(new GitHubPullRequestDetail
        {
            PullRequestNumber = int.TryParse(item.ExternalId, out var pr)
                ? pr
                : 1427,

            Repository = item.Repository,
            Title = item.Title ?? "Refactor inbox detail loading using provider pattern",

            State = GitHubPullRequestState.Open,

            Url = $"https://github.com/{item.Repository}/pull/{item.ExternalId}",

            Author = new PersonReference
            {
                Login = "adamj",
                DisplayName = "Adam Jay"
            },

            CreatedAt = item.CreatedAt,
            UpdatedAt = item.UpdatedAt,

            Labels =
            [
                "architecture",
            "backend"
            ],

            Reviewers =
            [
                new PullRequestReviewer
            {
                Reviewer = new PersonReference
                {
                    Login = "jakubr",
                    DisplayName = "Jakub Romaniszyn"
                },
                ReviewState = ReviewState.Approved
            },
            new PullRequestReviewer
            {
                Reviewer = new PersonReference
                {
                    Login = "dymtros",
                    DisplayName = "Dmytro Sami"
                },
                ReviewState = ReviewState.Commented
            }
            ],

            LatestComments =
            [
                new CommentPreview
            {
                Author = new PersonReference
                {
                    Login = "jakubr",
                    DisplayName = "Jakub Romaniszyn"
                },
                Body = "Looks good. Let's keep the provider implementation inside the GitHub module.",
                CreatedAt = item.UpdatedAt.AddMinutes(-30)
            },

            new CommentPreview
            {
                Author = new PersonReference
                {
                    Login = "adamj",
                    DisplayName = "Adam Jay"
                },
                Body = "I'll address the naming comments in a follow-up commit.",
                CreatedAt = item.UpdatedAt.AddMinutes(-10)
            }
            ],

            LinkedWorkItems =
            [
                new LinkedItem
            {
                Id = "ACME-1234",
                Title = "Implement caching for user profile",
                Type = "AdoWorkItem",
                Url = "https://dev.azure.com/acme/_workitems/edit/1234"
            }
            ]
        });
    }

    public async Task SyncUserPRAsync(
        long userId,
        CancellationToken ct = default)
    {
        var profile = await repository.GetByUserIdAsync(userId);
        if (profile == null)
        {
            logger.LogWarning("No GitHub profile found for user {UserId}", userId);
            return;
        }
        //TODO Handle case when token expired or revoked, and refresh it if possible
        logger.LogInformation(
            "[GitHub] Starting sync for {GitHubLogin}",
            profile.GitHubLogin);

        for (var i = 1; i <= 5; i++)
        {
            ct.ThrowIfCancellationRequested();

            logger.LogInformation(
                "[GitHub] Fetching PR page {Page}",
                i);

            await Task.Delay(1000, ct);
        }

        logger.LogInformation(
            "[GitHub] Synchronization completed for {GitHubLogin}",
            profile.GitHubLogin);
    }
}
