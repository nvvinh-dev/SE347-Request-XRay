# Kịch bản demo Request X-Ray

Thời lượng: khoảng 6 phút 30, thay cho slide 20. Bắt đầu ngay sau slide 19 ("Chuyển giao sân khấu"), kết thúc
bằng việc quay lại slide 21.

Cách đọc: mỗi bước có **Thao tác** (người bấm làm gì), **Lời nói** (đọc gần nguyên văn được) và **Màn hình**
(khán giả sẽ thấy gì, để người nói chỉ vào đúng chỗ). Nên chia hai vai: một người nói, một người bấm. Nếu
một người làm cả hai thì bấm trước, nói trong lúc gói tin đang chạy.

---

## 0. Chuẩn bị (làm trước giờ thuyết trình, không tính thời gian)

1. Bật hotspot điện thoại, cho laptop bắt vào. Thử quét QR bằng một điện thoại khác, mua thử một món.
2. Terminal 1, để hiện trên màn hình, chữ to (Ctrl + cuộn chuột):

   ```powershell
   cd backend/ProductApi
   dotnet run
   ```

3. Terminal 2, chạy bản build rồi thu nhỏ cửa sổ:

   ```powershell
   cd frontend
   npm run build
   npm run start -- -p 3001
   ```

4. Mở trình duyệt, 2 tab theo thứ tự: `localhost:3001` và `localhost:3001/live`. Bấm F11 cho toàn màn hình.
   Sơ đồ và bảng "Phá thử" phải nằm trọn trong một màn hình, nên đừng phóng to quá mức sau: máy chiếu
   1280×720 hoặc 1366×768 để 100–110%, máy chiếu 1920×1080 tối đa 150%. Ở tab đầu chọn **Tốc độ: Chậm**,
   **Danh tính: admin**.
5. Gửi thử một request rồi **restart backend** (Ctrl + C, `dotnet run`) để kho hàng về như ban đầu: Đèn bàn LED
   còn 1, Loa mini còn 3.
6. Video quay sẵn toàn bộ kịch bản để trên màn hình nền, phòng khi máy hỏng.

---

## 1. Mở màn: trả lời câu hỏi ở slide 2 (khoảng 1 phút 30)

**Thao tác:** Chuyển từ slide 19 sang trình duyệt, tab X-Ray Pipeline. Để yên 2 giây cho khán giả nhìn cả màn hình.

**Lời nói:**
> "Ở slide 2 nhóm em đã hỏi: sau một cú click mua hàng thì chuyện gì xảy ra ở server? Lý thuyết đã có rồi,
> giờ mình chụp X-quang nó. Phía trên là sơ đồ 7 chặng y như slide 9, nhưng lần này không phải hình vẽ:
> mỗi số mili giây ở đây do chính ASP.NET Core đo khi request chạy thật."

**Thao tác:** Bấm nút **✅ Đường đi chuẩn** (ô đầu tiên của bảng "Phá thử" ngay dưới sơ đồ). Nút này gọi
`GET /api/products/1`, chính là con chuột không dây.

**Màn hình:** Chấm xanh chạy từ Client qua 6 trạm trên làn REQUEST, các trạm lần lượt viền xanh "✓ đi qua"
kèm số ms; chấm đổi màu vàng, chạy ngược làn RESPONSE về Client, hiện `200 OK`.

**Lời nói (trong lúc chấm đang chạy, chỉ tay theo):**
> "Kestrel nhận kết nối, Logging Middleware ghi một dòng log chiều vào, Routing nhìn method GET và URL rồi chọn
> đúng hàm GetById, AuthN/AuthZ thấy đây là endpoint công khai nên cho qua, Controller nhận dữ liệu, Service
> tra kho trong RAM. Rồi kết quả đi ngược về đúng con đường cũ."

**Thao tác:** Bấm vào trạm **Controller** trên sơ đồ, rồi cuộn xuống khung "Phim chụp chi tiết".

**Màn hình:** Khung chi tiết tô sáng các dòng của Controller: `Model Binding · phiên dịch` → `id = 1`.

**Lời nói:**
> "Đây là Model Binding ở slide 13: trên URL chỉ là chuỗi '1', framework tự dịch thành biến `int id = 1`.
> Toàn bộ hành trình ở server chỉ mất vài mili giây, phần lớn thời gian còn lại là đường truyền."

*Nếu được hỏi vì sao lần đầu chậm hơn:* lần đầu .NET phải biên dịch JIT code, các lần sau nhanh hơn nhiều.

**Thao tác:** Đổi **Tốc độ: Vừa** cho các bước sau. Không cần tự cuộn lên: bấm nút kế tiếp là trang tự cuộn
về sơ đồ.

---

## 2. Bảng "Phá thử": làm request gãy ở từng trạm (khoảng 3 phút 30)

**Lời nói (giới thiệu):**
> "Một đường đi đẹp thì chưa nói lên nhiều. Cái hay của pipeline là mỗi trạm có quyền chặn request lại và
> trả lời luôn, gọi là ngắt mạch, short-circuit ở slide 10. Ngay dưới sơ đồ là 9 cách làm hỏng request,
> mỗi cách sẽ gãy ở một trạm khác nhau."

Bấm lần lượt theo thứ tự trái sang phải, trên xuống dưới, bỏ qua nút đầu tiên vì đã làm ở bước 1. Mỗi nút:
bấm, chờ chấm quay về, nói. Sơ đồ và nút nằm cùng một màn hình nên không phải cuộn.

### 2.1 🔒 Chưa đăng nhập mà thêm hàng → 401

**Màn hình:** Chấm dừng ở trạm 4 **AuthN / AuthZ**, trạm rung và đỏ "✕ ngắt mạch"; Controller và Service
mờ "không chạm tới". Về Client: `401 Unauthorized`.

**Lời nói:**
> "Thêm hàng là việc của Admin. Request không mang token nên Authentication trả lời 'tôi không biết bạn là
> ai', Authorization chặn luôn với 401. Controller và Service mờ đi: chúng không hề bị gọi."

### 2.2 🚫 Khách đòi thêm hàng → 403

**Lời nói:**
> "Lần này có token, của tài khoản khách. Authentication biết rõ đây là Khách hàng, nhưng Authorization thấy
> endpoint cần vai trò Admin nên trả 403. Đây chính là ví dụ thẻ sinh viên ở slide 17: 401 là chưa quẹt thẻ,
> 403 là quẹt rồi nhưng không được vào phòng thí nghiệm."

**Thao tác (nếu còn thời gian):** Cuộn xuống khung chi tiết, chỉ vào dòng `JWT hợp lệ: Khách hàng · vai trò Customer`.

### 2.3 🧭 Gõ sai đường dẫn → 404 ở Routing

**Màn hình:** Chấm dừng ngay trạm 3 **Routing**.

**Lời nói:**
> "Gõ sai URL thì Routing không tìm được endpoint nào khớp, tự trả 404. Chúng em không viết dòng code nào cho
> trường hợp này, framework lo hết."

### 2.4 🧩 JSON gõ hỏng → 400 ở Model Binding

**Lời nói:**
> "Body gửi lên bị cắt cụt giữa chừng. Model Binding không dịch được JSON thành object Product nên trả 400,
> hàm Create trong Controller không bao giờ được gọi."

### 2.5 🧾 Tên trống, giá 0đ → 400 ở Validation

**Thao tác:** Sau khi chấm về, cuộn xuống khung chi tiết, chỉ vào dòng `Validation · vệ sĩ`.

**Lời nói:**
> "JSON lần này đúng cú pháp, nhưng dữ liệu vô lý: tên rỗng, giá 0 đồng. Hai attribute `[Required]` và
> `[Range]` trên model là người vệ sĩ ở slide 13. Có `[ApiController]`, framework tự chặn 400 và trả về đúng
> câu báo lỗi tiếng Việt mà nhóm viết trong attribute."

### 2.6 🔎 Sản phẩm số 999 → 404 ở Service

**Lời nói:**
> "Cũng là 404 nhưng khác hẳn lúc nãy. Lần này URL đúng, Routing cho qua, Controller nhận `id = 999`, xuống
> tận Service tra kho mới biết không có sản phẩm này. Cùng một mã lỗi, hai trạm khác nhau: xem trace là biết
> lỗi nằm ở đâu."

### 2.7 ♻️ Thêm trùng tên → 409 ở Service

**Lời nói:**
> "So sánh với 400 lúc nãy. Dữ liệu này hoàn toàn hợp lệ, vệ sĩ cho qua. Nhưng 'Chuột không dây' đã có trong
> kho, và chỉ Service mới biết luật nghiệp vụ đó, nên Service trả 409 Conflict. 400 là framework chặn, 409 là
> nghiệp vụ chặn."

### 2.8 💥 Kho hàng sập → 500

**Màn hình:** Chấm đi tới Service, trạm Service đỏ "⚠ exception"; trên đường về, trạm **Middleware** đỏ
"Exception bắt lỗi"; Client nhận `500`.

**Lời nói:**
> "Cuối cùng là sự cố thật: Service ném exception, kiểu như mất kết nối database. Trên đường về, Exception
> Middleware đứng sẵn ở slide 19 đón lấy và trả 500. Mọi người nhìn body response: chỉ có một câu 'Máy chủ
> gặp sự cố', không lộ tên class hay stack trace ra ngoài. Chi tiết lỗi chỉ nằm trong log của server."

**Thao tác:** Cuộn xuống khung Terminal cuối trang (hoặc chuyển sang cửa sổ Terminal 1 thật).

**Lời nói:**
> "Cửa sổ này là log của Logging Middleware: mỗi request có một dòng mũi tên đi vào và một dòng mũi tên đi ra.
> Cùng một middleware ghi cả hai chiều, đúng mô hình búp bê Nga ở slide 10."

---

## 3. Kết: một backend, nhiều client (khoảng 1 phút 30)

**Thao tác:** Chuyển sang tab **Đa client (QR)**. Phóng to cho mã QR rõ.

**Lời nói:**
> "Slide 7 nói một backend phục vụ mọi thiết bị. Giờ mời cả lớp làm client. Mọi người kết nối Wi-Fi
> [tên hotspot], quét mã này, nhập tên và mua một món bất kỳ. Ai nhanh tay thì mua được Đèn bàn LED, chỉ còn
> một cái thôi."

**Màn hình:** Bộ đếm "request đã nhận" và "client khác nhau" tăng; nhiều chấm cùng chạy trên pipeline; cột
"Đơn hàng mới nhất" hiện tên người mua; terminal chạy log liên tục.

**Lời nói (khi đã có khoảng 10 đơn):**
> "Mỗi chấm là request từ một điện thoại thật, tất cả đi chung một pipeline. Kho hàng là Singleton nên mọi
> người cùng nhìn một kho: Đèn bàn LED đã có người mua, người tới sau nhận 409 màu đỏ, và trên điện thoại của
> bạn cũng hiện request của mình bị chặn ở trạm Service."

*Nếu không ai vào được trong 30 giây:* "Mạng phòng học hơi khó tính, nhóm xin dừng phần này", rồi qua bước kết.

**Thao tác:** Quay lại slide 21.

**Lời nói (chuyển sang đúc kết):**
> "Vậy là chúng ta đã nhìn tận mắt ba thông điệp của bài: framework gọi code của mình, request đi qua một
> pipeline có thứ tự, và DI nối các tầng lại một cách lỏng lẻo. Giờ quay lại con chuột không dây ở slide 2:
> mọi người đã biết chuyện gì xảy ra ở server rồi."

---

## Phụ lục

### Phân bổ thời gian

| Bước | Thời lượng | Cộng dồn |
|---|---|---|
| 1. Mở màn, đường đi chuẩn | 1:30 | 1:30 |
| 2. Phá thử (8 nút) | 3:30 | 5:00 |
| 3. Đa client | 1:30 | 6:30 |

Nếu bị cắt giờ: ở bước 2 chỉ bấm 401, 403, 400, 409, 500 (bỏ 404 Routing, JSON hỏng, 404 Service), tiết kiệm
khoảng 1 phút 15.

### Khi có sự cố (tối đa 30 giây rồi chuyển)

| Sự cố | Xử lý |
|---|---|
| Thanh trên cùng báo "Mất kết nối backend" | Kiểm tra Terminal 1 còn chạy không, chạy lại `dotnet run`, tải lại trang |
| Gói tin không chạy, chỉ có kết quả | Tải lại trang (F5); vẫn lỗi thì dùng Swagger ở `localhost:5000/swagger` |
| Điện thoại không vào được | Bỏ bước 3, nói một câu rồi chuyển slide 21 |
| Máy treo hẳn | Chiếu video quay sẵn |

### Câu hỏi khán giả hay gặp

- **"Hoạt hình có phải vẽ sẵn không?"** Không. Mỗi lần bấm, backend ghi lại các chặng thật vào một trace, gửi
  qua SignalR, frontend chỉ phát chậm lại cho dễ nhìn. Số ms là số đo thật.
- **"Trace lấy ở đâu ra?"** Một middleware tự viết đứng đầu pipeline, cộng với filter của MVC và một bộ xử lý
  kết quả Authorization. Sổ ghi trace đăng ký Scoped: mỗi request một cuốn.
- **"Sao không dùng Minimal API?"** Như slide 12: Controller tách bạch Controller, Service, Model nên khớp
  với sơ đồ 7 chặng; bên dưới hai cách dùng chung pipeline, routing và DI.
- **"Mật khẩu để trong appsettings.json là sai nguyên tắc slide 16?"** Đúng, chỉ để demo cho dễ. Triển khai
  thật thì đặt qua biến môi trường hoặc User Secrets: theo slide 16, nguồn nạp sau ghi đè appsettings.json
  mà không cần sửa code.
