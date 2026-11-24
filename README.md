# Request X-Ray: demo seminar ASP.NET Core (SE347)

Cửa hàng mini và một "máy chụp X-quang" cho pipeline của ASP.NET Core. Mỗi request được backend ghi lại
từng chặng (Kestrel, Middleware, Routing, AuthN/AuthZ, Controller, Service) cùng số mili giây thật, rồi
frontend vẽ thành gói tin chạy qua các trạm, khớp sơ đồ 7 chặng ở slide 9 và 19.

| Thư mục | Nội dung |
|---|---|
| `backend/ProductApi` | ASP.NET Core 10 Web API (Controller-based), JWT, SignalR, Swagger UI |
| `frontend` | Next.js 16 + Tailwind 4, kết nối SignalR để nhận trace theo thời gian thực |

## Chạy

Cần .NET SDK 10 và Node.js 20 trở lên.

### Khi phát triển (hai server)

```powershell
cd backend/ProductApi
dotnet run
```

```powershell
cd frontend
npm install
npm run dev -- -p 3001
```

Mở `http://localhost:3001`. Backend lắng nghe `http://0.0.0.0:5000`, Swagger UI ở `http://localhost:5000/swagger`.
Cổng 3001 để khỏi đụng project khác đang chạy ở 3000.

### Khi thuyết trình (một địa chỉ duy nhất)

Xuất frontend thành file tĩnh và để ASP.NET Core tự phục vụ bằng Static Files middleware: trang web, API và
SignalR cùng nằm ở `http://localhost:5000`, không cần chạy server Next.js.

```powershell
cd frontend
npm install
npm run build:static
```

```powershell
cd backend/ProductApi
dotnet run
```

Mở `http://localhost:5000`. Sửa frontend thì chạy lại `npm run build:static` rồi tải lại trang (không cần
restart backend). Thư mục `backend/ProductApi/wwwroot` do lệnh này sinh ra, không đưa lên git.

### Cho cả lớp vào bằng 4G hoặc Wi-Fi riêng: Cloudflare Tunnel

Quick tunnel của Cloudflare miễn phí, không cần tài khoản: nó cấp một địa chỉ `https://….trycloudflare.com`
trỏ về `localhost:5000`, khán giả vào bằng mạng của chính họ, không cần chung Wi-Fi với laptop.

1. Cài `cloudflared` (một lần):

   ```powershell
   winget install --id Cloudflare.cloudflared
   ```

2. Chạy backend ở chế độ thuyết trình như trên, rồi mở thêm một terminal:

   ```powershell
   cloudflared tunnel --url http://localhost:5000
   ```

   Chờ dòng có địa chỉ `https://<tên-ngẫu-nhiên>.trycloudflare.com` (mỗi lần chạy ra một địa chỉ khác).

3. Trên laptop, mở **chính địa chỉ đó** thêm `/live`, ví dụ `https://abc-xyz.trycloudflare.com/live`. Mã QR
   tự trỏ tới `https://abc-xyz.trycloudflare.com/shop`. Nếu mở bằng `localhost`, mã QR sẽ dùng IP LAN.

Laptop cần có internet (có thể bắt 4G từ điện thoại). Mỗi lượt mua chỉ vài KB. Quick tunnel dành cho thử
nghiệm và giới hạn số request xử lý cùng lúc (khoảng 200), dư cho một lớp học. SignalR dùng WebSocket qua
tunnel; nếu không được thì tự chuyển sang long polling.

### Cho điện thoại vào qua mạng LAN (không dùng tunnel)

1. Laptop và điện thoại chung một Wi-Fi hoặc hotspot. Wi-Fi trường thường chặn các máy nhìn thấy nhau.
   Hotspot điện thoại thường chỉ cho khoảng 5–10 máy kết nối.
2. Windows thường xếp mạng mới vào loại **Public**: vào Settings → Network, đặt mạng đó là **Private network**.
   Lần đầu chạy, Windows hỏi tường lửa cho `dotnet`: cho phép mạng Private. Nếu lỡ bấm hủy, chạy PowerShell
   quyền Administrator:

   ```powershell
   New-NetFirewallRule -DisplayName "XRay demo" -Direction Inbound -Protocol TCP -LocalPort 5000,3001 -Action Allow -Profile Private
   ```

3. Mở `http://localhost:5000/live` trên máy chiếu. Trang tự lấy IP LAN của laptop để tạo mã QR trỏ tới `/shop`.

## Các màn hình

| Trang | Minh họa | Slide |
|---|---|---|
| `/` X-Ray Pipeline | Gói tin đi qua 6 trạm, chiều về; bảng "Phá thử" 9 kịch bản ngay dưới sơ đồ; terminal log `-->` / `<--` | 8–13, 17, 19 |
| `/live` | Mã QR, nhiều gói tin cùng lúc từ nhiều điện thoại, danh sách mọi đơn hàng theo thứ tự đến server, người thắng minigame | 6, 7 |
| `/shop` | Trang cho điện thoại: nhập MSSV 8 số (sai hoặc thiếu thì không mua được), bấm mua, thấy request của mình đi qua những trạm nào | 7 |

Tài khoản demo (nằm trong `appsettings.json`): `admin` / `admin123` (vai trò Admin), `khach` / `khach123`
(vai trò Customer). Trang chính tự đăng nhập theo nút **Danh tính** trên thanh trên cùng.

## Minigame hộp Secret

- Sản phẩm nào có biểu tượng 📦 (nút hộp vàng trong ô chọn biểu tượng ở form "Thêm sản phẩm") là hộp Secret.
  Chọn biểu tượng này thì form tự điền tên "Hộp Secret" và tồn kho 1, sửa lại nếu muốn.
- Backend phát danh sách sản phẩm qua SignalR mỗi khi thêm hàng hoặc có người mua, nên điện thoại thấy hộp
  Secret và tồn kho mới ngay, không cần tải lại trang.
- Người thắng là đơn mua thành công đầu tiên của hộp Secret theo thời điểm đến server. Danh sách đơn hàng giữ
  toàn bộ đơn (đánh số #1, #2, …), tải lại trang vẫn dựng lại được từ 300 trace gần nhất.
- MSSV được kiểm ở cả hai phía: điện thoại khóa nút Mua khi chưa đủ 8 chữ số, backend trả 400 nếu gửi sai.

Dữ liệu nằm trong RAM: muốn trả kho về ban đầu trước khi diễn thì chỉ cần restart backend.

## Code đáng mở khi thuyết trình

| File | Nói về |
|---|---|
| `backend/ProductApi/Program.cs` | Đăng ký DI và thứ tự pipeline |
| `Controllers/ProductsController.cs` | `[ApiController]`, route, constructor injection, 200/201/404/409 |
| `Models/Product.cs` | `[Required]`, `[Range]`: Validation tự chặn 400 |
| `Tracing/TraceMiddleware.cs` | Middleware tự viết: log hai chiều, Exception Middleware |
| `Tracing/TraceRecorder.cs` | Ví dụ thật của Scoped (sổ ghi mỗi request) và Singleton (kho trace) |
| `Tracing/TraceFilters.cs` | Ghi chặng Routing, Authentication, Authorization, Model Binding, Validation |

Lưu ý: khóa JWT và mật khẩu demo để trong `appsettings.json` cho dễ trình bày. Ứng dụng thật đặt chúng qua
biến môi trường hoặc User Secrets (slide 16), ví dụ `$env:Jwt__Key="..."`.
