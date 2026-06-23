using DevInbox.Web.Infrastructure.OpenApi.Generated;

namespace DevInbox.Web.Infrastructure;

public class HealthController : IHealthBaseController, IComponent
{
    public Task<HealthStatus> HealthCheckAsync()
        => Task.FromResult(new HealthStatus { Status = "UP" });
}
