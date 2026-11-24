"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type Product, call, formatVnd, statusText } from "@/lib/api";
import { NODES, type TraceDto, fetchTrace, stagesOf, worst } from "@/lib/trace";
import { useTraceHub } from "@/lib/useTraceHub";
import { SecretBadge, SecretBox, isSecret } from "@/components/SecretBox";

// Trang cho điện thoại khán giả (mở qua mã QR ở /live).
// Minigame: ai mua được "hộp Secret" đầu tiên thì thắng; người mua định danh bằng MSSV 8 số.

const MSSV_KEY = "xray-mssv";
const MSSV_RE = /^\d{8}$/;
const ignoreTrace = () => {};

interface Toast {
  status: number;
  message: string;
  trace: TraceDto | null;
  secret: boolean;
}

const sortSecretFirst = (list: Product[]) => [...list].sort((a, b) => Number(isSecret(b)) - Number(isSecret(a)) || a.id - b.id);

export default function MobileShop() {
  const [mssv, setMssv] = useState("");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [newSecret, setNewSecret] = useState(false);

  const valid = MSSV_RE.test(mssv);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MSSV_KEY) ?? "";
      if (MSSV_RE.test(saved)) setMssv(saved);
    } catch {
      /* chế độ ẩn danh: bỏ qua */
    }
  }, []);

  const applyProducts = useCallback((list: Product[]) => {
    setProducts((old) => {
      // Hộp Secret vừa xuất hiện: rung nhẹ để khán giả chú ý.
      if (old && list.some((p) => isSecret(p) && !old.some((o) => o.id === p.id))) setNewSecret(true);
      return sortSecretFirst(list);
    });
  }, []);

  // Backend phát danh sách mới sau mỗi lần thêm hàng hoặc có người mua: không cần tải lại trang.
  useTraceHub(ignoreTrace, applyProducts);

  const load = useCallback(async () => {
    try {
      const r = await call<Product[]>("GET", "/api/products", { clientName: "Dien thoai" });
      if (r.ok && r.data) setProducts(sortSecretFirst(r.data));
      setError(null);
    } catch {
      setError("Không kết nối được máy chủ. Hãy chắc chắn bạn đang dùng chung Wi-Fi với laptop.");
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!newSecret) return;
    const t = setTimeout(() => setNewSecret(false), 2500);
    return () => clearTimeout(t);
  }, [newSecret]);

  const changeMssv = (raw: string) => {
    const v = raw.replace(/\D/g, "").slice(0, 8);
    setMssv(v);
    try {
      localStorage.setItem(MSSV_KEY, v);
    } catch {
      /* bỏ qua */
    }
  };

  const buy = async (p: Product) => {
    if (!valid) return;
    setBuying(p.id);
    const secret = isSecret(p);
    try {
      const r = await call<{ message?: string; errors?: Record<string, string[]>; stockLeft?: number }>("POST", "/api/orders", {
        body: { productId: p.id, quantity: 1, studentId: mssv },
        clientName: mssv,
      });
      const message = r.ok
        ? secret
          ? `Bạn đã mua được ${p.name}! Nhìn lên màn chiếu xem ai là người nhanh nhất.`
          : `Đã mua ${p.name}! Còn ${r.data?.stockLeft ?? "?"} sản phẩm.`
        : r.data?.errors
          ? Object.values(r.data.errors).flat().join(" · ")
          : r.data?.message ?? "Không mua được";
      const trace = r.traceId ? await fetchTrace(r.traceId) : null;
      setToast({ status: r.status, message, trace, secret: secret && r.ok });
    } catch {
      setToast({ status: 0, message: "Mất kết nối máy chủ", trace: null, secret: false });
    } finally {
      setBuying(null);
    }
  };

  const hint = useMemo(() => {
    if (valid) return { text: "MSSV hợp lệ, bạn có thể mua hàng", cls: "text-ok" };
    if (mssv.length === 0) return { text: "Nhập MSSV gồm đúng 8 chữ số để mua hàng", cls: "text-muted" };
    return { text: `Còn thiếu ${8 - mssv.length} chữ số`, cls: "text-block" };
  }, [mssv, valid]);

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-44 pt-5">
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

      <div className="sticky top-0 z-20 -mx-4 mt-4 bg-bg/90 px-4 pb-3 pt-2 backdrop-blur">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted">MSSV của bạn</span>
          <input
            value={mssv}
            onChange={(e) => changeMssv(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            pattern="\d{8}"
            maxLength={8}
            placeholder="Ví dụ: 23520001"
            aria-invalid={!valid}
            className={`input py-3 text-center font-mono text-xl tracking-[0.3em] ${
              valid ? "!border-ok" : mssv.length > 0 ? "!border-block" : ""
            }`}
          />
        </label>
        <p className={`mt-1.5 text-center text-xs ${hint.cls}`}>{hint.text}</p>
      </div>

      {error && <div className="mt-2 rounded-xl border border-err/60 bg-err/10 px-4 py-3 text-sm text-err">{error}</div>}

      <ul className="mt-3 space-y-3">
        {products === null && Array.from({ length: 4 }).map((_, i) => <li key={i} className="h-20 animate-pulse rounded-2xl bg-panel-2" />)}
        {products?.map((p) => {
          const secret = isSecret(p);
          const disabled = buying !== null || !valid;
          return (
            <li
              key={p.id}
              className={`flex items-center gap-3 rounded-2xl p-3 ${secret ? `secret-card ${newSecret ? "shake" : ""}` : "panel"}`}
            >
              <span
                className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-3xl ${
                  secret ? "bg-amber-400/10" : "bg-panel-2"
                }`}
              >
                {secret ? <SecretBox size={52} /> : p.icon}
              </span>
              <span className="min-w-0 flex-1">
                {secret && <SecretBadge className="mb-1 inline-block" />}
                <span className={`block truncate font-semibold ${secret ? "text-amber-200" : ""}`}>{p.name}</span>
                <span className="block font-mono text-sm font-bold text-res">{formatVnd(p.price)}</span>
                <span className={`block text-xs ${p.stock === 0 ? "text-block" : "text-muted"}`}>
                  {p.stock === 0 ? "Hết hàng" : `Còn ${p.stock}`}
                </span>
              </span>
              <button
                onClick={() => buy(p)}
                disabled={disabled}
                className={`shrink-0 rounded-xl px-4 py-3 text-sm font-bold active:scale-95 disabled:opacity-40 ${
                  secret ? "bg-gradient-to-r from-amber-300 to-yellow-400 text-amber-950 shadow-[0_0_18px_rgba(251,191,36,0.6)]" : "bg-req text-bg"
                }`}
              >
                {buying === p.id ? "…" : !valid ? "Nhập MSSV" : secret ? "Mua ngay!" : "Mua"}
              </button>
            </li>
          );
        })}
      </ul>

      {toast && (
        <div
          className={`pop fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border p-4 shadow-2xl ${
            toast.secret ? "secret-card" : "border-line-strong bg-panel"
          }`}
        >
          <div className="flex items-start gap-3">
            {toast.secret ? (
              <SecretBox size={40} />
            ) : (
              <span
                className={`rounded-lg px-2 py-1 font-mono text-sm font-extrabold text-bg ${
                  toast.status >= 500 || toast.status === 0 ? "bg-err" : toast.status >= 400 ? "bg-block" : "bg-ok"
                }`}
              >
                {toast.status || "—"} {statusText(toast.status)}
              </span>
            )}
            <p className={`flex-1 text-sm ${toast.secret ? "font-semibold text-amber-100" : ""}`}>{toast.message}</p>
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
