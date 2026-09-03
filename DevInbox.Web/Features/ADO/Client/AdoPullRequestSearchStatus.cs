namespace DevInbox.Web.Features.ADO.Client;

/// <summary>
/// Azure DevOps' <c>searchCriteria.status</c> query parameter values for
/// <c>GET {organization}/{project}/_apis/git/pullrequests</c> — see
/// https://learn.microsoft.com/en-us/rest/api/azure/devops/git/pull-requests/get-pull-requests.
/// Serialized lower-camel-case to match the API's expected literal values (e.g. "notSet").
/// </summary>
public enum AdoPullRequestSearchStatus
{
    Active,
    Abandoned,
    Completed,
    All,
    NotSet
}

public static class AdoPullRequestSearchStatusExtensions
{
    /// <summary>Lower-camel-case literal Azure DevOps expects for this status in a query string (e.g. <see cref="AdoPullRequestSearchStatus.NotSet"/> → "notSet").</summary>
    public static string ToQueryValue(this AdoPullRequestSearchStatus status) => status switch
    {
        AdoPullRequestSearchStatus.Active => "active",
        AdoPullRequestSearchStatus.Abandoned => "abandoned",
        AdoPullRequestSearchStatus.Completed => "completed",
        AdoPullRequestSearchStatus.All => "all",
        AdoPullRequestSearchStatus.NotSet => "notSet",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, null)
    };

    /// <summary>
    /// Parses a pull request's own <c>status</c> field (as returned in the response body, e.g.
    /// <see cref="DTO.AdoPullRequestDTO.Status"/>) into the same enum used for the search query —
    /// the response never actually returns "all", but sharing one enum avoids a second near-duplicate
    /// type for what is otherwise the identical value set.
    /// </summary>
    public static AdoPullRequestSearchStatus ParseStatus(string? status) =>
        Enum.TryParse<AdoPullRequestSearchStatus>(status, ignoreCase: true, out var parsed)
            ? parsed
            : AdoPullRequestSearchStatus.NotSet;
}
