using DevInbox.Web.Infrastructure.OpenApi.Generated;
using Riok.Mapperly.Abstractions;

namespace DevInbox.Web.Features.Identity;

[Mapper]
public partial class UserMapper
{
    /// <summary>Ignores fields not present on the User entity.</summary>
    [MapperIgnoreTarget(nameof(UserDto.Integrations))]
    [MapperIgnoreTarget(nameof(UserDto.AccountType))]
    [MapperIgnoreTarget(nameof(UserDto.AdditionalProperties))]
    public partial UserDto ToDto(User user);
}
