using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;

namespace ProductApi.Tracing;

// Ghi lại trạm Routing, Authentication và "endpoint công khai" bằng các middleware nhỏ
// chen vào giữa pipeline. Xem thứ tự trong Program.cs.
public static class TracePipelineExtensions
{
    public static IApplicationBuilder UseRoutingTrace(this IApplicationBuilder app) =>
        app.Use(async (ctx, next) =>
        {
            var trace = ctx.RequestServices.GetRequiredService<TraceRecorder>();
            var endpoint = ctx.GetEndpoint();
            if (endpoint is null)
                trace.Add(Stations.Routing, "Routing không tìm thấy Endpoint", Outcomes.Block,
                    $"Không route nào khớp {ctx.Request.Method} {ctx.Request.Path} → 404 Not Found");
            else
            {
                var route = (endpoint as RouteEndpoint)?.RoutePattern.RawText ?? "?";
                var action = endpoint.Metadata.GetMetadata<ControllerActionDescriptor>();
                var target = action is null ? endpoint.DisplayName : $"{action.ControllerName}Controller.{action.ActionName}()";
                trace.Add(Stations.Routing, "Routing khớp Endpoint", Outcomes.Pass,
                    $"{ctx.Request.Method} /{route.TrimStart('/')} → {target}");
            }
            await next(ctx);
        });

    public static IApplicationBuilder UseAuthenticationTrace(this IApplicationBuilder app) =>
        app.Use(async (ctx, next) =>
        {
            var trace = ctx.RequestServices.GetRequiredService<TraceRecorder>();
            if (ctx.User.Identity?.IsAuthenticated == true)
                trace.Add(Stations.Auth, "Authentication · Bạn là ai?", Outcomes.Pass,
                    $"JWT hợp lệ: {ctx.User.FindFirstValue("name")} · vai trò {ctx.User.FindFirstValue("role")}");
            else
            {
                var hasHeader = ctx.Request.Headers.Authorization.Count > 0;
                trace.Add(Stations.Auth, "Authentication · Bạn là ai?", Outcomes.Info,
                    hasHeader ? "Token không hợp lệ hoặc đã hết hạn → khách ẩn danh" : "Không gửi token → khách ẩn danh");
            }
            await next(ctx);
        });

    public static IApplicationBuilder UseAuthorizationTrace(this IApplicationBuilder app) =>
        app.Use(async (ctx, next) =>
        {
            var trace = ctx.RequestServices.GetRequiredService<TraceRecorder>();
            if (!trace.AuthzRecorded && ctx.GetEndpoint() is not null)
                trace.Add(Stations.Auth, "Authorization · Được làm gì?", Outcomes.Pass, "Endpoint công khai, ai cũng được gọi");
            await next(ctx);
        });
}

// Ghi kết quả Authorization: thành công, 401 (chưa biết là ai) hay 403 (biết nhưng không đủ quyền).
public class TracingAuthorizationResultHandler : IAuthorizationMiddlewareResultHandler
{
    private readonly AuthorizationMiddlewareResultHandler _default = new();

    public Task HandleAsync(RequestDelegate next, HttpContext ctx, AuthorizationPolicy policy, PolicyAuthorizationResult result)
    {
        var trace = ctx.RequestServices.GetRequiredService<TraceRecorder>();
        trace.AuthzRecorded = true;
        var roles = string.Join(", ", policy.Requirements.OfType<Microsoft.AspNetCore.Authorization.Infrastructure.RolesAuthorizationRequirement>()
            .SelectMany(r => r.AllowedRoles));
        var need = roles.Length > 0 ? $"cần vai trò {roles}" : "cần đăng nhập";

        if (result.Challenged)
            trace.Add(Stations.Auth, "Authorization · Được làm gì?", Outcomes.Block,
                $"Endpoint {need} nhưng chưa biết bạn là ai → 401 Unauthorized");
        else if (result.Forbidden)
            trace.Add(Stations.Auth, "Authorization · Được làm gì?", Outcomes.Block,
                $"Bạn là {ctx.User.FindFirstValue("role")}, endpoint {need} → 403 Forbidden");
        else
            trace.Add(Stations.Auth, "Authorization · Được làm gì?", Outcomes.Pass, $"Đủ quyền ({need})");

        return _default.HandleAsync(next, ctx, policy, result);
    }
}

// Filter chạy TRƯỚC ModelStateInvalidFilter của [ApiController] (Order nhỏ nhất),
// nên kịp ghi kết quả Model Binding và Validation trước khi framework ngắt mạch 400.
public class TraceActionFilter(TraceRecorder trace) : IAsyncActionFilter, IAsyncResultFilter, IOrderedFilter
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    public int Order => int.MinValue;

    public async Task OnActionExecutionAsync(ActionExecutingContext ctx, ActionExecutionDelegate next)
    {
        var args = ctx.ActionArguments.Count == 0
            ? "Không có tham số"
            : string.Join(" · ", ctx.ActionArguments.Select(a => a.Value is Models.LoginRequest login
                ? $"{a.Key} = {{\"username\":\"{login.Username}\",\"password\":\"••••\"}}"
                : $"{a.Key} = {JsonSerializer.Serialize(a.Value, Json)}"));
        trace.Add(Stations.Controller, "Model Binding · phiên dịch", Outcomes.Pass, args);

        if (!ctx.ModelState.IsValid)
        {
            var errors = ctx.ModelState
                .Where(kv => kv.Value?.Errors.Count > 0)
                .Select(kv => $"{(kv.Key.Length == 0 ? "body" : kv.Key)}: {string.Join("; ", kv.Value!.Errors.Select(e => e.ErrorMessage))}");
            trace.Add(Stations.Controller, "Validation · vệ sĩ", Outcomes.Block,
                $"{string.Join(" | ", errors)} → 400, Action KHÔNG được gọi");
        }
        else
        {
            trace.Add(Stations.Controller, "Validation · vệ sĩ", Outcomes.Pass, "Dữ liệu hợp lệ");
            var action = ctx.ActionDescriptor as ControllerActionDescriptor;
            trace.Add(Stations.Controller, "Gọi Action", Outcomes.Pass,
                $"{action?.ControllerName}Controller.{action?.ActionName}()");
        }

        await next();
    }

    public async Task OnResultExecutionAsync(ResultExecutingContext ctx, ResultExecutionDelegate next)
    {
        await next();
        trace.Add(Stations.Controller, "Serialization · Object C# → JSON", Outcomes.Pass,
            $"{ctx.Result.GetType().Name} → {ctx.HttpContext.Response.StatusCode}", "out");
    }
}
