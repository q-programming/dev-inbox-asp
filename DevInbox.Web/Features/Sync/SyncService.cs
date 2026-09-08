using DevInbox.Web.Common.Utils;
using DevInbox.Web.Features.ADO;
using DevInbox.Web.Features.GitHub;
using DevInbox.Web.Features.Inbox;
using DevInbox.Web.Features.Sync.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.Sync;

public class SyncService(IInboxService inboxService, IServiceScopeFactory scopeFactory, ILogger<SyncService> logger) : ISyncService, IService
{
    public async Task<IReadOnlyList<InboxItemChange>> SynchronizeIntegrations(long userId, string email, TriggerType trigger, bool forceFullSync = false, CancellationToken ct = default)
    {
        var inbox = await inboxService.GetUserInboxAsync(userId) ?? throw new ArgumentException("Inbox not found for user {UserId}", nameof(userId)); ;
        inbox.LastSyncStartedAt = DateTime.UtcNow;
        inbox.SyncStatus = Inbox.Domain.SyncStatus.Running;
        await inboxService.UpdateAsync(inbox);
        //start sync tasks in parallel, each on its own DI scope so it gets its own DbContext instance
        logger.LogInformation("Started sync tasks for user {UserId} ({Email})", userId, EmailUtils.MaskEmail(email));
        try
        {
            var since = forceFullSync ? null : inbox.LastSyncCompletedAt;
            var githubTask = RunInOwnScopeAsync<IGitHubService, IReadOnlyList<InboxItemChange>>(
                (service, token) => service.SyncUserPRAsync(userId, since, token),
                ct);
            var adoTask = RunInOwnScopeAsync<IAdoService, IReadOnlyList<InboxItemChange>>(
                (service, token) => service.SyncWorkItemsAsync(userId, since, forceFullSync, token),
                ct);
            await Task.WhenAll(githubTask, adoTask);
            inbox.LastSyncCompletedAt = DateTime.UtcNow;
            inbox.SyncStatus = Inbox.Domain.SyncStatus.Idle;
            inbox.LastUpdatedAt = DateTime.UtcNow;
            inbox.Version++;
            await inboxService.UpdateAsync(inbox);
            var changedItems = githubTask.Result.Concat(adoTask.Result).ToList();
            logger.LogDebug(
                "Sync for user {UserId} ({Email}) completed with {ChangedItemsCount} new/updated item(s) (trigger: {Trigger})",
                userId, EmailUtils.MaskEmail(email), changedItems.Count, trigger);
            return changedItems;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error occurred while synchronizing integrations for user {UserId} ({Email})", userId, EmailUtils.MaskEmail(email));
            inbox.LastSyncCompletedAt = DateTime.UtcNow;
            inbox.SyncStatus = Inbox.Domain.SyncStatus.Failed;
            await inboxService.UpdateAsync(inbox);
            // TODO Notification center 
            return [];
        }
    }

    /// <summary>
    /// Resolves <typeparamref name="TService"/> in its own DI scope and runs the given operation.
    /// Prevents concurrent sync tasks from sharing (and corrupting) the same scoped DbContext instance.
    /// </summary>
    private async Task<TResult> RunInOwnScopeAsync<TService, TResult>(Func<TService, CancellationToken, Task<TResult>> operation, CancellationToken ct)
        where TService : notnull
    {
        using var scope = scopeFactory.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<TService>();
        return await operation(service, ct);
    }
}

