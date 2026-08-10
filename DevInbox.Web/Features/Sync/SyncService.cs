using DevInbox.Web.Common.Utils;
using DevInbox.Web.Features.ADO;
using DevInbox.Web.Features.GitHub;
using DevInbox.Web.Features.Inbox;
using DevInbox.Web.Features.Inbox.Domain;

namespace DevInbox.Web.Features.Sync;

public class SyncService(IInboxService inboxService, IGitHubService gitHubService, IAdoService adoService, ILogger<SyncService> logger) : ISyncService, IService
{
    public async Task SynchronizeIntegrations(long userId, string email, CancellationToken ct = default)
    {
        var inbox = await inboxService.GetUserInboxAsync(userId) ?? throw new ArgumentException("Inbox not found for user {UserId}", nameof(userId)); ;
        inbox.LastSyncStartedAt = DateTime.UtcNow;
        inbox.SyncStatus = SyncStatus.Running;
        await inboxService.UpdateAsync(inbox);
        //start sync tasks in parallel
        logger.LogInformation("Started sync tasks for user {UserId} ({Email})", userId, EmailUtils.MaskEmail(email));
        try
        {
            var githubTask = gitHubService.SyncUserPRAsync(userId, inbox.LastSyncCompletedAt, ct);
            var adoTask = adoService.SyncWorkItemsAsync(email, ct);
            await Task.WhenAll(githubTask, adoTask);
            inbox.LastSyncCompletedAt = DateTime.UtcNow;
            inbox.SyncStatus = SyncStatus.Idle;
            inbox.LastUpdatedAt = DateTime.UtcNow;
            inbox.Version++;
            await inboxService.UpdateAsync(inbox);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error occurred while synchronizing integrations for user {UserId} ({Email})", userId, EmailUtils.MaskEmail(email));
            inbox.LastSyncCompletedAt = DateTime.UtcNow;
            inbox.SyncStatus = SyncStatus.Failed;
            await inboxService.UpdateAsync(inbox);
            // TODO Notification center 
        }
    }
}
