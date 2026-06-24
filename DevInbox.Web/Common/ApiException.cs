using Microsoft.AspNetCore.Http;

namespace DevInbox.Web.Common;

/// <summary>
/// Base exception that carries an HTTP status code.
/// Extend this to define domain-specific exceptions — no handler changes needed.
/// </summary>
public abstract class ApiException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

// 4xx Client errors
public class BadRequestException(string message) : ApiException(StatusCodes.Status400BadRequest, message);
public class UnauthorizedException(string message) : ApiException(StatusCodes.Status401Unauthorized, message);
public class ForbiddenException(string message) : ApiException(StatusCodes.Status403Forbidden, message);
public class NotFoundException(string message) : ApiException(StatusCodes.Status404NotFound, message);
public class ConflictException(string message) : ApiException(StatusCodes.Status409Conflict, message);

// 5xx Server errors
public class ServiceUnavailableException(string message) : ApiException(StatusCodes.Status503ServiceUnavailable, message);

public class ServiceNotImplementedException : ApiException
{
    public ServiceNotImplementedException() : base(StatusCodes.Status501NotImplemented, "This feature is not yet implemented.") { }
    public ServiceNotImplementedException(string message) : base(StatusCodes.Status501NotImplemented, message) { }
}
