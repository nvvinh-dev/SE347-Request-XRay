"use client";

import { useState } from "react";
import { formatVnd, type Identity, type Product } from "@/lib/api";

const ICONS = ["🎧", "🎮", "🖥️", "🕹️", "⌚", "🔋", "🖨️", "📦"];
const TILE = [
  "from-cyan-500/25 to-sky-700/10",
  "from-violet-500/25 to-fuchsia-700/10",
  "from-amber-400/25 to-orange-700/10",
  "from-emerald-400/25 to-teal-700/10",
  "from-rose-400/25 to-pink-700/10",
  "from-indigo-400/25 to-blue-700/10",
];

export interface NewProduct {
  name: string;
  price: number;
  stock: number;
  icon: string;
}

export default function ShopPanel({
  products,
  identity,
  busy,
  onReload,
  onView,
  onBuy,
  onCreate,
}: {
  products: Product[] | null;
  identity: Identity;
  busy: boolean;
  onReload: () => void;
  onView: (id: number) => void;
  onBuy: (id: number) => void;
  onCreate: (p: NewProduct) => void;
}) {
  const [form, setForm] = useState<NewProduct>({ name: "Tai nghe gaming", price: 550000, stock: 10, icon: "🎮" });

  return (
    <section className="panel flex flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="panel-title">Client · Cửa hàng mini</div>
          <h2 className="mt-1 text-lg font-bold">Bấm vào sản phẩm để gửi request</h2>
        </div>
        <button
          onClick={onReload}
          disabled={busy}
          className="rounded-xl border border-line-strong px-3 py-1.5 font-mono text-xs font-semibold text-req transition hover:bg-req/10 disabled:opacity-50"
        >
          GET /api/products
        </button>
      </div>

      {products === null && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-panel-2" />
          ))}
        </div>
      )}
      {products?.length === 0 && <p className="py-8 text-center text-sm text-muted">Kho chưa có sản phẩm nào.</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {products?.map((p, i) => (
          <div
            key={p.id}
            className="group relative overflow-hidden rounded-2xl border border-line bg-panel-2 transition hover:-translate-y-0.5 hover:border-req/60"
          >
            <button onClick={() => onView(p.id)} disabled={busy} className="block w-full text-left disabled:cursor-wait">
              <div className={`flex h-20 items-center justify-center bg-gradient-to-br ${TILE[i % TILE.length]} text-4xl`}>
                <span className="transition group-hover:scale-110">{p.icon}</span>
              </div>
              <div className="p-3">
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="mt-0.5 font-mono text-[13px] font-bold text-res">{formatVnd(p.price)}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                  <span className={p.stock === 0 ? "text-block" : ""}>{p.stock === 0 ? "Hết hàng" : `Còn ${p.stock}`}</span>
                  <span className="font-mono text-req/80 opacity-0 transition group-hover:opacity-100">GET /{p.id}</span>
                </div>
              </div>
            </button>
            <button
              onClick={() => onBuy(p.id)}
              disabled={busy}
              title="POST /api/orders"
              className="absolute right-2 top-2 rounded-lg bg-bg/70 px-2 py-1 text-[11px] font-semibold text-ink opacity-0 ring-1 ring-line-strong backdrop-blur transition hover:bg-res hover:text-bg group-hover:opacity-100"
            >
              Mua
            </button>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCreate(form);
        }}
        className="mt-5 rounded-2xl border border-dashed border-line-strong p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold">Thêm sản phẩm · POST /api/products</span>
          <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[11px] text-muted">
            quyền: <b className="text-ink">{identity === "anonymous" ? "ẩn danh" : identity}</b>
          </span>
        </div>
        <div className="grid grid-cols-6 gap-2">
          <div className="col-span-6 flex gap-1.5">
            {ICONS.map((ic) => (
              <button
                type="button"
                key={ic}
                onClick={() => setForm({ ...form, icon: ic })}
                className={`h-9 w-9 rounded-lg text-lg transition ${form.icon === ic ? "bg-req/20 ring-1 ring-req" : "bg-panel-2 hover:bg-white/10"}`}
              >
                {ic}
              </button>
            ))}
          </div>
          <Field className="col-span-6" label="Tên">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </Field>
          <Field className="col-span-3" label="Giá (đ)">
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="input" />
          </Field>
          <Field className="col-span-3" label="Tồn kho">
            <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className="input" />
          </Field>
        </div>
        <button
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-req py-2 text-sm font-bold text-bg transition hover:brightness-110 disabled:opacity-50"
        >
          Gửi POST
        </button>
        <p className="mt-2 text-[11px] text-muted">
          Thử để trống tên hoặc giá 0 để thấy Validation chặn 400; đổi sang “ẩn danh” để thấy 401.
        </p>
      </form>
    </section>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-[11px] text-muted">{label}</span>
      {children}
    </label>
  );
}
