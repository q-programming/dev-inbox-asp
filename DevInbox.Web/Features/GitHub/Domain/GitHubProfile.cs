using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using DevInbox.Web.Features.Identity.Domain;

namespace DevInbox.Web.Features.GitHub.Domain;

[Table("gh_profile")]
public class GitHubProfile
{
    public long Id { get; set; }

    public long UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    public long GitHubUserId { get; set; }

    public string GitHubLogin { get; set; } = null!;

    public string? AvatarUrl { get; set; }

    [Column("github_token")]
    [MaxLength(512)]
    public string? AccessToken { get; set; }

    /// <summary>How the stored <see cref="AccessToken"/> was obtained — determines refresh behavior.</summary>
    public GitHubAuthMethod AuthMethod { get; set; } = GitHubAuthMethod.OAuthApp;

    /// <summary>
    /// Expiry date for a PAT-based token, as reported by the user at connect time. Null for
    /// OAuth-based tokens, which are refreshed automatically on every login.
    /// </summary>
    public DateTimeOffset? TokenExpiresAt { get; set; }

    /// <summary>
    /// Health of the stored token. Flipped to <see cref="GitHubIntegrationStatus.Invalid"/> when a
    /// GitHub API call fails with 401 — the user must reconnect. Not the same as "expired": expiry is
    /// a known future date (PAT only); invalid means GitHub has already rejected the token.
    /// </summary>
    public GitHubIntegrationStatus Status { get; set; } = GitHubIntegrationStatus.Active;
}

/// <summary>Distinguishes a manually-supplied Personal Access Token from an OAuth App-issued token.</summary>
public enum GitHubAuthMethod
{
    Pat,
    OAuthApp
}

public enum GitHubIntegrationStatus
{
    Active,
    Invalid
}
