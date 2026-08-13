using DevInbox.Web.Features.Inbox.Domain;

namespace DevInbox.Web.Infrastructure.Events;

public record IntegrationDisconnectedEvent(long UserId, ItemSource Source) : IEvent;