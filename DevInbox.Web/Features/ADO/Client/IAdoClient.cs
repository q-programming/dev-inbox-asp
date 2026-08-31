using DevInbox.Web.Features.ADO.Client.DTO;

namespace DevInbox.Web.Features.ADO.Client;

public interface IAdoClient
{
    Task<string> GetWorkItemAsync(int workItemId);

    /// <summary>
    /// Resolves the profile of the PAT's owning user via <c>GET _apis/profile/profiles/me</c> —
    /// used to validate a PAT at connect time (a bad/expired PAT fails this call) and to seed the
    /// stored <see cref="Domain.AdoProfile"/>'s identity fields.
    /// </summary>
    Task<AdoUserProfileDTO> GetCurrentUserProfileAsync(string personalAccessToken, CancellationToken ct = default);
}