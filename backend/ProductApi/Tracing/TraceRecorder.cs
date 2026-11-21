using System.Collections.Concurrent;
using System.Diagnostics;

namespace ProductApi.Tracing;

// Đăng ký SCOPED: mỗi HTTP request có đúng một "cuốn sổ" riêng (slide 15).
// Middleware, filter và Controller trong cùng request đều nhận cùng một instance.
public class TraceRecorder
{
    private readonly long _start = Stopwatch.GetTimestamp();
    private readonly List<TraceStage> _stages = [];

    public string Id { get; } = Guid.NewGuid().ToString("N")[..8];
    public DateTime StartedAtUtc { get; } = DateTime.UtcNow;
    public bool AuthzRecorded { get; set; }

    public double ElapsedMs => Stopwatch.GetElapsedTime(_start).TotalMilliseconds;
    public IReadOnlyList<TraceStage> Stages => _stages;

    public void Add(string station, string step, string outcome, string detail = "", string direction = "in")
    {
        _stages.Add(new TraceStage(station, step, outcome, Math.Round(ElapsedMs, 3), detail, direction));
    }

    // Controller gọi Service qua hàm này để trạm Service có số ms riêng.
    public T Service<T>(string call, Func<T> work, Func<T, (string Outcome, string Detail)> describe)
    {
        try
        {
            var result = work();
            var (outcome, detail) = describe(result);
            Add(Stations.Service, call, outcome, detail);
            return result;
        }
        catch (Exception ex)
        {
            Add(Stations.Service, call, Outcomes.Error, $"{ex.GetType().Name}: {ex.Message}");
            throw;
        }
    }
}

// Đăng ký SINGLETON: một kho duy nhất cho cả ứng dụng, giữ 300 trace gần nhất
// để frontend đọc lại bằng GET /api/traces/{id}.
public class TraceStore
{
    private const int Capacity = 300;
    private readonly ConcurrentDictionary<string, TraceDto> _byId = new();
    private readonly ConcurrentQueue<string> _order = new();

    public void Add(TraceDto trace)
    {
        _byId[trace.Id] = trace;
        _order.Enqueue(trace.Id);
        while (_order.Count > Capacity && _order.TryDequeue(out var old)) _byId.TryRemove(old, out _);
    }

    public TraceDto? Get(string id) => _byId.GetValueOrDefault(id);

    public IReadOnlyList<TraceDto> Recent(int take) =>
        _byId.Values.OrderByDescending(t => t.StartedAtUtc).Take(take).ToList();
}
