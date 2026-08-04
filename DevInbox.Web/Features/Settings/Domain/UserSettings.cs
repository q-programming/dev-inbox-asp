using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using DevInbox.Web.Features.Identity.Domain;

namespace DevInbox.Web.Features.Settings.Domain;

[Table("settings")]
public class UserSettings
{
    public long Id { get; set; }

    public Theme Theme { get; set; }

    public Density Density { get; set; }

    public int FontSize { get; set; }

    public bool SideBarCollapsed { get; set; }

    [Required]
    public long UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    [Required]
    public required User User { get; set; }
}