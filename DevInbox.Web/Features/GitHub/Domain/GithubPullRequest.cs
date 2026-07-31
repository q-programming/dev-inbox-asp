using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace DevInbox.Web.Features.GitHub.Domain;

[Table("gh_prs")]
public class GithubPullRequest
{
    public long Id { get; set; }
    [Required]
    public string GithubId { get; set; }
    public string Url { get; set; }
    public bool IsAuthor { get; set; }
    public bool IsAssignee { get; set; }
    public bool IsReviewRequested { get; set; }
    public bool IsMentioned { get; set; }
    public bool IsDraft { get; set; }
    public bool IsOpen { get; set; }
    public bool IsMerged { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

}
