using DevInbox.Web.Infrastructure.OpenApi.Generated;
using MsHealth = Microsoft.Extensions.Diagnostics.HealthChecks;

namespace DevInbox.Web.Infrastructure;

public class HealthController(MsHealth.HealthCheckService healthCheckService) : IHealthBaseController, IComponent
{
    /// <inheritdoc/>
    public async Task<HealthStatus> HealthCheckAsync()
    {
        var result = await healthCheckService.CheckHealthAsync();
        return new HealthStatus
        {
            Status = result.Status == MsHealth.HealthStatus.Healthy ? "UP" : "DOWN"
        };
    }
}
