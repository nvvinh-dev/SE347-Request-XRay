import type { NextConfig } from "next";
import os from "node:os";

// Điện thoại khán giả mở trang qua IP LAN của laptop (vd 192.168.1.5).
// Next dev chặn origin lạ, nên tự thêm mọi IPv4 của máy vào danh sách cho phép.
const lanHosts = Object.values(os.networkInterfaces())
  .flat()
  .filter((a): a is os.NetworkInterfaceInfo => !!a && a.family === "IPv4" && !a.internal)
  .map((a) => a.address);

// `npm run build:static` đặt STATIC_EXPORT=1: xuất HTML/JS tĩnh để ASP.NET Core tự phục vụ,
// khi đó frontend, API và SignalR dùng chung một địa chỉ (cần cho tunnel).
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  allowedDevOrigins: lanHosts,
  ...(staticExport ? { output: "export", trailingSlash: true } : {}),
};

export default nextConfig;
