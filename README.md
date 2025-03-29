# Mô phỏng vòng từ giao thông (Traffic Loop Sensor Simulation)

Dự án này cung cấp mô phỏng trực quan về nguyên lý hoạt động của vòng từ giao thông (loop sensor) dùng trong đo lường và giám sát giao thông.

## 1. Giới thiệu ý tưởng - tại sao dùng JS để làm animation minh họa giao thông

JavaScript được chọn để xây dựng mô phỏng vòng từ giao thông vì những lý do sau:

- **Tính tương tác cao**: JavaScript cho phép tạo ra các mô phỏng có tính tương tác, người dùng có thể điều chỉnh các tham số (tốc độ xe, khoảng cách vòng từ, độ dài xe) và quan sát kết quả ngay lập tức.

- **Hiệu ứng động thời gian thực**: Sử dụng `requestAnimationFrame()` của JavaScript để tạo chuyển động mượt mà, giúp hiển thị chính xác quá trình xe di chuyển và tương tác với vòng từ.

- **Tính toán thời gian chính xác**: JavaScript cho phép đo lường thời gian chính xác (thông qua `performance.now()`) để mô phỏng cách vòng từ hoạt động thực tế trong việc đo lường tốc độ và thời gian chiếm dụng.

- **Trực quan hóa dữ liệu**: Dễ dàng biểu diễn dữ liệu (tín hiệu xung, thời gian, tốc độ) bằng hình ảnh và màu sắc, giúp người xem hiểu rõ nguyên lý hoạt động.

- **Khả năng truy cập rộng rãi**: Mô phỏng dựa trên web có thể chạy trên nhiều thiết bị, nền tảng khác nhau mà không cần cài đặt phần mềm bổ sung.

## 2. Công nghệ sử dụng - HTML, CSS, JS, thư viện

Dự án sử dụng các công nghệ web tiêu chuẩn kết hợp với một số thư viện hỗ trợ:

### Phiên bản cơ bản:
- **HTML5**: Cấu trúc cơ bản của trang và các thành phần mô phỏng
- **CSS3**: Định dạng giao diện và các hiệu ứng trực quan
- **JavaScript**: Xử lý logic mô phỏng, tính toán và animation

### Phiên bản cải tiến (Bootstrap):
- **Bootstrap 5**: Framework CSS cho giao diện responsive, hiện đại
- **jQuery**: Đơn giản hóa thao tác DOM và xử lý sự kiện
- **Font Awesome**: Cung cấp các biểu tượng trực quan (xe, nút điều khiển)

### Các API JavaScript chính sử dụng:
- `requestAnimationFrame()`: Tạo animation mượt mà với hiệu suất tối ưu
- `performance.now()`: Đo thời gian chính xác để tính toán
- Web API DOM: Thao tác với các phần tử HTML và CSS

## 3. Cấu trúc code - chia làm phần nào?

Mã nguồn được tổ chức theo cấu trúc rõ ràng, chia thành các phần có nhiệm vụ riêng biệt:

### Background (Phần nền):
- **Road Section**: Biểu diễn đường giao thông và vạch kẻ đường
- **Loop Sensors**: Vị trí và biểu diễn trực quan của vòng từ
- **Distance Indicators**: Hiển thị khoảng cách giữa các vòng từ
- **Formula Box**: Hiển thị công thức tính toán tốc độ

### Objects (Đối tượng):
- **Vehicle**: Mô phỏng xe di chuyển với tốc độ và kích thước có thể điều chỉnh
- **Signal Pulse**: Biểu diễn tín hiệu điện khi xe đi qua vòng từ
- **Time Markers**: Đánh dấu thời điểm xe tương tác với vòng từ
- **Moving Timer**: Hiển thị thời gian thực trong quá trình mô phỏng

### Animation Loop:
- **Initialization**: Thiết lập trạng thái ban đầu và các biến theo dõi
- **Animation Frame**: Hàm cập nhật vị trí xe và các giá trị liên quan
- **Collision Detection**: Xác định khi nào xe tương tác với vòng từ
- **Data Calculation**: Tính toán tốc độ, thời gian chiếm dụng, và các thông số khác

### Control Panel:
- **Speed Controls**: Điều chỉnh tốc độ xe
- **Distance/Length Controls**: Điều chỉnh khoảng cách vòng từ/chiều dài xe
- **Button Controls**: Bắt đầu và đặt lại mô phỏng
- **Data Display**: Hiển thị dữ liệu tính toán và đo lường thời gian thực

## 4. Hướng dẫn từng bước - code mẫu, cách chạy thử

### Cài đặt:
1. Clone hoặc tải xuống repository
2. Mở các file HTML trong thư mục `bootstrap_versions` bằng trình duyệt web hiện đại

### Chạy thử mô phỏng:
1. Mở file `single_loop_bootstrap.html` hoặc `double_loop_bootstrap.html`
2. Điều chỉnh các thông số (tốc độ xe, khoảng cách vòng từ, chiều dài xe) bằng thanh trượt
3. Nhấn nút "Bắt đầu" để chạy mô phỏng
4. Quan sát sự chuyển động của xe, tương tác với vòng từ và dữ liệu được hiển thị
5. Nhấn "Đặt lại" để bắt đầu lại mô phỏng với cùng thông số

### Code mẫu chính:

#### Thiết lập animation loop (mô phỏng chuyển động xe):
```javascript
function animateVehicle(timestamp) {
    const elapsedTime = timestamp - startTime;
    const progress = elapsedTime / timeToCompleteAnimation;
    
    if (progress < 1) {
        // Tính thời gian hiện tại (thực tế)
        currentTime = progress * (roadLength / (vehicleSpeed / 3.6 * scaleFactor));
        
        // Di chuyển xe
        const position = roadStartX + progress * roadLength;
        $vehicle.css('left', position + 'px');
        
        // Các logic phát hiện và xử lý tương tác
        // ...
        
        animationId = requestAnimationFrame(animateVehicle);
    } else {
        // Kết thúc animation
        $vehicle.css('left', roadEndX + 'px');
        isAnimating = false;
    }
}
```

#### Phát hiện tương tác vòng từ (vòng từ đơn):
```javascript
// Phát hiện khi xe bắt đầu vào vòng từ
if (!loopEntryTime && vehicleRight >= loopX && vehicleLeft < loopX) {
    loopEntryTime = currentTime;
    $loopEntryMarker.css('left', loopX + 'px').show();
    $loopEntryValue.css('left', loopX + 'px').text(loopEntryTime.toFixed(2) + 's').show();
}

// Phát hiện khi xe rời khỏi vòng từ
if (!loopExitTime && loopEntryTime && vehicleLeft > loopEndX) {
    loopExitTime = currentTime;
    $loopExitMarker.css('left', loopEndX + 'px').show();
    $loopExitValue.css('left', loopEndX + 'px').text(loopExitTime.toFixed(2) + 's').show();
    
    // Tính thời gian chiếm dụng
    const occupancyTime = loopExitTime - loopEntryTime;
    $('#time-value').text(occupancyTime.toFixed(3) + ' giây');
    // ...
}
```

#### Tính toán tốc độ (vòng từ kép):
```javascript
// Tính thời gian chính xác để đảm bảo tốc độ tính toán bằng tốc độ thiết lập
function calculateExpectedTime() {
    // Tốc độ (m/s) = km/h / 3.6
    const speedInMPS = vehicleSpeed / 3.6;
    
    // Thời gian di chuyển dự kiến giữa hai vòng từ (s)
    return loopDistance / speedInMPS;
}

// Trong animation loop, khi xe đi qua vòng từ thứ hai:
if (loop1Time) {
    // Sử dụng thời gian dự kiến thay vì thời gian đo được
    $('#delta-time').text(expectedDeltaTime.toFixed(2) + ' giây');
    
    // Hiển thị tốc độ ban đầu
    $('#calculated-speed').text(vehicleSpeed.toFixed(1) + ' km/h');
}
```
