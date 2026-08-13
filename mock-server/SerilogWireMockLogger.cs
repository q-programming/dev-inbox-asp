using Serilog;
using WireMock.Admin.Requests;
using WireMock.Logging;

namespace GitHubMockServer;

/// <summary>
/// Bridges WireMock.NET's internal logging (request matching, mapping registration, etc.) into
/// Serilog, so mock-server logs look and behave like the rest of the Dev Inbox solution
/// (structured, leveled, console output) instead of WireMock's default plain-console logger.
/// </summary>
public sealed class SerilogWireMockLogger : IWireMockLogger
{
    public void Debug(string formatString, params object[] args) =>
        Log.Debug(formatString, args);

    public void Info(string formatString, params object[] args) =>
        Log.Information(formatString, args);

    public void Warn(string formatString, params object[] args) =>
        Log.Warning(formatString, args);

    public void Error(string formatString, params object[] args) =>
        Log.Error(formatString, args);

    public void Error(string formatString, Exception exception) =>
        Log.Error(exception, formatString);

    public void DebugRequestResponse(LogEntryModel logEntryModel, bool isAdminInterface)
    {
        if (isAdminInterface)
        {
            return;
        }

        // Logged at Information (not Debug) so every incoming request is visible with the default
        // log level — makes it obvious when a call (e.g. an unmocked path) isn't matching any mapping.
        // A 404 with no matched mapping means genuinely unmocked; MappingTitle is otherwise null only
        // because our mappings don't set .WithTitle(...) — it does NOT indicate a failed match.
        var statusCode = logEntryModel.Response.StatusCode;
        var mappingLabel = logEntryModel.MappingTitle
            ?? (Equals(statusCode, 404) ? "<unmocked>" : "<matched, unnamed mapping>");

        Log.Information(
            "{Method} {Url} -> {StatusCode} (mapping: {MappingTitle})",
            logEntryModel.Request.Method,
            logEntryModel.Request.Url,
            statusCode,
            mappingLabel);
    }
}
