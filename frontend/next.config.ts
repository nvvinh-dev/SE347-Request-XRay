import type { NextConfig } from "next";
import os from "node:os";

// Điện thoại khán giả mở trang qua IP LAN của laptop (vd 192.168.1.5).
// Next dev chặn origin lạ, nên tự thêm mọi IPv4 của máy vào danh sách cho phép.
const lanHosts = Object.values(os.networkInterfaces())
  .flat()
  .filter((a): a is os.NetworkInterfaceInfo => !!a && a.family === "IPv4" && !a.internal)
  .map((a) => a.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: lanHosts,
};

export default nextConfig;
