namespace DevInbox.Web.Features.ADO.Config;

public class AdoOptions
{
    public const string SectionName = "ADO";

    /// <summary>
    /// Azure DevOps API base address. A trailing slash is enforced (see
    /// <see cref="NormalizedBaseAddress"/>) since HttpClient's relative-URI combining drops the
    /// base's last path segment when it doesn't end in "/" — without this, a mock BaseUrl like
    /// "http://localhost:8089/ado" would silently lose the "/ado" prefix on every relative request.
    /// </summary>
    public string BaseUrl { get; set; } = "https://dev.azure.com";

    /// <summary><see cref="BaseUrl"/> guaranteed to end with "/" so relative paths append correctly.</summary>
    public string NormalizedBaseAddress => BaseUrl.EndsWith('/') ? BaseUrl : $"{BaseUrl}/";

    /// <summary>
    /// Base address for Azure DevOps' account-management APIs (profile lookup, org discovery via
    /// accounts-by-member). These are NOT organization-scoped and are served from a different host
    /// than <see cref="BaseUrl"/> — real Azure DevOps returns a 404 if
    /// "_apis/profile/profiles/me" or "_apis/accounts" are requested against "dev.azure.com".
    /// See https://learn.microsoft.com/en-us/rest/api/azure/devops/profile/profiles/get and
    /// https://learn.microsoft.com/en-us/rest/api/azure/devops/account/accounts/list.
    /// </summary>
    public string AccountsBaseUrl { get; set; } = "https://app.vssps.visualstudio.com";

    /// <summary><see cref="AccountsBaseUrl"/> guaranteed to end with "/" so relative paths append correctly.</summary>
    public string NormalizedAccountsBaseAddress => AccountsBaseUrl.EndsWith('/') ? AccountsBaseUrl : $"{AccountsBaseUrl}/";

    /// <summary>
    /// How many days of history a first-ever ("initial") work item sync looks back — mirrors
    /// GitHub's "open PRs only" initial-sync bound, but work items have no universal "open" state
    /// across Azure DevOps process templates (Agile/Scrum/Basic/CMMI all name theirs differently),
    /// so a rolling date cutoff is used instead: old, stale-but-technically-open items from before
    /// the user started using Dev Inbox aren't worth pulling on day one, and this also caps the
    /// initial sync's response payload/call cost regardless of how long the project has existed.
    /// Pull requests don't need this — they use the "active" status filter instead (see
    /// <see cref="Client.AdoPullRequestSearchStatus"/>), which is a well-defined ADO concept.
    /// </summary>
    public int InitialSyncLookbackDays { get; set; } = 180;
}