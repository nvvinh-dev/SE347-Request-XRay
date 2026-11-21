using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using Microsoft.AspNetCore.Mvc;
using ProductApi.Tracing;

namespace ProductApi.Controllers;

[ApiController]
[Route("api")]
public class LabController : ControllerBase
{
    // GET /api/system/info: IP LAN của laptop, để trang /live tạo mã QR cho điện thoại.
    [HttpGet("system/info")]
    public IActionResult Info() => Ok(new { lanAddresses = LanAddresses() });

    [HttpGet("traces")]
    public IActionResult Traces([FromServices] TraceStore store, int take = 50) => Ok(store.Recent(Math.Clamp(take, 1, 300)));

    [HttpGet("traces/{id}")]
    public IActionResult Trace([FromServices] TraceStore store, string id) =>
        store.Get(id) is { } t ? Ok(t) : NotFound(new { message = "Chưa có trace này" });

    private static string[] LanAddresses() =>
        NetworkInterface.GetAllNetworkInterfaces()
            .Where(n => n.OperationalStatus == OperationalStatus.Up
                        && n.NetworkInterfaceType is not NetworkInterfaceType.Loopback and not NetworkInterfaceType.Tunnel
                        && !n.Description.Contains("Virtual", StringComparison.OrdinalIgnoreCase)
                        && !n.Description.Contains("Hyper-V", StringComparison.OrdinalIgnoreCase))
            .SelectMany(n => n.GetIPProperties().UnicastAddresses)
            .Where(a => a.Address.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(a.Address))
            .Select(a => a.Address.ToString())
            .Distinct()
            .ToArray();
}
