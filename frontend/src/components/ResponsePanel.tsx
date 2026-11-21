"use client";

import { type ApiResult, statusText } from "@/lib/api";
import type { TraceDto } from "@/lib/trace";

export default function ResponsePanel({ res, trace }: { res: ApiResult | null; trace: TraceDto | null }) {
  if (!res) return null;
  const tone = res.status >= 500 ? "bg-err" : res.status >= 400 ? "bg-block" : "bg-ok";
  return (
    <div className="pop rounded-2xl border border-line bg-panel-2/70 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-lg px-2.5 py-1 font-mono text-sm font-extrabold text-bg ${tone}`}>
          {res.status} {statusText(res.status)}
        </span>
        <span className="font-mono text-sm">
          <b className="text-req">{res.method}</b> {res.path}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <Metric label="Server xử lý" value={trace ? `${trace.totalMs.toFixed(2)} ms` : "…"} tone="text-res" />
        <Metric label="Trình duyệt chờ" value={`${res.clientMs} ms`} tone="text-req" />
      </div>
      <pre className="scroll-thin mt-3 max-h-40 overflow-auto rounded-xl bg-[#03060c] p-3 font-mono text-[11.5px] leading-relaxed text-ink/90">
        {res.data === null ? "(body trống)" : JSON.stringify(res.data, null, 2)}
      </pre>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg/40 py-2">
      <div className={`font-mono text-base font-bold ${tone}`}>{value}</div>
      <div className="text-[10.5px] text-muted">{label}</div>
    </div>
  );
}
