using System.Net;
using System.Text.Json;
using HMS.Application.Common.Exceptions;
using Microsoft.Data.SqlClient;

namespace HMS.API.Middleware;

/// <summary> Centralized exception handling (NFR) - translates Application-layer exceptions into a consistent JSON error shape. </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleAsync(context, ex);
        }
    }

    private async Task HandleAsync(HttpContext context, Exception exception)
    {
        var (statusCode, title, errors) = exception switch
        {
            NotFoundException => (HttpStatusCode.NotFound, "Resource not found.", new[] { exception.Message }),
            ValidationAppException vex => (HttpStatusCode.BadRequest, "Validation failed.", vex.Errors.SelectMany(e => e.Value).ToArray()),
            UnauthorizedAppException => (HttpStatusCode.Unauthorized, "Unauthorized.", new[] { exception.Message }),
            ForbiddenAccessException => (HttpStatusCode.Forbidden, "Forbidden.", new[] { exception.Message }),
            ConflictException => (HttpStatusCode.Conflict, "Conflict.", new[] { exception.Message }),
            // Stored procedures RAISERROR(..., 16, 1) for expected business-rule violations (bed unavailable,
            // insufficient stock, duplicate username, hospital/branch still has active children, etc.) -
            // severity 16 is our house convention for "this is a message meant for the user", so it surfaces
            // as a clean 409 instead of a generic 500. Any other SQL error class is a real server-side fault.
            SqlException sqlEx when sqlEx.Class == 16 => (HttpStatusCode.Conflict, "Conflict.", new[] { sqlEx.Message }),
            _ => (HttpStatusCode.InternalServerError, "An unexpected error occurred.", new[] { "Please try again or contact support." })
        };

        if (statusCode == HttpStatusCode.InternalServerError)
            _logger.LogError(exception, "Unhandled exception on {Path}", context.Request.Path);
        else
            _logger.LogWarning("{Title}: {Message} on {Path}", title, exception.Message, context.Request.Path);

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var payload = JsonSerializer.Serialize(new
        {
            title,
            status = (int)statusCode,
            errors,
            traceId = context.TraceIdentifier
        });

        await context.Response.WriteAsync(payload);
    }
}
