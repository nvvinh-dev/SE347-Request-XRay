"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import TopBar from "@/components/TopBar";
import Pipeline, { type PacketRun } from "@/components/Pipeline";
import ConsoleLog, { type LogLine } from "@/components/ConsoleLog";
import { call } from "@/lib/api";
import { type TraceDto, stagesOf } from "@/lib/trace";
import { useTraceHub } from "@/lib/useTraceHub";

interface FeedItem {
  id: string;
  client: string;
  text: string;
  status: number;
}

const MAX_PACKETS = 14;

export default function LivePage() {
  const [runs, setRuns] = useState<PacketRun[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [count, setCount] = useState({ total: 0, clients: new Set<string>() });
  const [lan, setLan] = useState<string[]>([]);
  const [host, setHost] = useState<string | null>(null);
  const [port, setPort] = useState("3000");

  const onTrace = useCallback((t: TraceDto) => {
    setRuns((r) => (r.length >= MAX_PACKETS ? r : [...r, { key: t.id, trace: t }]));
    setLogs((l) => [...l.slice(-39), { id: t.id, trace: t }]);
    setCount((c) => ({ total: c.total + 1, clients: new Set(c.clients).add(t.client) }));
    if (t.path.startsWith("/api/orders")) {
      const svc = stagesOf(t, "service")[0];
      const text = svc?.detail ?? (t.statusCode === 400 ? "Dữ liệu không hợp lệ" : "Không xử lý được");
      setFeed((f) => [{ id: t.id, client: t.client, text, status: t.statusCode }, ...f].slice(0, 8));
    }
  }, []);
  const hub = useTraceHub(onTrace);

  useEffect(() => {
    setPort(window.location.port || "80");
    call<{ lanAddresses: string[] }>("GET", "/api/system/info", { clientName: "Man chieu" })
      .then((r) => {
        const list = r.data?.lanAddresses ?? [];
        setLan(list);
        const current = window.location.hostname;
        setHost(list.includes(current) ? current : list[0] ?? current);
      })
      .catch(() => setHost(window.location.hostname));
  }, []);

  const url = host ? `http://${host}:${port}/shop` : "";
  const isLocal = host === "localhost" || host === "127.0.0.1";

  return (
    <>
      <TopBar hub={hub} />
      <main className="mx-auto grid max-w-[1600px] gap-5 px-4 py-6 sm:px-6 xl:grid-cols-[380px_1fr]">
        <aside className="space-y-5">
          <section className="panel p-6 text-center">
            <div className="panel-title">Một backend · nhiều client · slide 7</div>
            <h1 className="mt-2 text-2xl font-extrabold">Quét để mua hàng</h1>
            <div className="mx-auto mt-5 w-fit rounded-3xl bg-white p-4 shadow-[0_0_60px_-10px_rgba(34,211,238,0.6)]">
              {url ? <QRCodeSVG value={url} size={240} level="M" /> : <div className="h-[240px] w-[240px] animate-pulse bg-slate-200" />}
            </div>
            <div className="mt-4 break-all font-mono text-sm font-bold text-req">{url || "Đang lấy địa chỉ LAN…"}</div>
            {lan.length > 1 && (
              <select value={host ?? ""} onChange={(e) => setHost(e.target.value)} className="input mt-3 text-center font-mono">
                {lan.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            )}
            {isLocal && (
              <p className="mt-3 text-xs text-block">Không tìm thấy IP LAN: điện thoại và laptop cần chung một Wi-Fi.</p>
            )}
            <p className="mt-3 text-xs text-muted">Điện thoại và laptop chung Wi-Fi. Gói tin của bạn sẽ chạy trên màn hình này.</p>
          </section>

          <section className="panel grid grid-cols-2 gap-3 p-5 text-center">
            <Stat value={count.total} label="request đã nhận" tone="text-req" />
            <Stat value={count.clients.size} label="client khác nhau" tone="text-res" />
          </section>

          <section className="panel p-5">
            <div className="panel-title">Đơn hàng mới nhất</div>
            <ul className="mt-3 space-y-2">
              {feed.length === 0 && <li className="py-4 text-center text-sm text-muted">Chưa có ai mua…</li>}
              {feed.map((f) => (
                <li key={f.id} className="pop flex items-start gap-3 rounded-xl border border-line bg-panel-2/60 px-3 py-2">
                  <span
                    className={`mt-0.5 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold text-bg ${
                      f.status >= 500 ? "bg-err" : f.status >= 400 ? "bg-block" : "bg-ok"
                    }`}
                  >
                    {f.status}
                  </span>
                  <span className="min-w-0 text-[13px]">
                    <b>{f.client}</b>
                    <span className="block truncate text-muted">{f.text}</span>
                  </span>
                </li>
              ))}
            </ul>
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
            <Pipeline
              runs={runs}
              hopMs={420}
              mode="swarm"
              onRunDone={(key) => setRuns((r) => r.filter((x) => x.key !== key))}
            />
            <p className="mt-1 text-center text-xs text-muted">
              Mỗi chấm là một request thật. Singleton giữ chung kho hàng cho mọi client: ai mua sau khi hết hàng sẽ nhận 409.
            </p>
          </section>
          <ConsoleLog lines={logs} height={260} />
        </div>
      </main>
    </>
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
