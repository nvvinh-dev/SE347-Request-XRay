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
| `/live` | Mã QR, nhiều gói tin cùng lúc từ nhiều điện thoại, kho hàng Singleton dùng chung | 6, 7 |
| `/shop` | Trang cho điện thoại: nhập tên, bấm mua, thấy request của mình đi qua những trạm nào | 7 |

Tài khoản demo (nằm trong `appsettings.json`): `admin` / `admin123` (vai trò Admin), `khach` / `khach123`
(vai trò Customer). Trang chính tự đăng nhập theo nút **Danh tính** trên thanh trên cùng.

## Kịch bản demo gợi ý (khoảng 6 phút)

Bản đầy đủ có lời nói, thao tác từng bước, phân bổ thời gian và cách xử lý sự cố: [KICH-BAN-DEMO.md](KICH-BAN-DEMO.md).
Dưới đây là bản tóm tắt.

Đi kèm slide 20 (lộ trình 8 bước) và slide 21 (link sản phẩm). Đặt tốc độ **Vừa**; phóng to trình duyệt theo giới hạn ghi trong kịch bản để sơ đồ và bảng Phá thử vẫn nằm trọn một màn hình.

1. **Mở đầu, nhắc lại slide 2.** Ở trang X-Ray, bấm nút "Đường đi chuẩn" (con chuột không dây). Gói tin đi hết 6 trạm, quay về
   `200 OK`. Chỉ vào các số ms: "toàn bộ hành trình chưa tới 1 mili giây ở server". Bấm từng trạm để soi
   chi tiết: Routing khớp `GET api/products/{id:int}`, Model Binding biến `"1"` thành `id = 1`.
2. **Bảng Phá thử, lần lượt từ trên xuống.** Mỗi lần gói tin đỏ lên ở một trạm khác:
   - 401 và 403 dừng ở AuthN/AuthZ: "chưa biết bạn là ai" khác "biết rồi nhưng không đủ quyền".
   - 404 Routing (sai đường) khác 404 Service (đúng đường, không có sản phẩm 999).
   - JSON hỏng (Model Binding) và tên trống (Validation) đều 400, Controller không bị gọi.
   - Trùng tên 409: hợp lệ về dữ liệu nhưng nghiệp vụ không cho, chỉ Service biết.
   - Kho hàng sập 500: Exception Middleware đón lỗi ở chiều về, client không thấy chi tiết exception.
3. **Terminal phía dưới** là log thật của Logging Middleware, cùng một middleware ghi cả hai chiều.
4. **Kết: Đa client.** Chiếu mã QR, mời cả lớp mua hàng. Gói tin từ nhiều điện thoại chạy cùng lúc; mặt
   hàng ít tồn kho (Đèn bàn LED còn 1, Loa mini còn 3) hết rất nhanh và người mua sau nhận 409.

Dữ liệu nằm trong RAM: muốn trả kho về ban đầu trước khi diễn thì chỉ cần restart backend.

### Khi có sự cố (tối đa 30 giây rồi chuyển)

- Giao diện lỗi: dùng `backend/ProductApi/ProductApi.http` hoặc Swagger UI, kết quả trace xem ở
  `GET /api/traces?take=5`.
- Mạng phòng học không cho điện thoại vào: bỏ phần QR, chỉ demo trên laptop.
- Nên quay sẵn một video toàn bộ kịch bản trên.

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
