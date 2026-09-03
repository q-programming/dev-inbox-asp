using DevInbox.Web.Features.GitHub.Client.DTO;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using Riok.Mapperly.Abstractions;

namespace DevInbox.Web.Features.GitHub.Mapper;

/// <summary>
/// Maps the raw GraphQL "search pull requests" response shape (<see cref="GitHubGraphQLPullRequestNodeDTO"/>)
/// into the clean, application-facing <see cref="GitHubPullRequestDTO"/>.
/// Scalar/nested-flattening members are handled declaratively by Mapperly; members that need
/// filtering or coalescing logic (labels, review requests, reviews) are hand-written below —
/// Mapperly picks them up automatically by matching the source/target types.
/// </summary>
[Mapper]
public partial class GitHubPullRequestMapper
{
    [MapProperty(nameof(GitHubGraphQLPullRequestNodeDTO.Repository) + "." + nameof(GitHubGraphQLRepositoryDTO.NameWithOwner), nameof(GitHubPullRequestDTO.RepositoryFullName))]
    [MapProperty(nameof(GitHubGraphQLPullRequestNodeDTO.Comments) + "." + nameof(GitHubGraphQLTotalCountDTO.TotalCount), nameof(GitHubPullRequestDTO.CommentsCount))]
    [MapProperty(nameof(GitHubGraphQLPullRequestNodeDTO.Id), nameof(GitHubPullRequestDTO.NodeId))]
    [MapProperty(nameof(GitHubGraphQLPullRequestNodeDTO.Labels), nameof(GitHubPullRequestDTO.Labels))]
    [MapProperty(nameof(GitHubGraphQLPullRequestNodeDTO.ReviewRequests), nameof(GitHubPullRequestDTO.RequestedReviewers))]
    [MapProperty(nameof(GitHubGraphQLPullRequestNodeDTO.Reviews), nameof(GitHubPullRequestDTO.Reviews))]
    public partial GitHubPullRequestDTO ToDto(GitHubGraphQLPullRequestNodeDTO node);

    /// <summary>Projects label nodes down to their name — used automatically for the Labels member above.</summary>
    private static List<string> MapLabels(GitHubGraphQLLabelConnectionDTO? labels) =>
        labels?.Nodes.Select(l => l.Name).ToList() ?? [];

    /// <summary>
    /// requestedReviewer is a User/Team union — only one of Login/Name is populated per node.
    /// Filters out any entry that resolves to neither (shouldn't normally happen, but keeps the
    /// output clean rather than propagating nulls/blank strings).
    /// </summary>
    private static List<string> MapRequestedReviewers(GitHubGraphQLReviewRequestConnectionDTO? reviewRequests) =>
        reviewRequests?.Nodes
            .Select(r => r.RequestedReviewer?.Login ?? r.RequestedReviewer?.Name)
            .Where(name => !string.IsNullOrEmpty(name))
            .Select(name => name!)
            .ToList() ?? [];

    /// <summary>Drops review nodes with no author (defensive — shouldn't occur in practice) and flattens the author reference to a login.</summary>
    private static List<GitHubReviewDTO> MapReviews(GitHubGraphQLReviewConnectionDTO? reviews) =>
        reviews?.Nodes
            .Where(r => r.Author is not null)
            .Select(r => new GitHubReviewDTO
            {
                ReviewerLogin = r.Author!.Login,
                State = r.State,
                SubmittedAt = r.SubmittedAt
            })
            .ToList() ?? [];

    /// <summary>
    /// Maps the single-PR detail GraphQL response into the API's <see cref="GitHubPullRequestDetail"/>
    /// contract. Direct/scalar fields (Title, Url, CreatedAt, etc.) and Labels are handled
    /// declaratively by the generated <see cref="MapDetailCore"/>; members that need derived or
    /// unioned logic — State, Author, Reviewers and LatestComments — are filled in by hand below,
    /// since Mapperly can only do 1:1 or simple flattening mappings declaratively.
    /// </summary>
    public GitHubPullRequestDetail ToDetail(GitHubGraphQLPullRequestDetailNodeDTO node)
    {
        var detail = MapDetailCore(node);
        detail.Author = MapAuthor(node.Author);
        detail.State = MapState(node);
        detail.Reviewers = MapReviewers(node);
        detail.LatestComments = MapLatestComments(node.LatestComments);
        detail.SummaryFormat = ContentFormat.Markdown;
        return detail;
    }

    [MapperIgnoreTarget(nameof(GitHubPullRequestDetail.Author))]
    [MapperIgnoreTarget(nameof(GitHubPullRequestDetail.State))]
    [MapperIgnoreTarget(nameof(GitHubPullRequestDetail.Reviewers))]
    [MapperIgnoreTarget(nameof(GitHubPullRequestDetail.LatestComments))]
    [MapperIgnoreTarget(nameof(GitHubPullRequestDetail.LinkedWorkItems))]
    [MapperIgnoreSource(nameof(GitHubGraphQLPullRequestDetailNodeDTO.Id))]
    [MapperIgnoreSource(nameof(GitHubGraphQLPullRequestDetailNodeDTO.State))]
    [MapperIgnoreSource(nameof(GitHubGraphQLPullRequestDetailNodeDTO.IsDraft))]
    [MapperIgnoreSource(nameof(GitHubGraphQLPullRequestDetailNodeDTO.Merged))]
    [MapperIgnoreSource(nameof(GitHubGraphQLPullRequestDetailNodeDTO.ClosedAt))]
    [MapperIgnoreSource(nameof(GitHubGraphQLPullRequestDetailNodeDTO.MergedAt))]
    [MapperIgnoreSource(nameof(GitHubGraphQLPullRequestDetailNodeDTO.Additions))]
    [MapperIgnoreSource(nameof(GitHubGraphQLPullRequestDetailNodeDTO.Deletions))]
    [MapperIgnoreSource(nameof(GitHubGraphQLPullRequestDetailNodeDTO.ChangedFiles))]
    [MapperIgnoreSource(nameof(GitHubGraphQLPullRequestDetailNodeDTO.ReviewDecision))]
    [MapperIgnoreSource(nameof(GitHubGraphQLPullRequestDetailNodeDTO.Author))]
    [MapperIgnoreSource(nameof(GitHubGraphQLPullRequestDetailNodeDTO.Comments))]
    [MapperIgnoreSource(nameof(GitHubGraphQLPullRequestDetailNodeDTO.ReviewRequests))]
    [MapperIgnoreSource(nameof(GitHubGraphQLPullRequestDetailNodeDTO.Reviews))]
    [MapperIgnoreSource(nameof(GitHubGraphQLPullRequestDetailNodeDTO.LatestComments))]
    [MapProperty(nameof(GitHubGraphQLPullRequestDetailNodeDTO.Number), nameof(GitHubPullRequestDetail.PullRequestNumber))]
    [MapProperty(
        nameof(GitHubGraphQLPullRequestDetailNodeDTO.Repository) + "." + nameof(GitHubGraphQLRepositoryDTO.NameWithOwner),
        nameof(GitHubPullRequestDetail.Repository))]
    [MapProperty(nameof(GitHubGraphQLPullRequestDetailNodeDTO.Body), nameof(GitHubPullRequestDetail.Summary))]
    [MapProperty(nameof(GitHubGraphQLPullRequestDetailNodeDTO.Labels), nameof(GitHubPullRequestDetail.Labels))]
    private partial GitHubPullRequestDetail MapDetailCore(GitHubGraphQLPullRequestDetailNodeDTO node);

    private static PersonReference? MapAuthor(GitHubGraphQLActorDTO? author) =>
        author is null ? null : new PersonReference { Login = author.Login, AvatarUrl = author.AvatarUrl };

    /// <summary>Derives the API's simplified open/draft/merged/closed state — GraphQL's own "state" only distinguishes open/closed/merged, with draft tracked as a separate boolean.</summary>
    private static GitHubPullRequestState MapState(GitHubGraphQLPullRequestDetailNodeDTO node) => node switch
    {
        { IsDraft: true } => GitHubPullRequestState.Draft,
        { Merged: true } => GitHubPullRequestState.Merged,
        { State: var s } when string.Equals(s, GitHubPullRequestStates.Closed, StringComparison.OrdinalIgnoreCase) => GitHubPullRequestState.Closed,
        _ => GitHubPullRequestState.Open
    };

    /// <summary>
    /// Combines still-pending review requests (shown as "waiting") with submitted reviews (mapped to
    /// their corresponding state) into the single reviewer list the API contract expects. Dismissed
    /// reviews are dropped — they've been explicitly superseded, so surfacing them as if still
    /// current would be misleading.
    /// </summary>
    private static List<PullRequestReviewer> MapReviewers(GitHubGraphQLPullRequestDetailNodeDTO node)
    {
        var reviewers = new List<PullRequestReviewer>();

        if (node.ReviewRequests is not null)
        {
            reviewers.AddRange(node.ReviewRequests.Nodes
                .Where(r => r.RequestedReviewer is not null)
                .Select(r => new PullRequestReviewer
                {
                    Reviewer = new PersonReference
                    {
                        Login = r.RequestedReviewer!.Login,
                        DisplayName = r.RequestedReviewer.Name,
                        AvatarUrl = r.RequestedReviewer.AvatarUrl
                    },
                    ReviewState = ReviewState.Waiting
                }));
        }

        if (node.Reviews is not null)
        {
            reviewers.AddRange(node.Reviews.Nodes
                .Where(r => r.Author is not null && !string.Equals(r.State, "DISMISSED", StringComparison.OrdinalIgnoreCase))
                .Select(r => new PullRequestReviewer
                {
                    Reviewer = MapAuthor(r.Author),
                    ReviewState = MapReviewState(r.State)
                }));
        }

        return reviewers;
    }

    private static ReviewState MapReviewState(string state) => state switch
    {
        "APPROVED" => ReviewState.Approved,
        "CHANGES_REQUESTED" => ReviewState.ChangesRequested,
        _ => ReviewState.Commented
    };

    private static List<CommentPreview> MapLatestComments(GitHubGraphQLCommentConnectionDTO? comments) =>
        comments?.Nodes
            .Select(c => new CommentPreview
            {
                Author = MapAuthor(c.Author),
                Body = c.Body,
                BodyFormat = ContentFormat.Markdown,
                CreatedAt = c.CreatedAt,
                Url = c.Url
            })
            .ToList() ?? [];
}
