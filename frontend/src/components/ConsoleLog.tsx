"use client";

import { useEffect, useRef } from "react";
import type { TraceDto } from "@/lib/trace";

export interface LogLine {
  id: string;
  trace: TraceDto;
}

/** Mô phỏng cửa sổ terminal của dotnet run: mỗi trace là hai dòng --> và <--. */
export default function ConsoleLog({ lines, height = 180 }: { lines: LogLine[]; height?: number }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [lines.length]);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[#03060c]">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-mono text-xs text-muted">Terminal · dotnet run · ILogger (Logging Middleware)</span>
      </div>
      <div ref={box} className="scroll-thin overflow-y-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed" style={{ height }}>
        {lines.length === 0 && <div className="text-muted">Now listening on: http://0.0.0.0:5000 — chờ request…</div>}
        {lines.map(({ id, trace: t }) => {
          const color = t.statusCode >= 500 ? "text-err" : t.statusCode >= 400 ? "text-block" : "text-ok";
          return (
            <div key={id}>
              <div>
                <span className="text-ok">info</span>: <span className="text-req">--&gt;</span> {t.method} {t.path}
                <span className="text-muted"> · {t.client}</span>
              </div>
              <div>
                <span className="text-ok">info</span>: <span className="text-res">&lt;--</span>{" "}
                <span className={color}>{t.statusCode}</span> {t.method} {t.path}
                <span className="text-muted"> trong {t.totalMs.toFixed(2)} ms</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
