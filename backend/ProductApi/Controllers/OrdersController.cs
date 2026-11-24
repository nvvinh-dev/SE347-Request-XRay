using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using ProductApi.Models;
using ProductApi.Services;
using ProductApi.Tracing;

namespace ProductApi.Controllers;

// Endpoint cho điện thoại khán giả quét QR: không cần đăng nhập.
[ApiController]
[Route("api/orders")]
public class OrdersController(IProductService service, TraceRecorder trace, IHubContext<TraceHub> hub) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<Order>> Create(CreateOrderRequest request)
    {
        var result = trace.Service($"{service.GetType().Name}.Buy()", () => service.Buy(request),
            r => r.Ok
                ? (Outcomes.Pass, $"MSSV {r.Value!.StudentId} mua {r.Value.Quantity} × {r.Value.ProductName}, còn {r.Value.StockLeft}")
                : (Outcomes.Block, $"{r.Error} → 409"));
        if (!result.Ok) return Conflict(new { message = result.Error });
        // Phát tồn kho mới cho mọi điện thoại đang mở trang mua hàng.
        await hub.Clients.All.SendAsync("products", service.GetAll());
        return StatusCode(StatusCodes.Status201Created, result.Value);
    }
}
