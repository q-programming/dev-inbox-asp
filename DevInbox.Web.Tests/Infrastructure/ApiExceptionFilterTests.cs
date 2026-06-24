using DevInbox.Web.Common;
using DevInbox.Web.Infrastructure.Filters;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;

namespace DevInbox.Web.Tests.Infrastructure;

public class ApiExceptionFilterTests
{
    private static ExceptionContext BuildContext(Exception exception)
    {
        var actionContext = new ActionContext(
            new DefaultHttpContext(),
            new RouteData(),
            new ActionDescriptor());

        return new ExceptionContext(actionContext, []) { Exception = exception };
    }

    [Fact(DisplayName = "OnException maps ApiException to ProblemDetails with correct status and title")]
    public void OnExceptionMapsApiExceptionToProblemDetails()
    {
        var filter = new ApiExceptionFilter();
        var context = BuildContext(new NotFoundException("Resource not found"));

        filter.OnException(context);

        var result = Assert.IsType<ObjectResult>(context.Result);
        var problem = Assert.IsType<ProblemDetails>(result.Value);

        Assert.True(context.ExceptionHandled);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
        Assert.Equal("Resource not found", problem.Title);
    }

    [Fact(DisplayName = "OnException does not handle non-ApiException")]
    public void OnExceptionDoesNotHandleNonApiException()
    {
        var filter = new ApiExceptionFilter();
        var context = BuildContext(new InvalidOperationException("something broke"));

        filter.OnException(context);

        Assert.Null(context.Result);
        Assert.False(context.ExceptionHandled);
    }

    [Theory(DisplayName = "OnException maps correct status code for each ApiException subclass")]
    [InlineData(typeof(BadRequestException), StatusCodes.Status400BadRequest)]
    [InlineData(typeof(UnauthorizedException), StatusCodes.Status401Unauthorized)]
    [InlineData(typeof(ForbiddenException), StatusCodes.Status403Forbidden)]
    [InlineData(typeof(NotFoundException), StatusCodes.Status404NotFound)]
    [InlineData(typeof(ConflictException), StatusCodes.Status409Conflict)]
    [InlineData(typeof(ServiceUnavailableException), StatusCodes.Status503ServiceUnavailable)]
    public void OnExceptionMapsCorrectStatusCodeForEachSubclass(Type exceptionType, int expectedStatus)
    {
        var filter = new ApiExceptionFilter();
        var ex = (ApiException)Activator.CreateInstance(exceptionType, "msg")!;
        var context = BuildContext(ex);

        filter.OnException(context);

        var result = Assert.IsType<ObjectResult>(context.Result);
        Assert.Equal(expectedStatus, result.StatusCode);
    }
}
