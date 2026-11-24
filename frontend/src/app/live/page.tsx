"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import TopBar from "@/components/TopBar";
import Pipeline, { type PacketRun } from "@/components/Pipeline";
import ConsoleLog, { type LogLine } from "@/components/ConsoleLog";
import OrderFeed from "@/components/OrderFeed";
import { SecretBox, isSecret } from "@/components/SecretBox";
import { type Product, apiBase, call } from "@/lib/api";
import { type OrderRow, formatTime, isOrderTrace, mergeOrders, toOrder } from "@/lib/orders";
import type { TraceDto } from "@/lib/trace";
import { useTraceHub } from "@/lib/useTraceHub";

const MAX_PACKETS = 14;

export default function LivePage() {
  const [runs, setRuns] = useState<PacketRun[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [count, setCount] = useState({ total: 0, clients: new Set<string>() });
  const [lan, setLan] = useState<string[]>([]);
  const [host, setHost] = useState<string | null>(null);
  const [port, setPort] = useState("3000");
  // Mở trang này bằng địa chỉ tunnel (hoặc IP LAN) thì mã QR dùng luôn địa chỉ đó.
  const [publicOrigin, setPublicOrigin] = useState<string | null>(null);

  const onTrace = useCallback((t: TraceDto) => {
    setRuns((r) => (r.length >= MAX_PACKETS ? r : [...r, { key: t.id, trace: t }]));
    setLogs((l) => [...l.slice(-39), { id: t.id, trace: t }]);
    setCount((c) => ({ total: c.total + 1, clients: new Set(c.clients).add(t.client) }));
    if (isOrderTrace(t)) setOrders((o) => mergeOrders(o, [toOrder(t)]));
  }, []);
  const hub = useTraceHub(onTrace, setProducts);

  useEffect(() => {
    setPort(window.location.port || "80");
    if (!["localhost", "127.0.0.1"].includes(window.location.hostname)) setPublicOrigin(window.location.origin);
    call<{ lanAddresses: string[] }>("GET", "/api/system/info", { clientName: "Man chieu" })
      .then((r) => {
        const list = r.data?.lanAddresses ?? [];
        setLan(list);
        const current = window.location.hostname;
        setHost(list.includes(current) ? current : list[0] ?? current);
      })
      .catch(() => setHost(window.location.hostname));
    call<Product[]>("GET", "/api/products", { clientName: "Man chieu" })
      .then((r) => r.ok && r.data && setProducts(r.data))
      .catch(() => {});
    // Tải lại trang không làm mất danh sách: dựng lại đơn hàng từ 300 trace gần nhất của server.
    fetch(`${apiBase()}/api/traces?take=300`)
      .then((r) => (r.ok ? (r.json() as Promise<TraceDto[]>) : []))
      .then((list) => setOrders((o) => mergeOrders(o, list.filter(isOrderTrace).map(toOrder))))
      .catch(() => {});
  }, []);

  const secretProducts = useMemo(() => products.filter(isSecret), [products]);
  const secretNames = useMemo(() => new Set(secretProducts.map((p) => p.name)), [secretProducts]);
  const winner = useMemo(() => orders.find((o) => o.ok && o.product !== null && secretNames.has(o.product)) ?? null, [orders, secretNames]);
  const lateCount = useMemo(
    () => (winner ? orders.filter((o) => o.atMs > winner.atMs && o.product !== null && secretNames.has(o.product) && o.id !== winner.id).length : 0),
    [orders, winner, secretNames],
  );

  const url = publicOrigin ? `${publicOrigin}/shop` : host ? `http://${host}:${port}/shop` : "";
  const isLocal = !publicOrigin && (host === "localhost" || host === "127.0.0.1");

  return (
    <>
      <TopBar hub={hub} />
      <main className="mx-auto grid max-w-[1600px] gap-5 px-4 py-6 sm:px-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-5">
          <section className="panel p-6 text-center">
            <div className="panel-title">Một backend · nhiều client</div>
            <h1 className="mt-2 text-2xl font-extrabold">Quét để mua hàng</h1>
            <div className="mx-auto mt-5 w-fit rounded-3xl bg-white p-4 shadow-[0_0_60px_-10px_rgba(34,211,238,0.6)]">
              {url ? <QRCodeSVG value={url} size={220} level="M" /> : <div className="h-[220px] w-[220px] animate-pulse bg-slate-200" />}
            </div>
            <div className="mt-4 break-all font-mono text-sm font-bold text-req">{url || "Đang lấy địa chỉ LAN…"}</div>
            {!publicOrigin && lan.length > 1 && (
              <select value={host ?? ""} onChange={(e) => setHost(e.target.value)} className="input mt-3 text-center font-mono">
                {lan.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            )}
            {isLocal && <p className="mt-3 text-xs text-block">Không tìm thấy IP LAN: điện thoại và laptop cần chung một Wi-Fi.</p>}
          </section>

          <WinnerCard secret={secretProducts} winner={winner} lateCount={lateCount} />

          <section className="panel grid grid-cols-2 gap-3 p-5 text-center">
            <Stat value={count.total} label="request đã nhận" tone="text-req" />
            <Stat value={count.clients.size} label="client khác nhau" tone="text-res" />
          </section>
        </aside>

        <div className="min-w-0 space-y-5">
          <section className="panel p-5">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="panel-title">Màn hình chung · mọi request từ mọi thiết bị</div>
                <h2 className="mt-1 text-xl font-extrabold">Nhiều gói tin, cùng một pipeline</h2>
              </div>
              <span className="font-mono text-xs text-muted">{runs.length} gói tin đang chạy</span>
            </div>
            <Pipeline runs={runs} hopMs={420} mode="swarm" onRunDone={(key) => setRuns((r) => r.filter((x) => x.key !== key))} />
            <p className="mt-1 text-center text-xs text-muted">
              Mỗi chấm là một request thật. Singleton giữ chung kho hàng cho mọi client: ai mua sau khi hết hàng sẽ nhận 409.
            </p>
          </section>
          <div className="grid gap-5 2xl:grid-cols-2">
            <OrderFeed orders={orders} secretNames={secretNames} winnerId={winner?.id ?? null} />
            <ConsoleLog lines={logs} height={388} />
          </div>
        </div>
      </main>
    </>
  );
}

function WinnerCard({ secret, winner, lateCount }: { secret: Product[]; winner: OrderRow | null; lateCount: number }) {
  if (secret.length === 0)
    return (
      <section className="panel flex items-center gap-3 p-4 text-sm text-muted">
        <SecretBox size={36} animated={false} />
        <span>Minigame chưa bắt đầu: thêm một sản phẩm chọn biểu tượng hộp Secret ở trang X-Ray.</span>
      </section>
    );

  if (!winner)
    return (
      <section className="secret-card rounded-[18px] p-5 text-center">
        <div className="text-[11px] font-extrabold tracking-[0.25em] text-amber-200">MINIGAME · HỘP SECRET</div>
        <div className="my-3 flex justify-center">
          <SecretBox size={96} />
        </div>
        <div className="text-lg font-extrabold text-amber-100">{secret[0].name} đã xuất hiện!</div>
        <p className="mt-1 text-sm text-amber-100/80">Ai mua được đầu tiên sẽ thắng · còn {secret.reduce((n, p) => n + p.stock, 0)} hộp</p>
      </section>
    );

  return (
    <section className="secret-card pop rounded-[18px] p-5 text-center">
      <div className="text-[11px] font-extrabold tracking-[0.25em] text-amber-200">🏆 NGƯỜI CHIẾN THẮNG</div>
      <div className="mt-3 font-mono text-4xl font-extrabold tracking-[0.12em] text-amber-100 drop-shadow-[0_0_18px_rgba(251,191,36,0.8)]">
        {winner.mssv}
      </div>
      <div className="mt-2 text-sm text-amber-100/90">
        mua được <b>{winner.product}</b> lúc <span className="font-mono">{formatTime(winner.atMs)}</span>
      </div>
      {lateCount > 0 && <div className="mt-1 text-xs text-amber-100/70">{lateCount} lượt mua đến muộn hơn</div>}
    </section>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-line bg-bg/40 py-4">
      <div className={`font-mono text-4xl font-extrabold ${tone}`}>{value}</div>
      <div className="mt-1 text-[11px] text-muted">{label}</div>
    </div>
  );
}
