# Request X-Ray: demo seminar ASP.NET Core (SE347)

Cửa hàng mini và một "máy chụp X-quang" cho pipeline của ASP.NET Core. Mỗi request được backend ghi lại
từng chặng (Kestrel, Middleware, Routing, AuthN/AuthZ, Controller, Service) cùng số mili giây thật, rồi
frontend vẽ thành gói tin chạy qua các trạm, khớp sơ đồ 7 chặng ở slide 9 và 19.

| Thư mục | Nội dung |
|---|---|
| `backend/ProductApi` | ASP.NET Core 10 Web API (Controller-based), JWT, SignalR, Swagger UI |
| `frontend` | Next.js 16 + Tailwind 4, kết nối SignalR để nhận trace theo thời gian thực |

## Chạy

Cần .NET SDK 10 và Node.js 20 trở lên. Mở hai cửa sổ terminal.

```powershell
cd backend/ProductApi
dotnet run
```

Backend lắng nghe `http://0.0.0.0:5000`; Swagger UI ở `http://localhost:5000/swagger`.

```powershell
cd frontend
npm install
npm run dev -- -p 3001
```

Mở `http://localhost:3001`. Cổng 3001 để khỏi đụng project khác đang chạy ở 3000; muốn dùng cổng khác thì
đổi số trong lệnh, mã QR tự theo cổng của trang.

**Hôm thuyết trình** nên chạy bản build cho mượt và ổn định hơn:

```powershell
cd frontend
npm run build
npm run start -- -p 3001
```

### Cho điện thoại khán giả vào được

1. Laptop và điện thoại chung một Wi-Fi (hoặc bật hotspot từ điện thoại của nhóm cho laptop bắt).
   Wi-Fi trường thường chặn các máy nhìn thấy nhau, nên chuẩn bị hotspot.
2. Lần đầu chạy, Windows hỏi tường lửa cho `dotnet` và `node`: chọn cho phép cả **Private network**.
   Nếu lỡ bấm hủy, chạy PowerShell quyền Administrator:

   ```powershell
   New-NetFirewallRule -DisplayName "XRay demo" -Direction Inbound -Protocol TCP -LocalPort 5000,3001 -Action Allow -Profile Private
   ```

3. Mở trang **Đa client (QR)** trên máy chiếu. Trang tự lấy IP LAN của laptop để tạo mã QR trỏ tới `/shop`.

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
