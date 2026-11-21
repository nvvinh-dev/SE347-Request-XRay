"use client";

import type { Identity } from "@/lib/api";

export interface Scenario {
  id: string;
  icon: string;
  title: string;
  expect: number;
  where: string;
  slide: string;
  method: string;
  path: string;
  identity: Identity;
  body?: unknown;
  rawBody?: string;
}

// Mỗi kịch bản làm request "gãy" ở một trạm khác nhau.
export const SCENARIOS: Scenario[] = [
  { id: "ok", icon: "✅", title: "Đường đi chuẩn", expect: 200, where: "đi hết 6 trạm", slide: "slide 19", method: "GET", path: "/api/products/1", identity: "anonymous" },
  { id: "401", icon: "🔒", title: "Chưa đăng nhập mà thêm hàng", expect: 401, where: "AuthN / AuthZ", slide: "slide 17", method: "POST", path: "/api/products", identity: "anonymous", body: { name: "Hàng lậu", price: 5000, stock: 1 } },
  { id: "403", icon: "🚫", title: "Khách đòi thêm hàng", expect: 403, where: "AuthZ", slide: "slide 17", method: "POST", path: "/api/products", identity: "khach", body: { name: "Hàng của khách", price: 5000, stock: 1 } },
  { id: "404r", icon: "🧭", title: "Gõ sai đường dẫn", expect: 404, where: "Routing", slide: "slide 11", method: "GET", path: "/api/khong-ton-tai", identity: "anonymous" },
  { id: "json", icon: "🧩", title: "JSON gõ hỏng", expect: 400, where: "Model Binding", slide: "slide 13", method: "POST", path: "/api/products", identity: "admin", rawBody: '{ "name": "Loa", "price": ' },
  { id: "400", icon: "🧾", title: "Tên trống, giá 0đ", expect: 400, where: "Validation", slide: "slide 13", method: "POST", path: "/api/products", identity: "admin", body: { name: "", price: 0, stock: 1 } },
  { id: "404s", icon: "🔎", title: "Sản phẩm số 999", expect: 404, where: "Service", slide: "slide 8", method: "GET", path: "/api/products/999", identity: "anonymous" },
  { id: "409", icon: "♻️", title: "Thêm trùng tên", expect: 409, where: "Service (nghiệp vụ)", slide: "slide 13", method: "POST", path: "/api/products", identity: "admin", body: { name: "Chuột không dây", price: 250000, stock: 5 } },
  { id: "500", icon: "💥", title: "Kho hàng sập", expect: 500, where: "Exception Middleware", slide: "slide 19", method: "GET", path: "/api/products/crash", identity: "anonymous" },
];

const badge = (code: number) =>
  code >= 500 ? "bg-err text-bg" : code >= 400 ? "bg-block/90 text-bg" : "bg-ok text-bg";

export default function BreakPanel({
  busy,
  lastId,
  onRun,
}: {
  busy: boolean;
  lastId: string | null;
  onRun: (s: Scenario) => void;
}) {
  // Dải nút gọn, đặt ngay dưới pipeline để bấm và nhìn gói tin trên cùng một màn hình.
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
        <span className="panel-title">Bảng “Phá thử”</span>
        <span className="text-xs text-muted">Làm request gãy ở từng trạm: gói tin đỏ lên và quay đầu đúng chỗ ngắt mạch.</span>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-3">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => onRun(s)}
            disabled={busy}
            title={`${s.method} ${s.path}${s.identity !== "anonymous" ? ` · ${s.identity}` : ""}`}
            className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-1.5 text-left transition hover:border-line-strong hover:bg-white/[0.04] disabled:cursor-wait disabled:opacity-60 ${
              lastId === s.id ? "border-req/60 bg-req/[0.08]" : "border-line bg-panel-2/60"
            }`}
          >
            <span className="text-lg leading-none">{s.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold leading-tight">{s.title}</span>
              <span className="block truncate font-mono text-[10.5px] leading-tight text-muted">
                {s.method} {s.path}
                {s.identity !== "anonymous" && <span className="text-info"> · {s.identity}</span>}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-0.5">
              <span className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold leading-none ${badge(s.expect)}`}>{s.expect}</span>
              <span className="whitespace-nowrap text-[10px] leading-none text-muted">{s.where}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
