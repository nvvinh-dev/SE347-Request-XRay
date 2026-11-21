"use client";

import { useEffect, useRef, useState } from "react";
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { apiBase } from "./api";
import type { TraceDto } from "./trace";

export type HubStatus = "connecting" | "connected" | "reconnecting" | "offline";

/** Nghe mọi trace server phát qua SignalR (/hubs/trace). */
export function useTraceHub(onTrace: (t: TraceDto) => void): HubStatus {
  const [status, setStatus] = useState<HubStatus>("connecting");
  const handler = useRef(onTrace);

  useEffect(() => {
    handler.current = onTrace;
  }, [onTrace]);

  useEffect(() => {
    let disposed = false;
    const conn: HubConnection = new HubConnectionBuilder()
      .withUrl(`${apiBase()}/hubs/trace`)
      .withAutomaticReconnect([0, 1000, 2000, 5000, 5000, 10000])
      .configureLogging(LogLevel.None)
      .build();

    conn.on("trace", (t: TraceDto) => handler.current(t));
    conn.onreconnecting(() => setStatus("reconnecting"));
    conn.onreconnected(() => setStatus("connected"));
    conn.onclose(() => !disposed && setStatus("offline"));

    const start = async () => {
      try {
        await conn.start();
        if (!disposed) setStatus("connected");
      } catch {
        if (disposed) return;
        setStatus("offline");
        setTimeout(() => !disposed && conn.state === HubConnectionState.Disconnected && start(), 3000);
      }
    };
    start();

    return () => {
      disposed = true;
      conn.stop();
    };
  }, []);

  return status;
}
