using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Features.Sync.Domain;

namespace DevInbox.Web.Features.ADO.Domain;

[Table("ado_profile")]
public class AdoProfile
{
    public long Id { get; set; }

    public long UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    /// <summary>Azure DevOps profile GUID (string, not numeric — ADO identifies profiles by GUID, unlike GitHub's numeric user id).</summary>
    public string AdoUserId { get; set; } = null!;

    public string AdoLogin { get; set; } = null!;

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
    /// JSON-serialized cache of the Azure DevOps organizations this user's PAT can actually reach —
    /// a union of what was auto-discovered via the accounts API (<c>GET _apis/accounts?memberId=</c>)
    /// and any organizations the user added manually. A PAT can be scoped to a single organization,
    /// so this must not be assumed complete from discovery alone; each candidate organization is
    /// probed (a cheap "list projects" call) before being kept in this list. Refreshed on connect,
    /// on a forced full sync, or once <see cref="OrganizationsSyncedAt"/> is older than the cache's
    /// TTL.
    /// </summary>
    [Column("ado_organizations")]
    public string? OrganizationsJson { get; set; }

    /// <summary>When <see cref="OrganizationsJson"/> was last refreshed/probed.</summary>
    public DateTimeOffset? OrganizationsSyncedAt { get; set; }

    /// <summary>
    /// JSON-serialized cache of the Azure DevOps projects (organization + id + name) this user's PAT
    /// can see across every usable organization — populated by <c>GET {org}/_apis/projects</c> for
    /// each organization in <see cref="OrganizationsJson"/>. Cached here so a normal sync doesn't
    /// need to re-list projects every time; refreshed on connect, on a forced full sync, or once
    /// <see cref="ProjectsSyncedAt"/> is older than the cache's TTL.
    /// </summary>
    [Column("ado_projects")]
    public string? ProjectsJson { get; set; }

    /// <summary>When <see cref="ProjectsJson"/> was last refreshed from Azure DevOps.</summary>
    public DateTimeOffset? ProjectsSyncedAt { get; set; }
}

/// <summary>A single Azure DevOps organization the user's PAT can reach, as cached in <see cref="AdoProfile.OrganizationsJson"/>.</summary>
public sealed record AdoOrganizationRef(string Name);

/// <summary>A single Azure DevOps project, as cached in <see cref="AdoProfile.ProjectsJson"/> — tagged with its owning organization since projects across organizations are no longer disambiguated by a single profile-level org.</summary>
public sealed record AdoProjectRef(string Organization, string Id, string Name);