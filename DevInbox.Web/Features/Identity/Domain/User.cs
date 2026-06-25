using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

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

    [Column("github_token")]
    [MaxLength(512)]
    public string? GitHubAccessToken { get; set; }

    public enum AccountType
    {
        REGULAR,
        OAUTH_GITHUB
    }
}