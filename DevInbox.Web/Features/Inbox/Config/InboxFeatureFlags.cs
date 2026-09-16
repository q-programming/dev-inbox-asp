namespace DevInbox.Web.Features.Inbox.Config;

/// <summary>
/// Feature flag names for the Inbox feature, checked via <see cref="Microsoft.FeatureManagement.IFeatureManager"/>.
/// Flags are configured under the "FeatureManagement" section in appsettings.json (Microsoft.FeatureManagement's
/// default convention) — no code changes needed to flip one, just configuration/environment.
/// </summary>
public static class InboxFeatureFlags
{
    /// <summary>
    /// Gates the "too broad" candidate-count guard on the inbox title search term (see
    /// <see cref="InboxSearchOptions.MaxCandidates"/> and <c>InboxItemRepository</c>). Search itself is
    /// never disabled by this flag — only whether an overly broad search is rejected up front versus
    /// always allowed to run the full decrypt-and-scan.
    /// </summary>
    public const string SearchScopeGuard = "Inbox.SearchScopeGuard";
}
