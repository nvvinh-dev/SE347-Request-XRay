using System.ComponentModel.DataAnnotations;

namespace ProductApi.Models;

// Model: dữ liệu thuần, không chứa logic.
public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public string Icon { get; set; } = "🛍️";
}

// Dữ liệu client gửi lên khi tạo sản phẩm (slide 13: Model Binding + Validation).
// [ApiController] tự kiểm các attribute này; sai thì trả 400, Controller không bị gọi.
public class CreateProductRequest
{
    [Required(ErrorMessage = "Tên sản phẩm không được để trống")]
    [StringLength(60, ErrorMessage = "Tên tối đa 60 ký tự")]
    public string? Name { get; set; }

    [Range(1000, 100_000_000, ErrorMessage = "Giá phải từ 1.000đ đến 100 triệu")]
    public decimal Price { get; set; }

    [Range(0, 10_000, ErrorMessage = "Tồn kho phải từ 0 đến 10.000")]
    public int Stock { get; set; }

    public string? Icon { get; set; }
}

public class CreateOrderRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "Mã sản phẩm không hợp lệ")]
    public int ProductId { get; set; }

    [Range(1, 5, ErrorMessage = "Mỗi lần mua từ 1 đến 5 sản phẩm")]
    public int Quantity { get; set; } = 1;

    // Minigame: mỗi người mua định danh bằng MSSV, đúng 8 chữ số.
    [Required(ErrorMessage = "Hãy nhập MSSV")]
    [RegularExpression(@"^\d{8}$", ErrorMessage = "MSSV phải gồm đúng 8 chữ số")]
    public string? StudentId { get; set; }
}

public record Order(Guid Id, int ProductId, string ProductName, int Quantity, string StudentId, int StockLeft, DateTime CreatedAtUtc);

public class LoginRequest
{
    [Required(ErrorMessage = "Thiếu tên đăng nhập")]
    public string? Username { get; set; }

    [Required(ErrorMessage = "Thiếu mật khẩu")]
    public string? Password { get; set; }
}

// Kết quả nghiệp vụ: Service không biết HTTP, chỉ nói "được" hay "xung đột".
public record ServiceResult<T>(T? Value, string? Error)
{
    public bool Ok => Error is null;
    public static ServiceResult<T> Success(T value) => new(value, null);
    public static ServiceResult<T> Conflict(string error) => new(default, error);
}
