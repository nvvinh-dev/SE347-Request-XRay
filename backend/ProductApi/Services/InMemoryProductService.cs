namespace ProductApi.Services;

// Phích cắm 1: dữ liệu nằm trong RAM, tắt server là mất.
// Đăng ký Singleton nên dữ liệu được giữ giữa các request.
public class InMemoryProductService() : ProductServiceBase(Seed());
