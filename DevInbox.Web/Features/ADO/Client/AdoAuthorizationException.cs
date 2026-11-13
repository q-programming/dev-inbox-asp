using System.Net;

namespace DevInbox.Web.Features.ADO.Client;

/// <summary>
/// Azure DevOps rejected a request with 401/403 — the PAT is revoked/expired or lacks the scope the
/// endpoint needs. <see cref="Reason"/> carries Azure DevOps' own explanation (e.g. which scope is
/// missing) so callers can log/flag the integration with a real cause instead of a bare status code.
/// Derives from <see cref="HttpRequestException"/> so the status code stays available to existing handlers.
/// </summary>
public class AdoAuthorizationException(HttpStatusCode statusCode, string requestUri, string reason)
    : HttpRequestException($"Azure DevOps rejected the request to '{requestUri}' with {(int)statusCode}: {reason}", null, statusCode)
{
    public string Reason { get; } = reason;
}
