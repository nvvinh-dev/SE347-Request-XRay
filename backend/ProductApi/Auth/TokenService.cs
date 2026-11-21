using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace ProductApi.Auth;

public static class Roles
{
    public const string Admin = "Admin";
    public const string Customer = "Customer";
}

public record DemoUser(string Username, string Password, string Role, string DisplayName);

// Tài khoản demo đọc từ appsettings.json (mục DemoUsers), không viết cứng trong code.
// Chỉ dùng cho seminar: mật khẩu để dạng rõ cho dễ trình bày.
public class TokenService(IConfiguration config)
{
    public DemoUser? FindUser(string username, string password) =>
        config.GetSection("DemoUsers").Get<List<DemoUser>>()?
            .FirstOrDefault(u => u.Username == username.Trim().ToLowerInvariant() && u.Password == password);

    public (string Token, DateTime ExpiresAtUtc) Issue(DemoUser user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var expires = DateTime.UtcNow.AddHours(4);
        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims:
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.Username),
                new Claim("name", user.DisplayName),
                new Claim("role", user.Role),
            ],
            expires: expires,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}
