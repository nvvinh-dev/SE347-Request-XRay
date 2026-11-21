"use client";

import { NODES, type TraceDto, type TraceStage } from "@/lib/trace";

const dot: Record<TraceStage["outcome"], string> = {
  pass: "bg-ok",
  info: "bg-info",
  block: "bg-block",
  error: "bg-err",
};

/** Danh sách từng bước backend đã ghi, chia chiều đi và chiều về. */
export default function StageList({ trace, highlight }: { trace: TraceDto | null; highlight?: string | null }) {
  if (!trace)
    return (
      <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted">
        <span className="text-3xl">🩻</span>
        Bấm một sản phẩm hoặc một nút “Phá thử” để chụp X-quang request.
      </div>
    );

  const groups: [string, TraceStage[]][] = [
    ["Chiều đi", trace.stages.filter((s) => s.direction === "in")],
    ["Chiều về", trace.stages.filter((s) => s.direction === "out")],
  ];

  return (
    <div className="space-y-4">
      {groups.map(([title, list]) => (
        <div key={title}>
          <div className={`mb-2 font-mono text-[11px] font-bold tracking-[0.18em] ${title === "Chiều đi" ? "text-req" : "text-res"}`}>
            {title.toUpperCase()}
          </div>
          <ol className="relative space-y-1.5 border-l border-line pl-4">
            {list.map((s, i) => {
              const meta = NODES.find((n) => n.key === s.station)!;
              const hl = highlight === s.station;
              return (
                <li key={i} className={`relative rounded-lg px-2 py-1.5 transition ${hl ? "bg-white/[0.06]" : ""}`}>
                  <span className={`absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full ring-4 ring-panel ${dot[s.outcome]}`} />
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-semibold">
                      <span className="mr-1">{meta.icon}</span>
                      {s.step}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-muted">{s.atMs.toFixed(2)} ms</span>
                  </div>
                  {s.detail && <div className="mt-0.5 break-words font-mono text-[11.5px] leading-snug text-muted">{s.detail}</div>}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
