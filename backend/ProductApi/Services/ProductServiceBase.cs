using ProductApi.Models;

namespace ProductApi.Services;

// Logic nghiệp vụ của kho hàng. Bản con chỉ quyết định
// dữ liệu được nạp và lưu ở đâu.
public abstract class ProductServiceBase : IProductService
{
    private readonly object _lock = new();
    protected readonly List<Product> Products;

    protected ProductServiceBase(IEnumerable<Product> initial)
    {
        Products = initial.ToList();
    }

    protected virtual void Persist() { }

    public static List<Product> Seed() =>
    [
        new() { Id = 1, Name = "Chuột không dây", Price = 250_000, Stock = 50, Icon = "🖱️" },
        new() { Id = 2, Name = "Bàn phím cơ", Price = 890_000, Stock = 20, Icon = "⌨️" },
        new() { Id = 3, Name = "Tai nghe Bluetooth", Price = 450_000, Stock = 15, Icon = "🎧" },
        new() { Id = 4, Name = "Webcam Full HD", Price = 690_000, Stock = 8, Icon = "📷" },
        new() { Id = 5, Name = "Loa mini", Price = 320_000, Stock = 3, Icon = "🔊" },
        new() { Id = 6, Name = "Đèn bàn LED", Price = 199_000, Stock = 1, Icon = "💡" },
    ];

    public IReadOnlyList<Product> GetAll()
    {
        lock (_lock) return Products.Select(Clone).ToList();
    }

    public Product? GetById(int id)
    {
        lock (_lock)
        {
            var p = Products.FirstOrDefault(x => x.Id == id);
            return p is null ? null : Clone(p);
        }
    }

    public ServiceResult<Product> Create(CreateProductRequest request)
    {
        var name = request.Name!.Trim();
        lock (_lock)
        {
            // Quy tắc nghiệp vụ: framework không biết, chỉ Service biết → 409.
            if (Products.Any(x => string.Equals(x.Name, name, StringComparison.OrdinalIgnoreCase)))
                return ServiceResult<Product>.Conflict($"Sản phẩm \"{name}\" đã tồn tại");

            var product = new Product
            {
                Id = Products.Count == 0 ? 1 : Products.Max(x => x.Id) + 1,
                Name = name,
                Price = request.Price,
                Stock = request.Stock,
                Icon = string.IsNullOrWhiteSpace(request.Icon) ? "🛍️" : request.Icon.Trim(),
            };
            Products.Add(product);
            Persist();
            return ServiceResult<Product>.Success(Clone(product));
        }
    }

    public ServiceResult<Order> Buy(CreateOrderRequest request)
    {
        lock (_lock)
        {
            var p = Products.FirstOrDefault(x => x.Id == request.ProductId);
            if (p is null) return ServiceResult<Order>.Conflict($"Không có sản phẩm mã {request.ProductId}");
            if (p.Stock < request.Quantity)
                return ServiceResult<Order>.Conflict($"\"{p.Name}\" chỉ còn {p.Stock} sản phẩm");

            p.Stock -= request.Quantity;
            Persist();
            return ServiceResult<Order>.Success(new Order(Guid.NewGuid(), p.Id, p.Name, request.Quantity,
                request.StudentId!, p.Stock, DateTime.UtcNow));
        }
    }

    // Giả lập sự cố hạ tầng (mất kết nối kho) để thấy Exception Middleware đón lỗi.
    public void SimulateCrash() =>
        throw new InvalidOperationException("Mất kết nối tới kho hàng (lỗi giả lập)");

    private static Product Clone(Product p) => new()
    { Id = p.Id, Name = p.Name, Price = p.Price, Stock = p.Stock, Icon = p.Icon };
}
