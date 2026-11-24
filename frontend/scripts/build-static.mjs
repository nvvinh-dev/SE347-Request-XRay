// Xuất frontend thành file tĩnh rồi chép vào backend/ProductApi/wwwroot.
// Sau đó chỉ cần `dotnet run`: trang web, API và SignalR cùng ở http://localhost:5000.
import { execSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "out");
const target = join(root, "..", "backend", "ProductApi", "wwwroot");

execSync("npx next build", {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, STATIC_EXPORT: "1", NEXT_PUBLIC_SAME_ORIGIN: "1" },
});

if (!existsSync(out)) throw new Error("Không thấy thư mục out/ sau khi build");
rmSync(target, { recursive: true, force: true });
cpSync(out, target, { recursive: true });
console.log(`\nĐã chép bản tĩnh vào ${target}\nChạy backend: cd backend/ProductApi && dotnet run, rồi mở http://localhost:5000`);
