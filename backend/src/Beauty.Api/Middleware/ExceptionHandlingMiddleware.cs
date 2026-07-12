using Beauty.Application.DTOs.Common;
using Microsoft.EntityFrameworkCore;

namespace Beauty.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Unauthorized access attempt on {Method} {Path}", context.Request.Method, context.Request.Path);
            await WriteJsonAsync(context, StatusCodes.Status401Unauthorized, ex.Message);
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error on {Method} {Path}", context.Request.Method, context.Request.Path);
            await WriteJsonAsync(
                context,
                StatusCodes.Status500InternalServerError,
                "A database error occurred while saving changes. Please refresh and try again.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);
            var message = _environment.IsDevelopment()
                ? ex.Message
                : "An unexpected error occurred. Please try again.";
            await WriteJsonAsync(context, StatusCodes.Status500InternalServerError, message);
        }
    }

    private static async Task WriteJsonAsync(HttpContext context, int statusCode, string message)
    {
        if (context.Response.HasStarted)
            return;

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(message));
    }
}
