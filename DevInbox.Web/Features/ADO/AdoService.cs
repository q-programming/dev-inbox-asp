using DevInbox.Web.Features.ADO.Client;
using DevInbox.Web.Features.Inbox.Domain;
using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Features.ADO;

public class AdoService(IAdoClient adoClient, ILogger<AdoService> logger) : IService, IAdoService
{
    public Task<AdoWorkItemDetail> GetDetailsAsync(InboxItem item, CancellationToken cancellationToken)
    {
        return Task.FromResult(new AdoWorkItemDetail
        {
            WorkItemId = item.ExternalId,
            Title = $"Work Item {item.Id}",
            WorkItemType = "Task",
            Project = "Sample Project",
            State = "Active",
            Description = "As a user, I would like to see my pull requests in the application so that I can track the work I have opened in GitHub.",
            Area = "Dev Inbox",
            Url = $"https://dev.azure.com/acme/Sample%20Project/_workitems/edit/{item.ExternalId}",
            AssignedTo = new PersonReference { DisplayName = "John Doe" },
            CreatedAt = DateTime.UtcNow.AddDays(-5),
            UpdatedAt = DateTime.UtcNow,
            Tags =
            [
                "bug",
                "backend"
            ],
            Comments =
            [
                new CommentPreview
            {
                Author = new PersonReference { DisplayName = "Jakub Romaniszyn" },
                Body = "Let's make sure the state sync also covers 'Removed' items.",
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new CommentPreview
            {
                Author = new PersonReference { DisplayName = "John Doe" },
                Body = "Will handle that in the next iteration.",
                CreatedAt = DateTime.UtcNow.AddHours(-6)
            }
            ]
        });
    }

    public async Task SyncWorkItemsAsync(
        string email,
        CancellationToken ct = default)
    {
        logger.LogInformation(
            "[ADO] Starting sync for {Email}",
            email);

        for (var i = 1; i <= 3; i++)
        {
            ct.ThrowIfCancellationRequested();

            logger.LogInformation(
                "[ADO] Fetching work item batch {Batch}",
                i);

            await Task.Delay(1500, ct);
        }

        logger.LogInformation(
            "[ADO] Synchronization completed for {Email}",
            email);
    }
}
