
namespace DevInbox.Web.Features.Inbox.Exceptions;

/// <summary>
/// Thrown when a search term's candidate set (rows already scoped by userId/source/type/status/reason,
/// but before decrypting Title and matching the term — see <c>InboxItemRepository</c>) exceeds
/// <see cref="Config.InboxSearchOptions.MaxCandidates"/>. Title is encrypted at rest, so matching it can
/// only happen after decrypting every candidate row in memory — this guards against an unbounded
/// decrypt-and-scan instead of silently paying for it.
/// </summary>
public class SearchScopeTooBroadException()
    : ApiException(
        StatusCodes.Status400BadRequest,
        "Search is too broad. Narrow it by source, item type, status, or date range.",
        "SEARCH_SCOPE_TOO_BROAD");
