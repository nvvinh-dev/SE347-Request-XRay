import { type TraceDto, stagesOf } from "./trace";

// Đơn hàng dựng lại từ trace của POST /api/orders (màn chiếu không cần endpoint riêng).
export interface OrderRow {
  id: string;
  mssv: string;
  product: string | null;
  detail: string;
  status: number;
  ok: boolean;
  atMs: number;
}

export const isOrderTrace = (t: TraceDto) => t.method === "POST" && t.path.startsWith("/api/orders");

export function toOrder(t: TraceDto): OrderRow {
  const svc = stagesOf(t, "service")[0];
  const invalid = stagesOf(t, "controller").find((s) => s.outcome === "block");
  const detail = svc?.detail ?? invalid?.detail ?? "Không xử lý được";
  // "MSSV 23520001 mua 1 × Hộp Secret, còn 0" hoặc "\"Hộp Secret\" chỉ còn 0 sản phẩm → 409"
  const product = /mua \d+ × (.+), còn \d+$/.exec(detail)?.[1] ?? /"(.+?)"/.exec(detail)?.[1] ?? null;
  return {
    id: t.id,
    mssv: t.client,
    product,
    detail,
    status: t.statusCode,
    ok: t.statusCode >= 200 && t.statusCode < 300,
    atMs: Date.parse(t.startedAtUtc),
  };
}

/** Thêm đơn mới, bỏ trùng và giữ thứ tự theo thời gian đến server. */
export function mergeOrders(list: OrderRow[], incoming: OrderRow[], max = 1000): OrderRow[] {
  const seen = new Set(list.map((o) => o.id));
  const fresh = incoming.filter((o) => !seen.has(o.id));
  if (fresh.length === 0) return list;
  return [...list, ...fresh].sort((a, b) => a.atMs - b.atMs).slice(-max);
}

export function formatTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}
