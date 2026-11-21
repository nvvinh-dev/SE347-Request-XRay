// Client HTTP duy nhất của frontend. Mỗi lời gọi trả kèm X-Trace-Id
// để lấy về trace chi tiết của request đó.

export type Identity = "anonymous" | "khach" | "admin";

export interface ApiResult<T = unknown> {
  status: number;
  ok: boolean;
  data: T | null;
  traceId: string | null;
  method: string;
  path: string;
  clientMs: number;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  icon: string;
}

// Backend chạy cổng 5000 trên cùng máy. Dùng hostname của trang hiện tại
// để điện thoại (mở bằng IP LAN) cũng gọi đúng laptop.
export function apiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window === "undefined") return "http://localhost:5000";
  return `${window.location.protocol}//${window.location.hostname}:5000`;
}

const PASSWORDS: Record<Exclude<Identity, "anonymous">, string> = {
  admin: "admin123",
  khach: "khach123",
};

const tokenCache: Partial<Record<Identity, string>> = {};

export async function getToken(identity: Identity, clientName?: string): Promise<string | null> {
  if (identity === "anonymous") return null;
  if (tokenCache[identity]) return tokenCache[identity]!;
  const res = await call<{ token: string }>("POST", "/api/auth/login", {
    body: { username: identity, password: PASSWORDS[identity] },
    clientName,
  });
  if (!res.ok || !res.data) throw new Error("Không đăng nhập được tài khoản demo");
  tokenCache[identity] = res.data.token;
  return res.data.token;
}

export async function call<T = unknown>(
  method: string,
  path: string,
  opts: { body?: unknown; rawBody?: string; token?: string | null; clientName?: string } = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined || opts.rawBody !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.clientName) headers["X-Client-Name"] = encodeHeader(opts.clientName);

  const started = performance.now();
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers,
    body: opts.rawBody ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
  });
  const text = await res.text();
  let data: T | null = null;
  try {
    data = text ? (JSON.parse(text) as T) : null;
  } catch {
    data = text as unknown as T;
  }
  return {
    status: res.status,
    ok: res.ok,
    data,
    traceId: res.headers.get("X-Trace-Id"),
    method,
    path,
    clientMs: Math.round((performance.now() - started) * 10) / 10,
  };
}

// Header HTTP chỉ nhận ASCII: bỏ dấu tiếng Việt cho tên client.
function encodeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\x20-\x7e]/g, "")
    .slice(0, 24);
}

export function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

export function statusText(code: number): string {
  const map: Record<number, string> = {
    200: "OK",
    201: "Created",
    204: "No Content",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    500: "Internal Server Error",
  };
  return map[code] ?? "";
}
