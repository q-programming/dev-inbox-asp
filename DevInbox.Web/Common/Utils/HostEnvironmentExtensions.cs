namespace DevInbox.Web.Common.Utils;

/// <summary>
/// Convenience extensions for <see cref="IHostEnvironment"/> beyond the built-in
/// Development/Staging/Production checks.
/// </summary>
public static class HostEnvironmentExtensions
{
    /// <summary>
    /// Determines whether the current environment is "Local" (as opposed to
    /// "Development", "Staging" or "Production").
    /// </summary>
    /// <param name="env">The hosting environment.</param>
    /// <returns><c>true</c> if the environment name is "Local"; otherwise, <c>false</c>.</returns>
    public static bool IsLocal(this IHostEnvironment env) =>
        env.IsEnvironment("Local");
}
