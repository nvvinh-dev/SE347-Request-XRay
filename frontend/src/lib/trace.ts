import { apiBase } from "./api";

export type StationKey = "kestrel" | "middleware" | "routing" | "auth" | "controller" | "service";
export type Outcome = "pass" | "info" | "block" | "error";

export interface TraceStage {
  station: StationKey;
  step: string;
  outcome: Outcome;
  atMs: number;
  detail: string;
  direction: "in" | "out";
}

export interface TraceDto {
  id: string;
  method: string;
  path: string;
  client: string;
  statusCode: number;
  totalMs: number;
  startedAtUtc: string;
  stages: TraceStage[];
}

export interface StationMeta {
  key: StationKey | "client";
  label: string;
  sub: string;
  icon: string;
  slide: string;
}

// Nút 0 là Client, 6 nút sau là các chặng trong server (slide 9).
export const NODES: StationMeta[] = [
  { key: "client", label: "Client", sub: "Trình duyệt", icon: "💻", slide: "slide 2" },
  { key: "kestrel", label: "Kestrel", sub: "Web server", icon: "📡", slide: "slide 9" },
  { key: "middleware", label: "Middleware", sub: "Log · Exception", icon: "🚪", slide: "slide 10" },
  { key: "routing", label: "Routing", sub: "Method + URL", icon: "🧭", slide: "slide 11" },
  { key: "auth", label: "AuthN / AuthZ", sub: "Là ai · được gì", icon: "🛡️", slide: "slide 17" },
  { key: "controller", label: "Controller", sub: "Binding · Validation", icon: "🎛️", slide: "slide 12–13" },
  { key: "service", label: "Service", sub: "Nghiệp vụ · DI", icon: "⚙️", slide: "slide 14–15" },
];

export const nodeIndex = (key: StationKey) => NODES.findIndex((n) => n.key === key);

const severity: Record<Outcome, number> = { info: 0, pass: 1, block: 2, error: 3 };

export function worst(stages: TraceStage[]): Outcome | null {
  if (stages.length === 0) return null;
  return stages.reduce((w, s) => (severity[s.outcome] > severity[w] ? s.outcome : w), stages[0].outcome);
}

/** Chỉ số nút xa nhất request chạm tới trên chiều đi. */
export function farthestNode(trace: TraceDto): number {
  // Trạm ngắt mạch là điểm quay đầu, dù các middleware phía sau vẫn ghi chú thêm.
  const stop = blockedAt(trace);
  if (stop) return nodeIndex(stop);
  return trace.stages
    .filter((s) => s.direction === "in")
    .reduce((max, s) => Math.max(max, nodeIndex(s.station)), 1);
}

/** Trạm đã ngắt mạch request (nếu có). */
export function blockedAt(trace: TraceDto): StationKey | null {
  const s = trace.stages.find((x) => x.direction === "in" && (x.outcome === "block" || x.outcome === "error"));
  return s?.station ?? null;
}

export function stagesOf(trace: TraceDto, key: StationKey, direction?: "in" | "out") {
  return trace.stages.filter((s) => s.station === key && (!direction || s.direction === direction));
}

export async function fetchTrace(id: string): Promise<TraceDto | null> {
  // Trace được lưu ngay sau khi response gửi đi: thử lại vài lần nếu tới sớm.
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`${apiBase()}/api/traces/${id}`);
    if (res.ok) return (await res.json()) as TraceDto;
    await new Promise((r) => setTimeout(r, 120));
  }
  return null;
}

export function statusTone(code: number): "ok" | "block" | "err" {
  if (code >= 500) return "err";
  if (code >= 400) return "block";
  return "ok";
}
