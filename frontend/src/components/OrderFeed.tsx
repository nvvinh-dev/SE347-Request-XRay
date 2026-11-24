"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { type OrderRow, formatTime } from "@/lib/orders";
import { SecretBox } from "./SecretBox";

type Filter = "all" | "secret" | "ok";

/**
 * Danh sách mọi đơn hàng theo thứ tự đến server (#1 là người nhanh nhất).
 * Không bao giờ đẩy người mua đầu tiên ra khỏi danh sách: cuộn xuống để xem đơn mới,
 * và chỉ tự cuộn khi người xem đang ở cuối danh sách.
 */
export default function OrderFeed({
  orders,
  secretNames,
  winnerId,
  height = 360,
}: {
  orders: OrderRow[];
  secretNames: Set<string>;
  winnerId: string | null;
  height?: number;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [unseen, setUnseen] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const lastCount = useRef(0);

  const isSecretOrder = (o: OrderRow) => o.product !== null && secretNames.has(o.product);
  const rows = orders
    .map((o, i) => ({ o, rank: i + 1 }))
    .filter(({ o }) => (filter === "secret" ? isSecretOrder(o) : filter === "ok" ? o.ok : true));

  const onScroll = () => {
    const el = box.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    if (atBottom.current) setUnseen(0);
  };

  const scrollToEnd = () => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
    setUnseen(0);
  };

  useLayoutEffect(() => {
    const added = orders.length - lastCount.current;
    lastCount.current = orders.length;
    if (added <= 0) return;
    if (atBottom.current) box.current?.scrollTo({ top: box.current.scrollHeight });
    else setUnseen((n) => n + added);
  }, [orders.length]);

  useEffect(() => {
    if (atBottom.current) box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [filter]);

  const tabs: [Filter, string, number][] = [
    ["all", "Tất cả", orders.length],
    ["secret", "Secret", orders.filter(isSecretOrder).length],
    ["ok", "Thành công", orders.filter((o) => o.ok).length],
  ];

  return (
    <section className="panel flex flex-col p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="panel-title">Đơn hàng theo thứ tự đến server</div>
          <h2 className="mt-1 text-lg font-extrabold">#1 là người nhanh nhất</h2>
        </div>
        <div className="flex rounded-xl border border-line bg-panel p-0.5">
          {tabs.map(([key, label, n]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${filter === key ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
            >
              {label} <span className="font-mono opacity-70">{n}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div ref={box} onScroll={onScroll} className="scroll-thin space-y-1.5 overflow-y-auto pr-1" style={{ height }}>
          {rows.length === 0 && <p className="py-10 text-center text-sm text-muted">Chưa có đơn hàng nào…</p>}
          {rows.map(({ o, rank }) => {
            const secret = isSecretOrder(o);
            const winner = o.id === winnerId;
            return (
              <div
                key={o.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                  winner
                    ? "secret-card"
                    : secret
                      ? "border border-amber-400/40 bg-amber-400/[0.07]"
                      : "border border-line bg-panel-2/60"
                }`}
              >
                <span className={`w-9 shrink-0 font-mono text-sm font-extrabold ${winner ? "text-amber-200" : "text-muted"}`}>
                  {winner ? "🏆" : `#${rank}`}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <b className="font-mono text-[14px] tracking-wider">{o.mssv}</b>
                    <span className="font-mono text-[10.5px] text-muted">{formatTime(o.atMs)}</span>
                  </span>
                  <span className={`block truncate text-[12px] ${secret ? "text-amber-200" : "text-muted"}`}>
                    {o.ok ? o.product ?? o.detail : o.detail}
                  </span>
                </span>
                {secret && <SecretBox size={22} animated={false} />}
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold text-bg ${
                    o.status >= 500 ? "bg-err" : o.status >= 400 ? "bg-block" : "bg-ok"
                  }`}
                >
                  {o.status}
                </span>
              </div>
            );
          })}
        </div>
        {unseen > 0 && (
          <button
            onClick={scrollToEnd}
            className="pop absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-req px-3 py-1 text-xs font-bold text-bg shadow-lg"
          >
            ↓ {unseen} đơn mới
          </button>
        )}
      </div>
    </section>
  );
}
