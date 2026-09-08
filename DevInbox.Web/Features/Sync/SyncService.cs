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
        var since = forceFullSync ? null : inbox.LastSyncCompletedAt;
        // Each integration's task is isolated so one provider failing (e.g. a GitHub rate limit)
        // never discards the other's already-successful results — `Task.WhenAll` on the raw
        // service calls would fault as soon as either one throws, and previously an outer
        // try/catch swallowed BOTH results in that case even when only one had actually failed.
        var githubTask = RunIntegrationAsync<IGitHubService>(
            "GitHub",
            userId,
            email,
            (service, token) => service.SyncUserPRAsync(userId, since, token),
            ct);
        var adoTask = RunIntegrationAsync<IAdoService>(
            "Azure DevOps",
            userId,
            email,
            (service, token) => service.SyncWorkItemsAsync(userId, since, forceFullSync, token),
            ct);

        var results = await Task.WhenAll(githubTask, adoTask);
        var changedItems = results.SelectMany(r => r.Items).ToList();
        var anyFailed = results.Any(r => !r.Succeeded);

        inbox.LastSyncCompletedAt = DateTime.UtcNow;
        inbox.SyncStatus = anyFailed ? Inbox.Domain.SyncStatus.Failed : Inbox.Domain.SyncStatus.Idle;
        inbox.LastUpdatedAt = DateTime.UtcNow;
        inbox.Version++;
        await inboxService.UpdateAsync(inbox);
        logger.LogDebug(
            "Sync for user {UserId} ({Email}) completed with {ChangedItemsCount} new/updated item(s) (trigger: {Trigger})",
            userId, EmailUtils.MaskEmail(email), changedItems.Count, trigger);
        return changedItems;
    }

    /// <summary>
    /// Runs a single integration's sync in its own scope, isolating failures so one provider
    /// erroring (e.g. rate limiting) doesn't discard results from another that succeeded.
    /// Never throws — a failure is reported via <see cref="IntegrationSyncResult.Succeeded"/>
    /// (with an empty item list) so the caller can still mark the inbox status accordingly
    /// while keeping whatever the other integration produced.
    /// </summary>
    private async Task<IntegrationSyncResult> RunIntegrationAsync<TService>(
        string integrationName,
        long userId,
        string email,
        Func<TService, CancellationToken, Task<IReadOnlyList<InboxItemChange>>> operation,
        CancellationToken ct)
        where TService : notnull
    {
        try
        {
            var items = await RunInOwnScopeAsync(operation, ct);
            return new IntegrationSyncResult(true, items);
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Error occurred while synchronizing {Integration} for user {UserId} ({Email})",
                integrationName, userId, EmailUtils.MaskEmail(email));
            // TODO Notification center
            return new IntegrationSyncResult(false, []);
        }
    }

    private readonly record struct IntegrationSyncResult(bool Succeeded, IReadOnlyList<InboxItemChange> Items);

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

