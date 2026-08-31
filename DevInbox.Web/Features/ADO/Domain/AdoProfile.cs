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
}