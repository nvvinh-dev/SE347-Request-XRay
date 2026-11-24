"use client";

import { useEffect, useRef, useState } from "react";
import { HttpTransportType, HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { apiBase } from "./api";
import type { Product } from "./api";
import type { TraceDto } from "./trace";

export type HubStatus = "connecting" | "connected" | "reconnecting" | "offline";

/**
 * Nghe SignalR ở /hubs/trace: "trace" là mọi request vừa xử lý xong,
 * "products" là danh sách sản phẩm mới sau mỗi lần thêm hàng hoặc mua hàng.
 */
export function useTraceHub(onTrace: (t: TraceDto) => void, onProducts?: (p: Product[]) => void): HubStatus {
  const [status, setStatus] = useState<HubStatus>("connecting");
  const handler = useRef(onTrace);
  const productsHandler = useRef(onProducts);

  useEffect(() => {
    handler.current = onTrace;
    productsHandler.current = onProducts;
  }, [onTrace, onProducts]);

  useEffect(() => {
    let disposed = false;
    const conn: HubConnection = new HubConnectionBuilder()
      // Bỏ Server-Sent Events: quick tunnel của Cloudflare không hỗ trợ; còn WebSocket, lỗi thì long polling.
      .withUrl(`${apiBase()}/hubs/trace`, { transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling })
      .withAutomaticReconnect([0, 1000, 2000, 5000, 5000, 10000])
      .configureLogging(LogLevel.None)
      .build();

    conn.on("trace", (t: TraceDto) => handler.current(t));
    conn.on("products", (p: Product[]) => productsHandler.current?.(p));
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
