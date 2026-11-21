using ProductApi.Models;

namespace ProductApi.Services;

// "Ổ cắm" (slide 15). Controller chỉ biết interface này,
// không biết bản cài đặt bên dưới lưu dữ liệu ở đâu.
public interface IProductService
{
    IReadOnlyList<Product> GetAll();
    Product? GetById(int id);
    ServiceResult<Product> Create(CreateProductRequest request);
    ServiceResult<Order> Buy(CreateOrderRequest request);
    void SimulateCrash();
}
