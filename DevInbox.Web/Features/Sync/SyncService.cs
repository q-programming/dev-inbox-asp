using DevInbox.Web.Common.Utils;
using DevInbox.Web.Features.ADO;
using DevInbox.Web.Features.GitHub;
using DevInbox.Web.Features.Inbox;
using DevInbox.Web.Features.Inbox.Domain;

namespace DevInbox.Web.Features.Sync;

public class SyncService(IInboxService inboxService, IServiceScopeFactory scopeFactory, ILogger<SyncService> logger) : ISyncService, IService
{
    public async Task SynchronizeIntegrations(long userId, string email, bool forceFullSync = false, CancellationToken ct = default)
    {
        var inbox = await inboxService.GetUserInboxAsync(userId) ?? throw new ArgumentException("Inbox not found for user {UserId}", nameof(userId)); ;
        inbox.LastSyncStartedAt = DateTime.UtcNow;
        inbox.SyncStatus = SyncStatus.Running;
        await inboxService.UpdateAsync(inbox);
        //start sync tasks in parallel, each on its own DI scope so it gets its own DbContext instance
        logger.LogInformation("Started sync tasks for user {UserId} ({Email})", userId, EmailUtils.MaskEmail(email));
        try
        {
            var since = forceFullSync ? null : inbox.LastSyncCompletedAt;
            var githubTask = RunInOwnScopeAsync<IGitHubService>(
                (service, token) => service.SyncUserPRAsync(userId, since, token),
                ct);
            var adoTask = RunInOwnScopeAsync<IAdoService>(
                (service, token) => service.SyncWorkItemsAsync(userId, since, forceFullSync, token),
                ct);
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

    /// <summary>
    /// Resolves <typeparamref name="TService"/> in its own DI scope and runs the given operation.
    /// Prevents concurrent sync tasks from sharing (and corrupting) the same scoped DbContext instance.
    /// </summary>
    private async Task RunInOwnScopeAsync<TService>(Func<TService, CancellationToken, Task> operation, CancellationToken ct)
        where TService : notnull
    {
        using var scope = scopeFactory.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<TService>();
        await operation(service, ct);
    }
}
