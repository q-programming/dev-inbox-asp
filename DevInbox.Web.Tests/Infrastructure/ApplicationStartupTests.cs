using System.Net;

namespace DevInbox.Web.Tests.Infrastructure;

public class ApplicationStartupTests(DevInboxWebApplicationFactory factory) : IClassFixture<DevInboxWebApplicationFactory>
{
    private readonly HttpClient client = factory.CreateClient();

    [Fact(DisplayName = "Application context should start without internal server error")]
    public async Task ContextLoadShouldStartApplicationAsync()
    {
        var response = await client.GetAsync("/__context-load__");

        Assert.NotEqual(HttpStatusCode.InternalServerError, response.StatusCode);
    }
}
