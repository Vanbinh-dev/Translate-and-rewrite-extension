# Adjusting Writing Style (Translate and Rewrite Extension)

Tiện ích mở rộng (Browser Extension) trên nền tảng Chromium giúp độc giả tự động chuẩn hóa và thay thế các thuật ngữ không đồng nhất trong quá trình đọc truyện chữ, Light Novel và Web Novel trực tuyến.

---

## 1. Đối tượng sử dụng

Tiện ích này được xây dựng dành cho:
* **Độc giả truyện chữ, Light Novel, Web Novel:** Những người thường xuyên đọc các tác phẩm dài tập trên trình duyệt web.
* **Người đọc các bản dịch tổng hợp hoặc dịch máy (MTL):** Nơi các chương truyện do nhiều dịch giả khác nhau đảm nhận hoặc do công cụ dịch máy xử lý, dẫn đến việc dùng từ lộn xộn, thiếu nhất quán.
* **Người đọc muốn cá nhân hóa trải nghiệm:** Muốn đọc tên nhân vật, địa danh, chiêu thức theo đúng cách dịch hoặc phiên âm quen thuộc mà mình yêu thích.

---

## 2. Vấn đề: Sự khác biệt giữa các bản dịch

Trong quá trình đọc các bộ tiểu thuyết dài tập, hiện tượng **bất nhất quán thuật ngữ** xảy ra rất phổ biến:
* **Khác biệt giữa các dịch giả:** Chương 1 đến 50 do nhóm A dịch, dịch cụm từ *"Crimson"* thành *"Xích Hoàn"*. Từ chương 51 trở đi do nhóm B dịch, lại đổi thành *"Xích Thành"*.
* **Khác biệt giữa phiên âm và Hán Việt:** Cùng một nhân vật hay danh hiệu, lúc thì gọi là *"Ngu Giả"*, lúc lại để là *"Kẻ Khờ"*, lúc lại dùng tên gốc *"The Fool"*.
* **Gánh nặng cho người đọc:** Khi gặp các thuật ngữ bị thay đổi liên tục, độc giả buộc phải dừng lại để tự "dịch nhẩm" và chắp vá nghĩa trong đầu. Điều này làm gián đoạn mạch cảm xúc và gây cảm giác khó chịu khi thưởng thức tác phẩm.

Tiện ích này ra đời nhằm loại bỏ hoàn toàn sự phiền toái đó bằng cách tự động tìm kiếm và hoán đổi các cụm từ này trực tiếp trên trang web, giúp câu văn hiển thị tự nhiên và liền mạch như thể bản dịch gốc vốn đã được viết như vậy.

---

## 3. Cách tải và cài đặt

### Cài đặt từ mã nguồn (Raw Repository)
Hiện tại tiện ích đang trong giai đoạn phát triển, bạn có thể cài đặt trực tiếp từ mã nguồn theo các bước sau:

1. **Tải mã nguồn về máy tính:**
   * *Cách 1 (Dùng Git):*
     ```bash
     git clone https://github.com/Vanbinh-dev/Translate-and-rewrite-extension.git
     ```
   * *Cách 2 (Tải file ZIP):* Bấm vào nút **Code** trên trang GitHub này $\rightarrow$ chọn **Download ZIP**, sau đó giải nén ra một thư mục trên máy tính.

2. **Cài đặt vào trình duyệt (Chrome, Edge, Brave, Cốc Cốc):**
   * Mở trình duyệt và truy cập vào trang quản lý tiện ích:
     * Google Chrome / Brave / Cốc Cốc: `chrome://extensions/`
     * Microsoft Edge: `edge://extensions/`
   * Bật công tắc **Chế độ dành cho nhà phát triển (Developer mode)** ở góc trên bên phải màn hình.
   * Bấm vào nút **Tải tiện ích đã giải nén (Load unpacked)** ở góc trên bên trái.
   * Chọn thư mục mã nguồn vừa tải về (thư mục chứa file `manifest.json`).
   * Ghim (Pin) biểu tượng tiện ích lên thanh công cụ của trình duyệt để tiện sử dụng.

### Cài đặt qua Chrome Web Store
* Đường dẫn: *(Hiện tại chưa xuất bản — sẽ cập nhật sau)*

---

## 4. Các chức năng cung cấp

* **Thay thế triệt để không dấu vết:** Can thiệp trực tiếp vào tầng Text Node của văn bản. Không bọc thẻ lạ, không làm nhảy bố cục dòng, không làm đổi font chữ hay kiểu cách nguyên bản của trang web.
* **Tự động bảo toàn quy tắc viết hoa / viết thường (`CasePreserver`):**
  * Viết thường: `xích` $\rightarrow$ `hồng`
  * Viết hoa chữ đầu: `Xích` $\rightarrow$ `Hồng`
  * Viết hoa toàn bộ: `XÍCH` $\rightarrow$ `HỒNG`
  * Áp dụng chuẩn xác cho cả các cụm từ nhiều chữ: `Xích Thành` $\rightarrow$ `Xích Hoàn`.
* **Tương thích với mọi kiểu trang web:** Tích hợp bộ lắng nghe biến động DOM (`MutationObserver`), hoạt động tốt trên cả các trang web giải mã nội dung động (như `ln.hako.vn`), trang tĩnh (`vidian.vn`), lẫn các trang tải chương vô tận (SPA).
* **Giao diện quản lý gọn gàng (Popup):**
  * Form nhập cặp từ gốc và từ thay thế nhanh chóng.
  * Danh sách các cặp từ đã lưu kèm thanh cuộn mượt mà (slim scrollbar).
  * Xóa từng từ hoặc xóa toàn bộ danh sách khi cần.
* **Nhập / Xuất (Import / Export) từ điển:**
  * Hỗ trợ lưu trữ và chuyển đổi từ điển qua file `.txt` đơn giản.
  * Dễ dàng sao lưu hoặc chia sẻ danh sách từ vựng cho độc giả khác.
* **4 nút điều hướng chính:**
  * `Home`: Quay về đầu danh sách và tập trung vào ô nhập từ.
  * `Login`: Bật/tắt trạng thái đồng bộ tài khoản.
  * `Import`: Nạp danh sách từ vựng hàng loạt từ file text `.txt`.
  * `Export`: Tải danh sách từ vựng hiện có về máy dưới dạng file text `.txt`.
* **Bảo mật và riêng tư:** Dữ liệu từ điển được lưu trữ cục bộ 100% trong `chrome.storage.local` của trình duyệt, không gửi dữ liệu người đọc ra bất kỳ máy chủ bên ngoài nào.

---

## 5. Hướng dẫn sử dụng

### Thêm từ cần thay thế thủ công
1. Bấm vào biểu tượng tiện ích trên thanh công cụ trình duyệt.
2. Tại khung **Nhập cặp từ cần thay thế**:
   * Ô **Từ gốc**: Nhập từ bạn muốn đổi (ví dụ: `Xích Thành`).
   * Ô **Từ thay thế**: Nhập từ bạn muốn hiển thị (ví dụ: `Xích Hoàn`).
3. Tích chọn *"Bảo toàn quy tắc chữ hoa / thường"* nếu muốn tiện ích tự động nhận diện kiểu chữ.
4. Bấm nút **Thêm vào danh sách** (hoặc nhấn phím `Enter`).
5. Trang truyện đang mở sẽ tự động cập nhật văn bản ngay lập tức.

### Nhập danh sách từ từ file text (Import)
1. Chuẩn bị file `.txt` với định dạng mỗi dòng một cặp từ:
   ```text
   # Ghi chú: Định dạng từ_gốc - từ_thay_thế
   Xích Thành - Xích Hoàn
   Ngu Giả - Kẻ Khờ
   Dorothy - Đóa La Tây
   ```
2. Bấm nút **Import** trên thanh công cụ popup và chọn file `.txt` vừa tạo.
3. Toàn bộ từ vựng hợp lệ sẽ được nạp vào tiện ích ngay lập tức.

### Xuất file từ điển (Export)
1. Bấm nút **Export** trên thanh công cụ popup.
2. Tiện ích sẽ tạo và tải về máy một file text `.txt` chứa toàn bộ danh sách từ đang có.

---

## 6. Chức năng có thể có trong tương lai

* **Chuột phải đổi nhanh (Context Menu):** Cho phép bôi đen trực tiếp một từ trên trang truyện $\rightarrow$ Click chuột phải $\rightarrow$ Chọn *"Đổi từ này thành..."* để thêm từ mà không cần mở popup.
* **Phân nhóm từ điển theo từng bộ truyện (Per-Novel Scope):** Tự động nhận diện URL của bộ truyện đang đọc và chỉ áp dụng bộ từ vựng của riêng truyện đó, tránh ảnh hưởng sang các truyện khác.
* **Tích hợp mô hình AI cá nhân hóa (Bring Your Own Key):** Cho phép người dùng kết nối khóa API của riêng mình để trau chuốt lại toàn bộ câu văn, sửa lỗi hành văn máy móc và chuyển đổi văn phong mượt mà hơn.
* **Kho từ điển chia sẻ cộng đồng:** Cho phép độc giả tải về các bộ từ điển đã được cộng đồng chuẩn hóa sẵn cho từng bộ truyện nổi tiếng.
