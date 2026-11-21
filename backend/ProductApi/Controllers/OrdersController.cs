using Microsoft.AspNetCore.Mvc;
using ProductApi.Models;
using ProductApi.Services;
using ProductApi.Tracing;

namespace ProductApi.Controllers;

// Endpoint cho điện thoại khán giả quét QR: không cần đăng nhập.
[ApiController]
[Route("api/orders")]
public class OrdersController(IProductService service, TraceRecorder trace) : ControllerBase
{
    [HttpPost]
    public ActionResult<Order> Create(CreateOrderRequest request)
    {
        var result = trace.Service($"{service.GetType().Name}.Buy()", () => service.Buy(request),
            r => r.Ok
                ? (Outcomes.Pass, $"{r.Value!.BuyerName} mua {r.Value.Quantity} × {r.Value.ProductName}, còn {r.Value.StockLeft}")
                : (Outcomes.Block, $"{r.Error} → 409"));
        if (!result.Ok) return Conflict(new { message = result.Error });
        return StatusCode(StatusCodes.Status201Created, result.Value);
    }
}
