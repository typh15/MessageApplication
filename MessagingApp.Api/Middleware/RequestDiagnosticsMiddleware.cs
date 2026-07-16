using System.Diagnostics;

public sealed class RequestDiagnosticsMiddleware
{
    public const string RequestIdHeaderName = "X-Request-Id";

    private readonly RequestDelegate next;
    private readonly ILogger<RequestDiagnosticsMiddleware> logger;

    public RequestDiagnosticsMiddleware(
        RequestDelegate next,
        ILogger<RequestDiagnosticsMiddleware> logger)
    {
        this.next = next;
        this.logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var requestId = GetOrCreateRequestId(context);
        context.TraceIdentifier = requestId;
        context.Response.OnStarting(() =>
        {
            context.Response.Headers[RequestIdHeaderName] = requestId;
            return Task.CompletedTask;
        });

        using var scope = logger.BeginScope(new Dictionary<string, object>
        {
            ["RequestId"] = requestId
        });

        var stopwatch = Stopwatch.StartNew();

        try
        {
            await next(context);
            stopwatch.Stop();

            TryLogCompletedRequest(context, stopwatch.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            TryLogUnhandledException(context, ex, stopwatch.ElapsedMilliseconds);

            if (context.Response.HasStarted)
            {
                throw;
            }

            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "unexpected_error",
                message = "An unexpected server error occurred.",
                requestId
            });
        }
    }

    private static string GetOrCreateRequestId(HttpContext context)
    {
        var submittedRequestId =
            context.Request.Headers[RequestIdHeaderName].FirstOrDefault();

        if (!string.IsNullOrWhiteSpace(submittedRequestId))
        {
            return submittedRequestId.Trim();
        }

        return Activity.Current?.Id ?? Guid.NewGuid().ToString("N");
    }

    private void TryLogCompletedRequest(HttpContext context, long elapsedMilliseconds)
    {
        try
        {
            LogCompletedRequest(context, elapsedMilliseconds);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(
                $"Request completion logging failed for {context.Request.Method} {context.Request.Path}: {ex.Message}");
        }
    }

    private void TryLogUnhandledException(
        HttpContext context,
        Exception exception,
        long elapsedMilliseconds)
    {
        try
        {
            logger.LogError(
                exception,
                "Unhandled exception for {Method} {Path}. Status {StatusCode}. Duration {ElapsedMilliseconds} ms.",
                context.Request.Method,
                context.Request.Path,
                StatusCodes.Status500InternalServerError,
                elapsedMilliseconds);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(
                $"Unhandled-exception logging failed for {context.Request.Method} {context.Request.Path}: {ex.Message}");
        }
    }

    private void LogCompletedRequest(HttpContext context, long elapsedMilliseconds)
    {
        var statusCode = context.Response.StatusCode;
        var logLevel = statusCode >= StatusCodes.Status500InternalServerError
            ? LogLevel.Error
            : statusCode >= StatusCodes.Status400BadRequest
                ? LogLevel.Warning
                : LogLevel.Debug;

        logger.Log(
            logLevel,
            "Completed {Method} {Path} with status {StatusCode} in {ElapsedMilliseconds} ms.",
            context.Request.Method,
            context.Request.Path,
            statusCode,
            elapsedMilliseconds);
    }
}
