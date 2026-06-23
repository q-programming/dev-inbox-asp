using System.ComponentModel.DataAnnotations.Schema;

[Table("users")]
public class User
{
    public long Id { get; set; }
    public required string Email { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}