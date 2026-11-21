"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { HubStatus } from "@/lib/useTraceHub";

const TABS = [
  { href: "/", label: "X-Ray Pipeline", icon: "🩻" },
  { href: "/live", label: "Đa client (QR)", icon: "📲" },
];

export default function TopBar({ hub, children }: { hub?: HubStatus; children?: React.ReactNode }) {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-req/30 to-info/30 text-xl ring-1 ring-req/40">
            🩻
          </span>
          <span className="leading-tight">
            <span className="block text-[17px] font-extrabold tracking-tight">
              Request <span className="text-req">X-Ray</span>
            </span>
            <span className="block text-[11px] text-muted">ASP.NET Core · SE347 · Nhóm 4</span>
          </span>
        </Link>

        <nav className="flex flex-wrap gap-1 rounded-2xl border border-line bg-panel/70 p-1">
          {TABS.map((t) => {
            const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                  active ? "bg-req/15 text-req ring-1 ring-req/40" : "text-muted hover:bg-white/5 hover:text-ink"
                }`}
              >
                <span className="mr-1.5">{t.icon}</span>
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          {children}
          {hub && <HubBadge status={hub} />}
        </div>
      </div>
    </header>
  );
}

function HubBadge({ status }: { status: HubStatus }) {
  const map: Record<HubStatus, [string, string]> = {
    connected: ["bg-ok", "SignalR đã kết nối"],
    connecting: ["bg-res blink", "Đang kết nối SignalR"],
    reconnecting: ["bg-res blink", "Đang nối lại SignalR"],
    offline: ["bg-err", "Mất kết nối backend"],
  };
  const [cls, text] = map[status];
  return (
    <span className="flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs text-muted">
      <span className={`h-2 w-2 rounded-full ${cls}`} />
      {text}
    </span>
  );
}
