"use client";

import { useCallback, useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import Pipeline, { type PacketRun } from "@/components/Pipeline";
import ShopPanel, { type NewProduct } from "@/components/ShopPanel";
import BreakPanel, { type Scenario } from "@/components/BreakPanel";
import ResponsePanel from "@/components/ResponsePanel";
import StageList from "@/components/StageList";
import ConsoleLog, { type LogLine } from "@/components/ConsoleLog";
import { type ApiResult, type Identity, type Product, call, getToken } from "@/lib/api";
import { NODES, type TraceDto, fetchTrace } from "@/lib/trace";
import { useTraceHub } from "@/lib/useTraceHub";

const CLIENT = "Laptop trinh chieu";
const SPEEDS = [
  { label: "Nhanh", ms: 280 },
  { label: "Vừa", ms: 650 },
  { label: "Chậm", ms: 1100 },
];

export default function XRayPage() {
  const [identity, setIdentity] = useState<Identity>("admin");
  const [hopMs, setHopMs] = useState(650);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [runs, setRuns] = useState<PacketRun[]>([]);
  const [trace, setTrace] = useState<TraceDto | null>(null);
  const [res, setRes] = useState<ApiResult | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScenario, setLastScenario] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);

  const pushLog = useCallback((t: TraceDto) => {
    setLogs((l) => (l.some((x) => x.id === t.id) ? l : [...l.slice(-59), { id: t.id, trace: t }]));
  }, []);
  const hub = useTraceHub(pushLog);

  const reload = useCallback(async () => {
    try {
      const r = await call<Product[]>("GET", "/api/products", { clientName: CLIENT });
      if (r.ok && r.data) setProducts(r.data);
      return r;
    } catch {
      setError("Không gọi được backend ở cổng 5000. Đã chạy `dotnet run` chưa?");
      setProducts([]);
      return null;
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const play = useCallback(
    async (r: ApiResult) => {
      setRes(r);
      if (!r.traceId) return;
      const t = await fetchTrace(r.traceId);
      if (!t) return;
      setTrace(t);
      setSelected(null);
      setRuns([{ key: t.id, trace: t }]);
      // Bấm từ cửa hàng phía dưới thì cuộn lên để thấy gói tin chạy.
      if (window.scrollY > 80) window.scrollTo({ top: 0, behavior: "smooth" });
      if (hub !== "connected") pushLog(t);
    },
    [hub, pushLog],
  );

  const send = useCallback(
    async (method: string, path: string, who: Identity, body?: unknown, rawBody?: string) => {
      setBusy(true);
      setError(null);
      try {
        const token = await getToken(who, CLIENT);
        const r = await call(method, path, { body, rawBody, token, clientName: CLIENT });
        await play(r);
        if (method !== "GET" && r.ok) {
          const list = await call<Product[]>("GET", "/api/products", { clientName: CLIENT });
          if (list.ok && list.data) setProducts(list.data);
        }
      } catch {
        setError("Không gọi được backend ở cổng 5000. Đã chạy `dotnet run` chưa?");
      } finally {
        setBusy(false);
      }
    },
    [play],
  );

  const runScenario = (s: Scenario) => {
    setLastScenario(s.id);
    send(s.method, s.path, s.identity, s.body, s.rawBody);
  };

  const onReload = async () => {
    setBusy(true);
    const r = await reload();
    if (r) await play(r);
    setBusy(false);
  };

  const onCreate = (p: NewProduct) => send("POST", "/api/products", identity, p);
  const onBuy = (id: number) => send("POST", "/api/orders", identity, { productId: id, quantity: 1, buyerName: "Người thuyết trình" });

  const selectedKey = selected !== null ? NODES[selected].key : null;

  return (
    <>
      <TopBar hub={hub}>
        <Segmented
          label="Danh tính"
          value={identity}
          onChange={(v) => setIdentity(v as Identity)}
          options={[
            ["anonymous", "Ẩn danh"],
            ["khach", "khach"],
            ["admin", "admin"],
          ]}
        />
        <Segmented
          label="Tốc độ"
          value={String(hopMs)}
          onChange={(v) => setHopMs(Number(v))}
          options={SPEEDS.map((s) => [String(s.ms), s.label] as [string, string])}
        />
      </TopBar>

      <main className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 sm:px-6">
        {error && (
          <div className="rounded-xl border border-err/60 bg-err/10 px-4 py-3 text-sm text-err">{error}</div>
        )}

        <section className="panel p-4 sm:p-5">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="panel-title">Hành trình của một HTTP Request</div>
              <h1 className="mt-0.5 text-xl font-extrabold tracking-tight">
                {trace ? (
                  <>
                    <span className="text-req">{trace.method}</span> <span className="font-mono">{trace.path}</span>
                    <span className="ml-3 font-mono text-sm font-medium text-muted">trace #{trace.id}</span>
                  </>
                ) : (
                  "Chụp X-quang một request"
                )}
              </h1>
            </div>
            <Legend />
          </div>
          <Pipeline runs={runs} hopMs={hopMs} selected={selected} onSelect={(i) => setSelected(i === selected ? null : i)} />
          <p className="mb-3 text-center text-[11px] text-muted">
            Số ms là thời điểm thật backend ghi nhận, tính từ lúc Kestrel nhận request; hoạt hình chỉ phát chậm lại cho dễ nhìn.
          </p>
          <div className="border-t border-line pt-3">
            <BreakPanel busy={busy} lastId={lastScenario} onRun={runScenario} />
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <ShopPanel
              products={products}
              identity={identity}
              busy={busy}
              onReload={onReload}
              onView={(id) => send("GET", `/api/products/${id}`, identity)}
              onBuy={onBuy}
              onCreate={onCreate}
            />
          </div>

          <section className="panel space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div className="panel-title">Phim chụp chi tiết</div>
              {selectedKey && (
                <button onClick={() => setSelected(null)} className="text-xs text-muted hover:text-ink">
                  Đang soi: {NODES[selected!].label} ✕
                </button>
              )}
            </div>
            <ResponsePanel res={res} trace={trace} />
            <StageList trace={trace} highlight={selectedKey} />
          </section>
        </div>

        <ConsoleLog lines={logs} />
      </main>
    </>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted">{label}</span>
      <div className="flex rounded-xl border border-line bg-panel p-0.5">
        {options.map(([v, text]) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              value === v ? "bg-ink text-bg" : "text-muted hover:text-ink"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function Legend() {
  const items: [string, string][] = [
    ["bg-ok", "đi qua"],
    ["bg-info", "ghi nhận"],
    ["bg-block", "ngắt mạch"],
    ["bg-err", "exception"],
  ];
  return (
    <div className="flex flex-wrap gap-3 text-[11px] text-muted">
      {items.map(([c, t]) => (
        <span key={t} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${c}`} />
          {t}
        </span>
      ))}
    </div>
  );
}
