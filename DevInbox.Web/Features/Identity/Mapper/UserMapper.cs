using DevInbox.Web.Features.Identity.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using Riok.Mapperly.Abstractions;

namespace DevInbox.Web.Features.Identity;

[Mapper]
public partial class UserMapper
{
    [MapProperty("Type", "AccountType")]
    /// <summary>Ignores fields not present on the User entity.</summary>
    [MapperIgnoreSource(nameof(User.Password))]
    [MapperIgnoreTarget(nameof(UserDto.Integrations))]
    [MapperIgnoreTarget(nameof(UserDto.AdditionalProperties))]
    [MapperIgnoreSource(nameof(User.Inbox))]
    public partial UserDto ToDto(User user);
}
