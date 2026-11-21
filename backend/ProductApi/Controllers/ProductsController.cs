using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProductApi.Auth;
using ProductApi.Models;
using ProductApi.Services;
using ProductApi.Tracing;

namespace ProductApi.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _service;
    private readonly TraceRecorder _trace;

    // Không có chữ "new" nào: DI Container "bơm" service vào qua constructor (slide 15).
    public ProductsController(IProductService service, TraceRecorder trace)
    {
        _service = service;
        _trace = trace;
    }

    private string Impl => _service.GetType().Name;

    [HttpGet]
    public ActionResult<IReadOnlyList<Product>> GetAll() =>
        Ok(_trace.Service($"{Impl}.GetAll()", _service.GetAll,
            list => (Outcomes.Pass, $"Trả {list.Count} sản phẩm")));

    [HttpGet("{id:int}")]
    public ActionResult<Product> GetById(int id)
    {
        var product = _trace.Service($"{Impl}.GetById({id})", () => _service.GetById(id),
            p => p is null
                ? (Outcomes.Block, $"Không có sản phẩm id = {id} → 404")
                : (Outcomes.Pass, $"Tìm thấy: {p.Icon} {p.Name}"));
        return product is null ? NotFound(new { message = $"Không tìm thấy sản phẩm có mã {id}" }) : Ok(product);
    }

    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public ActionResult<Product> Create(CreateProductRequest request)
    {
        var result = _trace.Service($"{Impl}.Create()", () => _service.Create(request),
            r => r.Ok ? (Outcomes.Pass, $"Đã thêm id = {r.Value!.Id}") : (Outcomes.Block, $"{r.Error} → 409"));
        if (!result.Ok) return Conflict(new { message = result.Error });
        return CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value);
    }

    // Endpoint giả lập sự cố để minh họa Exception Middleware.
    [HttpGet("crash")]
    public IActionResult Crash()
    {
        _trace.Service<object?>($"{Impl}.SimulateCrash()", () => { _service.SimulateCrash(); return null; },
            _ => (Outcomes.Pass, ""));
        return Ok();
    }
}
