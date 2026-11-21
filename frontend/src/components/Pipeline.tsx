"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { statusText } from "@/lib/api";
import {
  NODES,
  type Outcome,
  type StationKey,
  type TraceDto,
  farthestNode,
  stagesOf,
  statusTone,
  worst,
} from "@/lib/trace";

export interface PacketRun {
  key: string;
  trace: TraceDto;
}

type Lane = "top" | "bottom";
interface Step {
  node: number;
  lane: Lane;
}

type NodeState = "idle" | "pass" | "info" | "block" | "error" | "skipped";

interface NodeView {
  state: NodeState;
  ms?: number;
  returned?: boolean;
  outError?: boolean;
}

const COLS = NODES.length;
const xPct = (i: number) => ((i + 0.5) / COLS) * 100;

function buildSteps(trace: TraceDto): Step[] {
  const f = farthestNode(trace);
  const steps: Step[] = [];
  for (let i = 0; i <= f; i++) steps.push({ node: i, lane: "top" });
  steps.push({ node: f, lane: "bottom" });
  for (let i = f - 1; i >= 0; i--) steps.push({ node: i, lane: "bottom" });
  return steps;
}

const toState = (o: Outcome | null): NodeState => (o === null ? "pass" : o);

// ───────────────────────────── Gói tin ─────────────────────────────
function Packet({
  run,
  hopMs,
  label,
  onHop,
  onDone,
}: {
  run: PacketRun;
  hopMs: number;
  label: boolean;
  onHop: (run: PacketRun, step: Step, index: number, total: number) => void;
  onDone: (run: PacketRun) => void;
}) {
  const steps = useMemo(() => buildSteps(run.trace), [run.trace]);
  const [k, setK] = useState(0);
  const hop = useRef(onHop);
  const done = useRef(onDone);
  hop.current = onHop;
  done.current = onDone;

  const isTurn = k > 0 && steps[k].lane === "bottom" && steps[k - 1].lane === "top";
  const duration = k === 0 ? 0 : isTurn ? hopMs * 0.55 : hopMs;

  useEffect(() => {
    const t = setTimeout(() => {
      hop.current(run, steps[k], k, steps.length);
      if (k >= steps.length - 1) setTimeout(() => done.current(run), 500);
      else setK(k + 1);
    }, k === 0 ? 40 : duration);
    return () => clearTimeout(t);
  }, [k, steps, duration, run]);

  const step = steps[k];
  const returning = step.lane === "bottom";
  const tone = statusTone(run.trace.statusCode);
  const color = !returning ? "var(--req)" : tone === "ok" ? "var(--res)" : tone === "err" ? "var(--err)" : "var(--block)";

  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{
        left: `${xPct(step.node)}%`,
        top: returning ? "calc(100% - 22px)" : "22px",
        transition: `left ${duration}ms cubic-bezier(.55,.05,.35,1), top ${duration}ms ease-in-out`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        className="h-[18px] w-[18px] rounded-full"
        style={{ background: color, boxShadow: `0 0 0 4px color-mix(in srgb, ${color} 25%, transparent), 0 0 26px 6px ${color}` }}
      />
      {label && (
        <div
          className="absolute left-1/2 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold text-bg"
          style={{ background: color, top: returning ? "-34px" : "18px" }}
        >
          {returning ? `${run.trace.statusCode} ${statusText(run.trace.statusCode)}` : `${run.trace.method} ${shortPath(run.trace.path)}`}
        </div>
      )}
    </div>
  );
}

function shortPath(p: string) {
  return p.length > 26 ? p.slice(0, 25) + "…" : p;
}

// ───────────────────────────── Bảng pipeline ─────────────────────────────
export default function Pipeline({
  runs,
  hopMs,
  mode = "single",
  selected,
  onSelect,
  onRunDone,
}: {
  runs: PacketRun[];
  hopMs: number;
  mode?: "single" | "swarm";
  selected?: number | null;
  onSelect?: (node: number) => void;
  onRunDone?: (key: string) => void;
}) {
  const [views, setViews] = useState<Record<number, NodeView>>({});
  const [flash, setFlash] = useState<Record<number, { tone: NodeState; id: number }>>({});
  const [finished, setFinished] = useState<TraceDto | null>(null);
  const flashId = useRef(0);
  const currentKey = runs.at(-1)?.key;

  // Chế độ single: mỗi gói tin mới thì xóa trạng thái cũ.
  useEffect(() => {
    if (mode !== "single") return;
    setViews({});
    setFinished(null);
  }, [currentKey, mode]);

  const handleHop = useCallback(
    (run: PacketRun, step: Step, index: number, total: number) => {
      const t = run.trace;
      const meta = NODES[step.node];
      if (mode === "swarm") {
        if (step.node === 0) return;
        const key = meta.key as StationKey;
        const tone = step.lane === "top" ? toState(worst(stagesOf(t, key, "in"))) : "pass";
        const id = ++flashId.current;
        setFlash((f) => ({ ...f, [step.node]: { tone, id } }));
        setTimeout(() => setFlash((f) => (f[step.node]?.id === id ? { ...f, [step.node]: { tone: "idle", id } } : f)), 650);
        return;
      }
      if (run.key !== currentKey) return;
      if (step.node === 0) {
        if (index === total - 1) setFinished(t);
        return;
      }
      const key = meta.key as StationKey;
      setViews((v) => {
        const next = { ...v };
        if (step.lane === "top") {
          const ins = stagesOf(t, key, "in");
          next[step.node] = { state: toState(worst(ins)), ms: ins[0]?.atMs };
        } else {
          const outs = stagesOf(t, key, "out");
          next[step.node] = { ...(next[step.node] ?? { state: "pass" }), returned: true, outError: outs.some((s) => s.outcome === "error") };
          if (index > 0) {
            // Lúc quay đầu: các trạm phía sau chưa từng chạm tới.
            for (let i = step.node + 1; i < COLS; i++) if (!next[i]) next[i] = { state: "skipped" };
          }
        }
        return next;
      });
    },
    [mode, currentKey],
  );

  const handleDone = useCallback((run: PacketRun) => onRunDone?.(run.key), [onRunDone]);

  return (
    <div className="relative h-[256px] w-full select-none [@media(min-height:880px)]:h-[300px]">
      {/* hai làn ống dẫn */}
      <div className="absolute" style={{ left: `${xPct(0)}%`, right: `${100 - xPct(COLS - 1)}%`, top: 21 }}>
        <div className="track h-[2px] text-req" />
      </div>
      <div className="absolute" style={{ left: `${xPct(0)}%`, right: `${100 - xPct(COLS - 1)}%`, bottom: 21 }}>
        <div className="track track-rev h-[2px] text-res" />
      </div>
      <div className="absolute right-0 top-0 font-mono text-[10px] font-bold tracking-[0.2em] text-req">REQUEST →</div>
      <div className="absolute bottom-0 right-0 font-mono text-[10px] font-bold tracking-[0.2em] text-res">← RESPONSE</div>

      {/* khung "server" bao 6 trạm */}
      <div
        className="absolute rounded-2xl border border-dashed border-line-strong/80"
        style={{ left: `${(1 / COLS) * 100 + 0.6}%`, right: "0.6%", top: 44, bottom: 44 }}
      >
        <span className="absolute -top-2.5 left-4 bg-bg px-2 text-[10px] font-semibold tracking-[0.2em] text-muted">
          ỨNG DỤNG ASP.NET CORE
        </span>
      </div>

      {/* các trạm */}
      <div className="absolute inset-x-0 grid" style={{ top: 56, bottom: 56, gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
        {NODES.map((n, i) => {
          const v = views[i];
          const f = flash[i];
          const state: NodeState = mode === "swarm" ? f?.tone ?? "idle" : v?.state ?? "idle";
          const isSel = selected === i;
          return (
            <button
              key={n.key}
              type="button"
              onClick={() => onSelect?.(i)}
              className={`group relative mx-1.5 flex flex-col items-center justify-center rounded-2xl border px-1 text-center transition-all duration-300 ${cardClass(state, v?.outError)} ${isSel ? "ring-2 ring-white/70" : ""} ${state === "block" || state === "error" ? "shake" : ""}`}
            >
              {i > 0 && (
                <span className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-line-strong text-[10px] font-bold text-ink">
                  {i}
                </span>
              )}
              {v?.returned && mode === "single" && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-res" title="Đã đi qua ở chiều về" />
              )}
              <span className="text-3xl leading-none drop-shadow-[0_0_12px_rgba(34,211,238,0.35)]">{n.icon}</span>
              <span className="mt-2 text-sm font-bold leading-tight">{n.label}</span>
              <span className="text-[11px] leading-tight text-muted">{n.sub}</span>
              <span className="mt-1.5 h-4 font-mono text-[11px]">
                {mode === "single" && i > 0 && v?.ms !== undefined && <span className="text-req">+{v.ms.toFixed(2)} ms</span>}
                {mode === "single" && i === 0 && finished && <span className="text-res">{finished.totalMs.toFixed(2)} ms</span>}
              </span>
              <span className="h-4 text-[11px] font-semibold">{stateLabel(state, v?.outError)}</span>
            </button>
          );
        })}
      </div>

      {runs.map((r) => (
        <Packet key={r.key} run={r} hopMs={hopMs} label={mode === "single"} onHop={handleHop} onDone={handleDone} />
      ))}
    </div>
  );
}

export const toneColor = (t: "ok" | "block" | "err") => (t === "ok" ? "var(--ok)" : t === "err" ? "var(--err)" : "var(--block)");

function cardClass(state: NodeState, outError?: boolean) {
  if (outError) return "border-err bg-err/10 glow-err";
  switch (state) {
    case "pass":
      return "border-ok/60 bg-ok/[0.07] glow-ok";
    case "info":
      return "border-info/60 bg-info/[0.08]";
    case "block":
      return "border-block bg-block/10 glow-block";
    case "error":
      return "border-err bg-err/10 glow-err";
    case "skipped":
      return "border-line bg-panel/40 opacity-35 grayscale";
    default:
      return "border-line bg-panel/80 hover:border-line-strong";
  }
}

function stateLabel(state: NodeState, outError?: boolean) {
  if (outError) return <span className="text-err">Exception bắt lỗi</span>;
  switch (state) {
    case "pass":
      return <span className="text-ok">✓ đi qua</span>;
    case "info":
      return <span className="text-info">● ghi nhận</span>;
    case "block":
      return <span className="text-block">✕ ngắt mạch</span>;
    case "error":
      return <span className="text-err">⚠ exception</span>;
    case "skipped":
      return <span className="text-muted">không chạm tới</span>;
    default:
      return null;
  }
}
