using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using ProductApi.Auth;
using ProductApi.Services;
using ProductApi.Tracing;

var builder = WebApplication.CreateBuilder(args);

// ───────────── 1. ĐĂNG KÝ "Ổ CẮM" VÀO DI CONTAINER ─────────────
// Controller chỉ biết IProductService. Singleton: cả ứng dụng dùng chung một kho trong RAM.
builder.Services.AddSingleton<IProductService, InMemoryProductService>();

// Hạ tầng trace: sổ ghi Scoped cho từng request, kho Singleton cho cả app
builder.Services.AddScoped<TraceRecorder>();
builder.Services.AddSingleton<TraceStore>();
builder.Services.AddScoped<TraceActionFilter>();
builder.Services.AddSingleton<IAuthorizationMiddlewareResultHandler, TracingAuthorizationResultHandler>();
builder.Services.AddSingleton<TokenService>();

builder.Services.AddControllers(o => o.Filters.AddService<TraceActionFilter>(int.MinValue));
builder.Services.AddSignalR();
builder.Services.AddOpenApi();

// ───────────── 2. AUTHENTICATION: JWT Bearer ─────────────
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
            NameClaimType = "name",
            RoleClaimType = "role",
        };
    });
builder.Services.AddAuthorization();

// Demo chạy trong mạng LAN (điện thoại quét QR) nên cho phép mọi origin.
builder.Services.AddCors(o => o.AddPolicy("Demo", p => p
    .SetIsOriginAllowed(_ => true)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()
    .WithExposedHeaders("X-Trace-Id")));

var app = builder.Build();

// ───────────── 3. PIPELINE: thứ tự ở đây chính là thứ tự request đi qua ─────────────
app.UseCors("Demo");
app.UseMiddleware<TraceMiddleware>();        // Logging --> / <-- và gom trace
app.UseMiddleware<ExceptionMiddleware>();    // đón exception → 500
app.UseStatusCodePages(async ctx =>          // 401/403/404 rỗng → có message JSON
{
    var res = ctx.HttpContext.Response;
    res.ContentType = "application/json; charset=utf-8";
    var message = res.StatusCode switch
    {
        401 => "Bạn chưa đăng nhập",
        403 => "Bạn không có quyền thực hiện thao tác này",
        404 => "Không tìm thấy đường dẫn",
        405 => "Phương thức HTTP không được hỗ trợ",
        _ => "Yêu cầu không hợp lệ",
    };
    await res.WriteAsJsonAsync(new { message });
});

app.UseRouting();
app.UseRoutingTrace();
app.UseAuthentication();                     // PHẢI đứng trước UseAuthorization
app.UseAuthenticationTrace();
app.UseAuthorization();
app.UseAuthorizationTrace();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();                                                   // /openapi/v1.json
    app.UseSwaggerUI(o => o.SwaggerEndpoint("/openapi/v1.json", "Product API"));  // /swagger
}

app.MapControllers();
app.MapHub<TraceHub>("/hubs/trace");

app.Run();
