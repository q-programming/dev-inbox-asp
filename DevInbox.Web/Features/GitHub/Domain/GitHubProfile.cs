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
}
