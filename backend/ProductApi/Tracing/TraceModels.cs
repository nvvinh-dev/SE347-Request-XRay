namespace ProductApi.Tracing;

// 6 trạm trên đường đi của request, khớp sơ đồ 7 chặng ở slide 9
// (chặng 7 là đường về, ghi bằng Direction = "out").
public static class Stations
{
    public const string Kestrel = "kestrel";
    public const string Middleware = "middleware";
    public const string Routing = "routing";
    public const string Auth = "auth";
    public const string Controller = "controller";
    public const string Service = "service";
}

public static class Outcomes
{
    public const string Pass = "pass";   // đi qua bình thường
    public const string Info = "info";   // ghi chú, không chặn
    public const string Block = "block"; // trạm này ngắt mạch, request quay đầu
    public const string Error = "error"; // exception
}

public record TraceStage(string Station, string Step, string Outcome, double AtMs, string Detail, string Direction);

public record TraceDto(
    string Id,
    string Method,
    string Path,
    string Client,
    int StatusCode,
    double TotalMs,
    DateTime StartedAtUtc,
    IReadOnlyList<TraceStage> Stages);
