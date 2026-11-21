using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProductApi.Auth;
using ProductApi.Models;
using ProductApi.Tracing;

namespace ProductApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(TokenService tokens, TraceRecorder trace) : ControllerBase
{
    [HttpPost("login")]
    public IActionResult Login(LoginRequest request)
    {
        var user = trace.Service("TokenService.FindUser()", () => tokens.FindUser(request.Username!, request.Password!),
            u => u is null ? (Outcomes.Block, "Sai tên đăng nhập hoặc mật khẩu → 401") : (Outcomes.Pass, $"Cấp JWT cho {u.DisplayName}"));
        if (user is null) return Unauthorized(new { message = "Sai tên đăng nhập hoặc mật khẩu" });

        var (token, expires) = tokens.Issue(user);
        return Ok(new { token, expiresAtUtc = expires, username = user.Username, displayName = user.DisplayName, role = user.Role });
    }

    [HttpGet("me")]
    [Authorize]
    public IActionResult Me() => Ok(new
    {
        username = User.FindFirst("sub")?.Value,
        displayName = User.FindFirst("name")?.Value,
        role = User.FindFirst("role")?.Value,
    });
}
