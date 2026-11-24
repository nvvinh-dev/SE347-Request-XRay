"use client";

import { useState } from "react";
import { formatVnd, type Identity, type Product } from "@/lib/api";
import { SECRET_ICON, SecretBadge, SecretBox, isSecret } from "./SecretBox";

const ICONS = ["🎧", "🎮", "🖥️", "🕹️", "⌚", "🔋", "🖨️", SECRET_ICON];
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
        {products?.map((p, i) => {
          const secret = isSecret(p);
          return (
          <div
            key={p.id}
            className={`group relative overflow-hidden rounded-2xl border transition hover:-translate-y-0.5 ${
              secret ? "secret-card" : "border-line bg-panel-2 hover:border-req/60"
            }`}
          >
            {secret && <SecretBadge className="absolute left-2 top-2 z-10" />}
            <button onClick={() => onView(p.id)} disabled={busy} className="block w-full text-left disabled:cursor-wait">
              <div
                className={`flex h-20 items-center justify-center text-4xl ${
                  secret ? "bg-[radial-gradient(circle_at_50%_60%,rgba(251,191,36,0.35),transparent_70%)]" : `bg-gradient-to-br ${TILE[i % TILE.length]}`
                }`}
              >
                {secret ? <SecretBox size={58} /> : <span className="transition group-hover:scale-110">{p.icon}</span>}
              </div>
              <div className="p-3">
                <div className={`truncate text-sm font-semibold ${secret ? "text-amber-200" : ""}`}>{p.name}</div>
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
          );
        })}
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
                title={ic === SECRET_ICON ? "Hộp Secret cho minigame" : undefined}
                onClick={() =>
                  setForm(
                    ic === SECRET_ICON
                      ? { ...form, icon: ic, name: "Hộp Secret", stock: 1 }
                      : { ...form, icon: ic, name: form.icon === SECRET_ICON ? "Tai nghe gaming" : form.name },
                  )
                }
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition ${
                  ic === SECRET_ICON
                    ? form.icon === ic
                      ? "bg-amber-400/25 ring-2 ring-amber-300"
                      : "bg-amber-400/10 ring-1 ring-amber-400/50 hover:bg-amber-400/20"
                    : form.icon === ic
                      ? "bg-req/20 ring-1 ring-req"
                      : "bg-panel-2 hover:bg-white/10"
                }`}
              >
                {ic === SECRET_ICON ? <SecretBox size={26} animated={false} /> : ic}
              </button>
            ))}
          </div>
          {form.icon === SECRET_ICON && (
            <p className="col-span-6 rounded-lg bg-amber-400/10 px-3 py-2 text-[12px] text-amber-200 ring-1 ring-amber-400/30">
              Hộp Secret của minigame: điện thoại khán giả thấy ngay khi bạn bấm Gửi, ai mua được đầu tiên sẽ thắng.
            </p>
          )}
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
