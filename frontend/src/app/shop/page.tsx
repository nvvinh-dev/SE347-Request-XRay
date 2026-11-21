"use client";

import { useCallback, useEffect, useState } from "react";
import { type Product, call, formatVnd, statusText } from "@/lib/api";
import { NODES, type TraceDto, fetchTrace, stagesOf, worst } from "@/lib/trace";

// Trang cho điện thoại khán giả (mở qua mã QR ở /live).

const NAME_KEY = "xray-buyer-name";

interface Toast {
  status: number;
  message: string;
  trace: TraceDto | null;
}

export default function MobileShop() {
  const [name, setName] = useState("");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "");
    } catch {
      /* chế độ ẩn danh: bỏ qua */
    }
  }, []);

  const load = useCallback(async (who: string) => {
    try {
      const r = await call<Product[]>("GET", "/api/products", { clientName: who || "Dien thoai" });
      if (r.ok && r.data) setProducts(r.data);
      setError(null);
    } catch {
      setError("Không kết nối được máy chủ. Hãy chắc chắn bạn đang dùng chung Wi-Fi với laptop.");
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  const saveName = (v: string) => {
    setName(v);
    try {
      localStorage.setItem(NAME_KEY, v);
    } catch {
      /* bỏ qua */
    }
  };

  const buy = async (p: Product) => {
    setBuying(p.id);
    try {
      const r = await call<{ message?: string; errors?: Record<string, string[]>; stockLeft?: number }>("POST", "/api/orders", {
        body: { productId: p.id, quantity: 1, buyerName: name.trim() },
        clientName: name.trim() || "Dien thoai",
      });
      const message = r.ok
        ? `Đã mua ${p.name}! Còn ${r.data?.stockLeft ?? "?"} sản phẩm.`
        : r.data?.errors
          ? Object.values(r.data.errors).flat().join(" · ")
          : r.data?.message ?? "Không mua được";
      const trace = r.traceId ? await fetchTrace(r.traceId) : null;
      setToast({ status: r.status, message, trace });
      await load(name.trim());
    } catch {
      setToast({ status: 0, message: "Mất kết nối máy chủ", trace: null });
    } finally {
      setBuying(null);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-40 pt-6">
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-req/30 to-info/30 text-2xl ring-1 ring-req/40">
          🛍️
        </span>
        <div>
          <h1 className="text-xl font-extrabold">
            Shop <span className="text-req">X-Ray</span>
          </h1>
          <p className="text-xs text-muted">Mỗi lần mua là một request bay lên màn chiếu</p>
        </div>
      </header>

      <label className="mt-5 block">
        <span className="mb-1.5 block text-xs font-semibold text-muted">Tên của bạn (hiện trên màn chiếu)</span>
        <input
          value={name}
          maxLength={20}
          onChange={(e) => saveName(e.target.value)}
          placeholder="Ví dụ: Lan"
          className="input py-3 text-base"
        />
      </label>

      {error && <div className="mt-4 rounded-xl border border-err/60 bg-err/10 px-4 py-3 text-sm text-err">{error}</div>}

      <ul className="mt-5 space-y-3">
        {products === null && Array.from({ length: 4 }).map((_, i) => <li key={i} className="h-20 animate-pulse rounded-2xl bg-panel-2" />)}
        {products?.map((p) => (
          <li key={p.id} className="panel flex items-center gap-3 p-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-panel-2 text-3xl">{p.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{p.name}</span>
              <span className="block font-mono text-sm font-bold text-res">{formatVnd(p.price)}</span>
              <span className={`block text-xs ${p.stock === 0 ? "text-block" : "text-muted"}`}>
                {p.stock === 0 ? "Hết hàng" : `Còn ${p.stock}`}
              </span>
            </span>
            <button
              onClick={() => buy(p)}
              disabled={buying !== null}
              className="rounded-xl bg-req px-4 py-3 text-sm font-bold text-bg active:scale-95 disabled:opacity-50"
            >
              {buying === p.id ? "…" : "Mua"}
            </button>
          </li>
        ))}
      </ul>

      {toast && (
        <div className="pop fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-line-strong bg-panel p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <span
              className={`rounded-lg px-2 py-1 font-mono text-sm font-extrabold text-bg ${
                toast.status >= 500 || toast.status === 0 ? "bg-err" : toast.status >= 400 ? "bg-block" : "bg-ok"
              }`}
            >
              {toast.status || "—"} {statusText(toast.status)}
            </span>
            <p className="flex-1 text-sm">{toast.message}</p>
            <button onClick={() => setToast(null)} className="text-muted" aria-label="Đóng">
              ✕
            </button>
          </div>
          {toast.trace && <MiniTrace trace={toast.trace} />}
        </div>
      )}
    </main>
  );
}

function MiniTrace({ trace }: { trace: TraceDto }) {
  return (
    <div className="mt-3">
      <div className="mb-1.5 text-[11px] text-muted">Request của bạn đã đi qua ({trace.totalMs.toFixed(2)} ms ở server):</div>
      <div className="flex items-center gap-1">
        {NODES.slice(1).map((n) => {
          const w = worst(stagesOf(trace, n.key as Exclude<typeof n.key, "client">, "in"));
          const cls = w === null ? "bg-line opacity-40" : w === "block" ? "bg-block" : w === "error" ? "bg-err" : w === "info" ? "bg-info" : "bg-ok";
          return (
            <div key={n.key} className="flex flex-1 flex-col items-center gap-1">
              <span className={`h-2 w-full rounded-full ${cls}`} />
              <span className="text-[9.5px] text-muted">{n.label.split(" ")[0]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
