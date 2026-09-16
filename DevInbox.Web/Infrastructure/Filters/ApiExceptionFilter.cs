using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace DevInbox.Web.Infrastructure.Filters;

/// <summary>
/// Global exception filter — maps ApiException subclasses to RFC 9457 ProblemDetails responses.
/// Add new exception types in Common/ApiException.cs — no changes needed here.
/// Equivalent to Spring's @ControllerAdvice + @ExceptionHandler.
/// </summary>
public class ApiExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        if (context.Exception is not ApiException ex)
        {
            return;
        }

        var problemDetails = new ProblemDetails
        {
            Status = ex.StatusCode,
            Title = ex.Message
        };

        if (ex.ErrorCode is not null)
        {
            problemDetails.Extensions["errorCode"] = ex.ErrorCode;
        }

        context.Result = new ObjectResult(problemDetails)
        {
            StatusCode = ex.StatusCode
        };

        context.ExceptionHandled = true;
    }
}
