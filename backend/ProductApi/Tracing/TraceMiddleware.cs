using Microsoft.AspNetCore.SignalR;

namespace ProductApi.Tracing;

// Logging Middleware (slide 10): đứng ngoài cùng, ghi log chiều vào "-->"
// và chiều ra "<--", bấm giờ cả request. Đồng thời gom trace và phát qua SignalR.
public class TraceMiddleware(RequestDelegate next, ILogger<TraceMiddleware> logger)
{
    // Tham số của InvokeAsync được DI cấp theo từng request, nên nhận được cả service Scoped.
    public async Task InvokeAsync(HttpContext ctx, TraceRecorder trace, TraceStore store, IHubContext<TraceHub> hub)
    {
        var method = ctx.Request.Method;
        var path = ctx.Request.Path.Value ?? "/";
        var shouldTrace = path.StartsWith("/api", StringComparison.OrdinalIgnoreCase)
                          && !path.StartsWith("/api/traces", StringComparison.OrdinalIgnoreCase)
                          && !HttpMethods.IsOptions(method);

        logger.LogInformation("--> {Method} {Path}", method, path);

        if (!shouldTrace)
        {
            await next(ctx);
            logger.LogInformation("<-- {Status} {Method} {Path}", ctx.Response.StatusCode, method, path);
            return;
        }

        ctx.Response.Headers["X-Trace-Id"] = trace.Id;
        var remote = $"{ctx.Connection.RemoteIpAddress}:{ctx.Connection.RemotePort}";
        trace.Add(Stations.Kestrel, "Kestrel nhận kết nối", Outcomes.Pass,
            $"{ctx.Request.Protocol} từ {remote} → cổng {ctx.Connection.LocalPort}");
        trace.Add(Stations.Middleware, "Logging Middleware · chiều vào", Outcomes.Pass, $"--> {method} {path}");

        try
        {
            await next(ctx);
        }
        finally
        {
            var status = ctx.Response.StatusCode;
            trace.Add(Stations.Middleware, "Logging Middleware · chiều ra", Outcomes.Pass,
                $"<-- {status} {method} {path} ({trace.ElapsedMs:0.00} ms)", "out");
            trace.Add(Stations.Kestrel, "Kestrel gửi response", Outcomes.Pass,
                $"{status} · {ctx.Response.ContentType ?? "không có body"}", "out");

            logger.LogInformation("<-- {Status} {Method} {Path} trong {Ms:0.00} ms", status, method, path, trace.ElapsedMs);

            var client = ctx.Request.Headers["X-Client-Name"].ToString();
            var dto = new TraceDto(trace.Id, method, path + ctx.Request.QueryString,
                string.IsNullOrWhiteSpace(client) ? "Client không tên" : client[..Math.Min(client.Length, 24)],
                status, Math.Round(trace.ElapsedMs, 3), trace.StartedAtUtc, trace.Stages.ToList());
            store.Add(dto);
            await hub.Clients.All.SendAsync("trace", dto);
        }
    }
}

// Exception Middleware: "trực sẵn đón đầu sự cố" (slide 19).
public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext ctx, TraceRecorder trace)
    {
        try
        {
            await next(ctx);
        }
        catch (Exception ex) when (!ctx.Response.HasStarted)
        {
            logger.LogError(ex, "Lỗi chưa được xử lý tại {Path}", ctx.Request.Path);
            trace.Add(Stations.Middleware, "Exception Middleware bắt lỗi", Outcomes.Error,
                $"{ex.GetType().Name} → trả 500, giấu chi tiết lỗi với client", "out");
            ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await ctx.Response.WriteAsJsonAsync(new
            {
                message = "Máy chủ gặp sự cố, vui lòng thử lại sau",
                traceId = trace.Id,
            });
        }
    }
}

public class TraceHub : Hub;
