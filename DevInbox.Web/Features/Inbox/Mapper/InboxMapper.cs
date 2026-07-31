using DevInbox.Web.Infrastructure.OpenApi.Generated;
using Riok.Mapperly.Abstractions;

namespace DevInbox.Web.Features.Inbox.Mapper;

[Mapper]
public partial class InboxMapper
{
    [MapperIgnoreTarget(nameof(InboxPage.AdditionalProperties))]
    [MapperIgnoreSource(nameof(Domain.Inbox.User))]
    [MapperIgnoreSource(nameof(Domain.Inbox.UserId))]
    public partial InboxStatus ToStatus(Domain.Inbox inbox);
}
