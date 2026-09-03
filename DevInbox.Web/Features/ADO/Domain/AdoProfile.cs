using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Sync.Domain;

namespace DevInbox.Web.Features.ADO.Domain;

/// <summary>
/// Represents one user's connection to a single Azure DevOps organization — one row (and one PAT)
/// per organization, not per user, since Azure DevOps Personal Access Tokens are now
/// organization-scoped (Microsoft is deprecating "all accessible organizations" PATs, see
/// https://aka.ms/GlobalPATDeprecation, effective Dec 1 2026). A user who works across multiple
/// ADO organizations connects each one separately (see <see cref="AdoIntegrationService.ConnectPatAsync"/>);
/// disconnecting one organization only removes that organization's inbox items, leaving the rest intact.
/// </summary>
[Table("ado_profile")]
public class AdoProfile
{
    public long Id { get; set; }

    public long UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    /// <summary>Azure DevOps organization name this profile/PAT is scoped to, e.g. "contoso" for https://dev.azure.com/contoso.</summary>
    public string Organization { get; set; } = null!;

    /// <summary>Azure DevOps identity GUID (string, not numeric — ADO identifies identities by GUID, unlike GitHub's numeric user id).</summary>
    public string AdoUserId { get; set; } = null!;

    public string AdoLogin { get; set; } = null!;

    /// <summary>
    /// The identity's unique name/email (e.g. "jane@contoso.com"), used as a fallback match for
    /// "authored by me" inference alongside <see cref="AdoUserId"/> — some Azure DevOps
    /// organizations (notably AAD-backed ones) surface a different identity "id" from
    /// <c>_apis/connectionData</c> than the "id" embedded in work item identity-ref fields
    /// (AssignedTo/CreatedBy), while the unique name/email stays consistent across both surfaces.
    /// </summary>
    public string? AdoEmail { get; set; }

    public string? AvatarUrl { get; set; }

    [Column("ado_token")]
    [MaxLength(512)]
    public string? AccessToken { get; set; }

    /// <summary>How the stored <see cref="AccessToken"/> was obtained — determines refresh behavior.</summary>
    public IntegrationAuthMethod AuthMethod { get; set; } = IntegrationAuthMethod.Pat;

    /// <summary>
    /// Expiry date for a PAT-based token, as reported by the user at connect time. Null for
    /// OAuth-based tokens, which are refreshed automatically on every login.
    /// </summary>
    public DateTimeOffset? TokenExpiresAt { get; set; }

    /// <summary>
    /// Health of the stored token. Flipped to <see cref="IntegrationStatus.Invalid"/> when a
    /// Ado API call fails with 401 — the user must reconnect. Not the same as "expired": expiry is
    /// a known future date (PAT only); invalid means Ado  has already rejected the token.
    /// </summary>
    public IntegrationStatus Status { get; set; } = IntegrationStatus.Active;

    /// <summary>
    /// JSON-serialized cache of the projects (id + name) this profile's PAT can see within
    /// <see cref="Organization"/> — populated by <c>GET {organization}/_apis/projects</c>. Cached
    /// here so a normal sync doesn't need to re-list projects every time; refreshed on connect, on
    /// a forced full sync, or once <see cref="ProjectsSyncedAt"/> is older than the cache's TTL.
    /// </summary>
    [Column("ado_projects")]
    public string? ProjectsJson { get; set; }

    /// <summary>When <see cref="ProjectsJson"/> was last refreshed from Azure DevOps.</summary>
    public DateTimeOffset? ProjectsSyncedAt { get; set; }
}

/// <summary>A single Azure DevOps project, as cached in <see cref="AdoProfile.ProjectsJson"/> — always within <see cref="AdoProfile.Organization"/>, so it isn't tagged with an organization itself.</summary>
public sealed record AdoProjectRef(string Id, string Name);
