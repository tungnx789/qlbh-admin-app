# QLBH Admin Web App

## 📋 Mô tả
Web app admin để quản lý hệ thống QLBH thay thế việc tương tác trực tiếp với Google Sheets. Cung cấp giao diện thân thiện và bảo mật cao cho admin.

## 🎯 Tính năng chính

### 📊 Dashboard
- Thống kê tổng quan: Tồn kho, Doanh thu, Nhập/Bán hàng
- Biểu đồ doanh thu theo tháng
- Top sản phẩm bán chạy

### 📦 Quản lý Tồn Kho
- Xem danh sách tồn kho với pagination
- Tìm kiếm và lọc theo dòng máy, dung lượng
- Thêm/sửa/xóa sản phẩm tồn kho
- Đồng bộ và tính lại tồn kho

### 📥 Lịch sử Nhập Hàng
- Xem lịch sử nhập hàng với pagination
- Lọc theo ngày, nhà cung cấp
- Thêm/sửa/xóa bản ghi nhập hàng
- Export dữ liệu

### 💰 Bán Hàng Theo Tháng
- Xem bán hàng theo từng tháng
- Thống kê doanh thu và lợi nhuận
- Thêm/sửa/xóa bản ghi bán hàng
- Pagination cho dữ liệu lớn

### 🗑️ Xuất Hủy / Trả NCC
- Xem danh sách xuất hủy
- Quản lý các loại xuất hủy
- Thêm/sửa/xóa bản ghi xuất hủy

### 🔍 Tìm kiếm IMEI
- Tìm lịch sử giao dịch theo IMEI
- Hiển thị timeline giao dịch
- Hỗ trợ tìm nhiều IMEI cùng lúc

### 📈 Báo Cáo Tồn Kho
- Xem báo cáo tồn kho theo dòng máy
- Tùy chỉnh số ngày báo cáo
- Export báo cáo Excel

### ⚙️ Admin Tools
- Đồng bộ dữ liệu
- Tính lợi nhuận
- Đối chiếu tồn kho
- Backup dữ liệu

## 🚀 Cài đặt

### 1. Setup Google Apps Script

1. Mở [Google Apps Script](https://script.google.com)
2. Tạo project mới
3. Copy nội dung file `api/QLBH_Admin_API.js` vào file `Code.gs`
4. Deploy as Web App:
   - Click "Deploy" > "New deployment"
   - Type: "Web app"
   - Execute as: "Me"
   - Who has access: "Anyone"
5. Copy URL deployment

### 2. Setup Frontend

1. Upload các file frontend lên hosting (GitHub Pages, Netlify, etc.)
2. Sửa URL API trong file `js/admin.js`:
   ```javascript
   const url = new URL('https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec');
   ```
   Thay `YOUR_SCRIPT_ID` bằng Script ID từ Google Apps Script

### 3. Cấu hình Google Sheets

Đảm bảo file QLBH có các sheet sau:
- `TonKho` - Tồn kho hiện tại
- `NhapHang` - Lịch sử nhập hàng
- `BanHangT01..12` - Bán hàng theo tháng
- `XuatHuy` - Xuất hủy/trả NCC
- `BaoCao` - Báo cáo tồn kho

## 📁 Cấu trúc file

```
QLBH_AdminApp/
├── index.html          # File HTML chính
├── css/
│   └── admin.css      # Stylesheet
├── js/
│   └── admin.js       # JavaScript chính
├── api/
│   └── QLBH_Admin_API.js  # Backend API
└── README.md          # Hướng dẫn này
```

## 🔧 API Endpoints

### GET Requests
- `getDashboard` - Lấy thống kê dashboard
- `getTonKho` - Lấy dữ liệu tồn kho
- `getNhapHang` - Lấy dữ liệu nhập hàng
- `getBanHang` - Lấy dữ liệu bán hàng
- `getXuatHuy` - Lấy dữ liệu xuất hủy
- `getBaoCao` - Lấy dữ liệu báo cáo
- `searchIMEI` - Tìm kiếm theo IMEI

### POST Requests
- `updateTonKho` - Cập nhật tồn kho
- `addTonKho` - Thêm tồn kho
- `updateNhapHang` - Cập nhật nhập hàng
- `addNhapHang` - Thêm nhập hàng
- `updateBanHang` - Cập nhật bán hàng
- `addBanHang` - Thêm bán hàng
- `updateXuatHuy` - Cập nhật xuất hủy
- `addXuatHuy` - Thêm xuất hủy
- `generateBaoCao` - Tạo báo cáo
- `syncData` - Đồng bộ dữ liệu
- `calculateProfit` - Tính lợi nhuận
- `compareTonKho` - Đối chiếu tồn kho
- `backupData` - Backup dữ liệu

## 🛡️ Bảo mật

### Điểm mạnh:
- ✅ Không truy cập trực tiếp Google Sheets
- ✅ Validation server-side
- ✅ Phân quyền rõ ràng (Admin only)
- ✅ Audit trail cho mọi thao tác

### Lưu ý:
- ⚠️ Cần setup authentication nếu deploy public
- ⚠️ Rate limiting cho API calls
- ⚠️ Backup dữ liệu thường xuyên

## 📱 Responsive Design

Web app được thiết kế responsive, hoạt động tốt trên:
- 💻 Desktop
- 📱 Mobile
- 📱 Tablet

## 🔄 Cập nhật

### Frontend:
1. Sửa file HTML/CSS/JS
2. Upload lại lên hosting

### Backend:
1. Sửa code trong Google Apps Script
2. Save và deploy lại

## 🐛 Troubleshooting

### Lỗi thường gặp:

1. **CORS Error**
   - Kiểm tra URL API trong `admin.js`
   - Đảm bảo Google Apps Script đã deploy đúng

2. **Data không load**
   - Kiểm tra tên sheet trong Google Sheets
   - Kiểm tra quyền truy cập file

3. **Charts không hiển thị**
   - Kiểm tra Chart.js CDN
   - Kiểm tra console errors

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra console browser (F12)
2. Kiểm tra logs trong Google Apps Script
3. Đảm bảo cấu hình đúng theo hướng dẫn

## 🎯 Roadmap

### Phase 1 (Hiện tại)
- ✅ Basic CRUD operations
- ✅ Dashboard với charts
- ✅ Pagination và filtering
- ✅ Responsive design

### Phase 2 (Tương lai)
- 🔄 Real-time updates
- 🔄 Advanced filtering
- 🔄 Export/Import Excel
- 🔄 User management
- 🔄 Audit logs

### Phase 3 (Tương lai)
- 🔄 Mobile app
- 🔄 Push notifications
- 🔄 Advanced analytics
- 🔄 Integration với hệ thống khác

---

**Phiên bản**: 1.0.0  
**Cập nhật**: 2024-10-22  
**Tác giả**: QLBH Development Team
