using DevInbox.Web.Features.Settings.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;
using Riok.Mapperly.Abstractions;

namespace DevInbox.Web.Features.Settings.Mapping;

[Mapper]
public partial class SettingsMapper
{
    /// <summary>Ignores fields not present on the User entity.</summary>
    [MapperIgnoreTarget(nameof(UserSettingsDto.AdditionalProperties))]
    [MapperIgnoreTarget(nameof(UserSettingsDto.GithubRepos))]
    [MapperIgnoreTarget(nameof(UserSettingsDto.AdoOrganization))]
    [MapperIgnoreTarget(nameof(UserSettingsDto.AdoProject))]
    [MapperIgnoreTarget(nameof(UserSettingsDto.SyncIntervalMinutes))]
    [MapperIgnoreSource(nameof(UserSettings.Id))]
    [MapperIgnoreSource(nameof(UserSettings.User))]
    [MapperIgnoreSource(nameof(UserSettings.UserId))]
    public partial UserSettingsDto ToDto(UserSettings user);

    /// <summary>Applies mutable fields from an incoming update request onto an existing, already-tracked entity.
    /// Never constructs a new UserSettings here — Id/UserId/User must stay untouched and are set only at creation.</summary>
    [MapperIgnoreTarget(nameof(UserSettings.Id))]
    [MapperIgnoreTarget(nameof(UserSettings.UserId))]
    [MapperIgnoreTarget(nameof(UserSettings.User))]
    [MapperIgnoreSource(nameof(UserSettingsDto.AdditionalProperties))]
    [MapperIgnoreSource(nameof(UserSettingsDto.GithubRepos))]
    [MapperIgnoreSource(nameof(UserSettingsDto.AdoOrganization))]
    [MapperIgnoreSource(nameof(UserSettingsDto.AdoProject))]
    [MapperIgnoreSource(nameof(UserSettingsDto.SyncIntervalMinutes))]
    public partial void UpdateFromDto(UserSettingsDto dto, UserSettings target);



}