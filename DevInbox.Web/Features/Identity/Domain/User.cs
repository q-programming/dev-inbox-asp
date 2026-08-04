using System.ComponentModel.DataAnnotations.Schema;
using DevInbox.Web.Features.GitHub.Domain;

namespace DevInbox.Web.Features.Identity.Domain;

[Table("users")]
[Index(nameof(Email), IsUnique = true)]
public class User
{
    public long Id { get; set; }
    public required string Email { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Password { get; set; }
    public AccountType? Type { get; set; } = AccountType.REGULAR;
    public GitHubProfile? GitHubProfile { get; set; }
    public Inbox.Domain.Inbox Inbox { get; set; } = null!;

    public enum AccountType
    {
        REGULAR,
        OAUTH_GITHUB
    }
}
