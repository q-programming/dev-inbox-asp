using DevInbox.Web.Features.ADO;
using DevInbox.Web.Features.ADO.Client;
using DevInbox.Web.Features.ADO.Client.DTO;
using DevInbox.Web.Features.ADO.Config;
using DevInbox.Web.Features.ADO.Domain;
using DevInbox.Web.Features.Inbox.Domain;
using DomainIntegrationStatus = DevInbox.Web.Features.Sync.Domain.IntegrationStatus;
using Microsoft.Extensions.Options;
using NSubstitute;

namespace DevInbox.Web.Tests.Features.ADO;

/// <summary>Tests for <see cref="AdoService.GetDetailsAsync"/> — fetching full work item / pull request details for the inbox detail view.</summary>
public class AdoServiceTests
{
    private const long UserId = 42;
    private const string Pat = "ado_pat_123";

    private readonly IAdoProfileRepository _profileRepository;
    private readonly IInboxItemRepository _inboxItemRepository;
    private readonly IAdoClient _adoClient;
    private readonly AdoService _service;

    public AdoServiceTests()
    {
        _profileRepository = Substitute.For<IAdoProfileRepository>();
        _inboxItemRepository = Substitute.For<IInboxItemRepository>();
        _adoClient = Substitute.For<IAdoClient>();
        _service = new AdoService(
            _profileRepository,
            _inboxItemRepository,
            _adoClient,
            Options.Create(new AdoOptions()),
            Substitute.For<ILogger<AdoService>>());

        _profileRepository.GetByUserIdAndOrganizationAsync(UserId, "contoso").Returns(new AdoProfile
        {
            UserId = UserId,
            Organization = "contoso",
            AdoUserId = "ado-user-1",
            AdoLogin = "Jane Doe",
            AccessToken = Pat,
            Status = DomainIntegrationStatus.Active
        });
    }

    [Fact(DisplayName = "GetDetailsAsync should fetch and map a work item's full details, including description, parent and comments")]
    public async Task GetDetailsAsyncShouldReturnWorkItemDetailsAsync()
    {
        var item = new InboxItem
        {
            Id = 1,
            InboxId = UserId,
            Type = ItemType.WorkItem,
            Repository = "contoso/Alpha",
            ExternalId = "501"
        };

        _adoClient.GetWorkItemDetailAsync(Pat, "contoso", 501, Arg.Any<CancellationToken>()).Returns(new AdoWorkItemDTO
        {
            Id = 501,
            Fields = new AdoWorkItemFieldsDTO
            {
                Title = "Implement inbox sync retry policy",
                WorkItemType = "User Story",
                State = "Active",
                TeamProject = "Alpha",
                AreaPath = "Alpha\\Backend",
                Tags = "backend; sync",
                Description = "Full work item description",
                AssignedTo = new AdoIdentityRefDTO { DisplayName = "John Doe", UniqueName = "john@doe.com" },
                CreatedDate = new DateTimeOffset(2026, 1, 10, 9, 0, 0, TimeSpan.Zero),
                ChangedDate = new DateTimeOffset(2026, 1, 14, 15, 30, 0, TimeSpan.Zero)
            },
            Relations = [new AdoWorkItemRelationDTO { Rel = "System.LinkTypes.Hierarchy-Reverse", Url = "https://dev.azure.com/contoso/_apis/wit/workitems/400" }]
        });
        _adoClient.GetWorkItemCommentsAsync(Pat, "contoso", "Alpha", 501, Arg.Any<CancellationToken>()).Returns(
        [
            new AdoWorkItemCommentDTO { Text = "Looks good", CreatedBy = new AdoIdentityRefDTO { DisplayName = "Jane Smith" }, CreatedDate = new DateTimeOffset(2026, 1, 13, 0, 0, 0, TimeSpan.Zero) }
        ]);

        var result = await _service.GetDetailsAsync(item, CancellationToken.None);

        Assert.Equal("501", result.WorkItemId);
        Assert.Equal("Alpha", result.Project);
        Assert.Equal("Implement inbox sync retry policy", result.Title);
        Assert.Equal("User Story", result.WorkItemType);
        Assert.Equal("Active", result.State);
        Assert.Equal("Full work item description", result.Description);
        Assert.Equal("Alpha\\Backend", result.Area);
        Assert.Equal("John Doe", result.AssignedTo.DisplayName);
        Assert.Contains("backend", result.Tags);
        Assert.Contains("sync", result.Tags);
        Assert.NotNull(result.Parent);
        Assert.Equal("400", result.Parent.Id);
        Assert.Equal("https://dev.azure.com/contoso/Alpha/_workitems/edit/501", result.Url);
        Assert.Single(result.Comments);
        Assert.Equal("Looks good", result.Comments[0].Body);
        Assert.Equal("Jane Smith", result.Comments[0].Author.DisplayName);
    }

    [Fact(DisplayName = "GetDetailsAsync should fetch and map a pull request's full details, filtering out system-generated thread comments")]
    public async Task GetDetailsAsyncShouldReturnPullRequestDetailsAsync()
    {
        var item = new InboxItem
        {
            Id = 2,
            InboxId = UserId,
            Type = ItemType.PR,
            Repository = "contoso/Alpha/alpha-service",
            ExternalId = "2101"
        };

        _adoClient.GetPullRequestDetailAsync(Pat, "contoso", "Alpha", "alpha-service", 2101, Arg.Any<CancellationToken>()).Returns(new AdoPullRequestDTO
        {
            PullRequestId = 2101,
            Title = "Add ADO organization discovery",
            Status = "active",
            Description = "Adds discovery + probe logic for multi-org support.",
            CreationDate = new DateTimeOffset(2026, 1, 13, 10, 0, 0, TimeSpan.Zero),
            CreatedBy = new AdoIdentityRefDTO { DisplayName = "John Doe", UniqueName = "john@doe.com" }
        });
        _adoClient.GetPullRequestThreadsAsync(Pat, "contoso", "Alpha", "alpha-service", 2101, Arg.Any<CancellationToken>()).Returns(
        [
            new AdoPullRequestThreadDTO
            {
                Comments =
                [
                    new AdoPullRequestCommentDTO { Content = "LGTM", Author = new AdoIdentityRefDTO { DisplayName = "Jane Smith" }, CommentType = "text" },
                    new AdoPullRequestCommentDTO { Content = "voted 10", Author = new AdoIdentityRefDTO { DisplayName = "Jane Smith" }, CommentType = "system" }
                ]
            }
        ]);

        var result = await _service.GetDetailsAsync(item, CancellationToken.None);

        Assert.Equal("2101", result.WorkItemId);
        Assert.Equal("Alpha", result.Project);
        Assert.Equal("Add ADO organization discovery", result.Title);
        Assert.Equal("Pull Request", result.WorkItemType);
        Assert.Equal("active", result.State);
        Assert.Equal("Adds discovery + probe logic for multi-org support.", result.Description);
        Assert.Equal("alpha-service", result.Area);
        Assert.Equal("John Doe", result.AssignedTo.DisplayName);
        Assert.Equal("https://dev.azure.com/contoso/Alpha/_git/alpha-service/pullrequest/2101", result.Url);
        Assert.Single(result.Comments);
        Assert.Equal("LGTM", result.Comments[0].Body);
    }

    [Fact(DisplayName = "GetDetailsAsync should throw when the inbox item has no repository/organization reference")]
    public async Task GetDetailsAsyncShouldThrowWhenRepositoryMissingAsync()
    {
        var item = new InboxItem { Id = 3, InboxId = UserId, Type = ItemType.WorkItem, ExternalId = "501", Repository = null };

        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.GetDetailsAsync(item, CancellationToken.None));
    }
}
