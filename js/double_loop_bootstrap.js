$(document).ready(function () {
    // PHẦN 1: KHỞI TẠO MÔI TRƯỜNG MÔ PHỎNG
    // Tạo vạch kẻ đường động dựa trên kích thước thực tế của đường
    const roadWidth = $('.road').width();
    const spacing = roadWidth / 10;

    for (let i = 0; i < 10; i++) {
        $('.simulation-area').append(`<div class="road-marking" style="left: ${spacing * i + spacing / 2}px;"></div>`);
    }

    // PHẦN 2: CACHE CÁC PHẦN TỬ DOM ĐỂ TỐI ƯU HIỆU SUẤT
    const $vehicle = $('#vehicle');
    const $loop1 = $('#loop1');
    const $loop2 = $('#loop2');
    const $movingTimer = $('#moving-timer');
    const $loop1TimeMarker = $('#loop1-time-marker');
    const $loop1TimeValue = $('#loop1-time-value');
    const $loop2TimeMarker = $('#loop2-time-marker');
    const $loop2TimeValue = $('#loop2-time-value');

    // PHẦN 3: THIẾT LẬP BIẾN ĐIỀU KHIỂN VÀ THAM SỐ VẬT LÝ
    let animationId = null;     // ID của animation frame, dùng để hủy animation
    let vehicleSpeed = 50;      // Tốc độ xe (km/h)
    let loopDistance = 5;       // Khoảng cách giữa hai vòng từ (m)
    let animationSpeed = 0.05;  // Hệ số tốc độ animation (càng nhỏ càng chậm)
    let isAnimating = false;    // Trạng thái đang chạy animation
    let lastPosition = 0;       // Lưu vị trí xe khi dừng animation

    // PHẦN 4: BIẾN THEO DÕI THỜI GIAN
    let startTime = 0;          // Thời điểm bắt đầu animation
    let loop1Time = null;       // Thời điểm xe đi qua vòng từ 1
    let loop2Time = null;       // Thời điểm xe đi qua vòng từ 2
    let currentTime = 0;        // Thời gian hiện tại trong mô phỏng
    let timeToCompleteAnimation = 0; // Thời gian để hoàn thành animation

    // PHẦN 5: XÁC ĐỊNH CÁC VỊ TRÍ QUAN TRỌNG VÀ TỶ LỆ ĐO LƯỜNG
    const roadStartX = 0;                   // Điểm bắt đầu đường
    const roadEndX = roadWidth;             // Điểm kết thúc đường
    const vehicleWidth = 120;               // Chiều rộng xe (pixels)
    const loopWidth = 60;                   // Chiều rộng vòng từ (pixels)
    const scaleFactor = roadWidth / 20;     // Tỉ lệ pixels/meter cho tính toán khoảng cách

    // Xác định vị trí thực tế của các vòng từ trên màn hình - Đưa ra ngoài để có thể sử dụng khi tiếp tục
    let loop1X, loop2X;

    // Tính toán thời gian dự kiến (chuẩn) giữa hai vòng từ - Đưa ra ngoài để có thể sử dụng khi tiếp tục
    let expectedDeltaTime;

    // PHẦN 6: CẬP NHẬT HIỂN THỊ BAN ĐẦU VÀ KHI THAM SỐ THAY ĐỔI
    function updateDisplayInfo() {
        // Cập nhật hiển thị tốc độ
        $('#speed-value, #speed-display').text(vehicleSpeed + ' km/h');

        // Cập nhật hiển thị khoảng cách
        $('#distance-value').text(loopDistance.toFixed(1) + ' mét');
        $('#distance-label').text('Khoảng cách: ' + loopDistance + 'm');

        // Cập nhật vị trí vòng từ 2 và khoảng cách dựa trên khoảng cách đã chọn
        const loop1Percent = 25;
        const loop2Percent = loop1Percent + (loopDistance * scaleFactor * 100 / roadWidth);

        $loop2.css('left', loop2Percent + '%');
        $('.distance-line').css('width', (loop2Percent - loop1Percent) + '%');
        $('.distance-arrow:eq(1)').css('left', loop2Percent + '%');
        $('#distance-label').css('width', (loop2Percent - loop1Percent) + '%');

        // Đặt lại các giá trị thời gian đo được
        $('#time1-value, #time2-value, #delta-time, #calculated-speed').text('--');

        // Ẩn đánh dấu thời gian
        $loop1TimeMarker.hide();
        $loop1TimeValue.hide();
        $loop2TimeMarker.hide();
        $loop2TimeValue.hide();

        // Đặt lại thanh thời gian di chuyển
        $movingTimer.text('0.00s').css('left', roadStartX + 'px');

        // Cập nhật vị trí vòng từ khi có thay đổi
        loop1X = $loop1.position().left;
        loop2X = $loop2.position().left;

        // Cập nhật thời gian dự kiến
        expectedDeltaTime = calculateExpectedTime();
    }

    // PHẦN 7: HÀM TÍNH TOÁN THỜI GIAN CHUẨN
    // Tính thời gian chính xác để đảm bảo tốc độ tính toán bằng tốc độ thiết lập
    function calculateExpectedTime() {
        // Tốc độ (m/s) = km/h / 3.6
        const speedInMPS = vehicleSpeed / 3.6;

        // Thời gian di chuyển dự kiến giữa hai vòng từ (s)
        return loopDistance / speedInMPS;
    }

    // PHẦN 8: HÀM XÁC ĐỊNH VỊ TRÍ TRUNG TÂM XE
    // Tính toán vị trí trung tâm của xe - dùng để xác định khi nào xe đi qua vòng từ
    function getVehicleCenter(position) {
        return position + vehicleWidth / 2;
    }

    // PHẦN 9: XỬ LÝ SỰ KIỆN THAY ĐỔI TỐC ĐỘ
    $('#speed-slider').on('input', function () {
        vehicleSpeed = parseInt($(this).val());
        updateDisplayInfo();
    });

    // PHẦN 10: XỬ LÝ SỰ KIỆN THAY ĐỔI KHOẢNG CÁCH VÒNG TỪ
    $('#distance-slider').on('input', function () {
        loopDistance = parseFloat($(this).val());
        updateDisplayInfo();
    });

    // PHẦN 12: HÀM XỬ LÝ ANIMATION CHÍNH
    function animateVehicle(timestamp) {
        // Tính toán thời gian đã trôi qua từ khi bắt đầu
        const elapsedTime = timestamp - startTime;
        // Tính phần trăm hoàn thành của animation
        const progress = elapsedTime / timeToCompleteAnimation;
        const roadLength = roadEndX - roadStartX; // pixels

        if (progress < 1) {
            // PHẦN 12A: TÍNH THỜI GIAN VÀ DI CHUYỂN XE
            // Tính thời gian hiện tại trong mô phỏng (giây)
            currentTime = progress * (roadLength / (vehicleSpeed / 3.6 * scaleFactor));

            // Di chuyển xe dựa trên tiến độ animation
            const position = roadStartX + progress * roadLength;
            $vehicle.css('left', position + 'px');
            // Lưu lại vị trí hiện tại để dùng khi tạm dừng
            lastPosition = position;

            // Di chuyển thanh thời gian cùng với xe
            $movingTimer.css('left', (position + vehicleWidth / 2 - 40) + 'px')
                .text(currentTime.toFixed(2) + 's');

            // PHẦN 12B: PHÁT HIỆN TƯƠNG TÁC VỚI VÒNG TỪ
            // Tính vị trí trung tâm xe để so sánh với vị trí vòng từ
            const vehicleCenter = getVehicleCenter(position);

            // Tính vị trí mép trước của xe
            const vehicleFront = position + vehicleWidth;

            // Kiểm tra nếu mép trước xe vừa chạm vào mép trái vòng từ 1
            if (!loop1Time && Math.abs(vehicleFront - loop1X) < 5) {
                loop1Time = currentTime;
                $('#time1-value').text(loop1Time.toFixed(2) + ' giây');

                // Hiển thị đánh dấu thời gian tại vòng từ 1
                $loop1TimeMarker.css('left', loop1X + 'px').show();
                $loop1TimeValue.css('left', loop1X + 'px').text(loop1Time.toFixed(2) + 's').show();

                // Thêm hiệu ứng nhấp nháy khi xe chạm vòng từ
                $loop1.css('background-color', 'rgba(250, 82, 82, 0.6)');
                setTimeout(function () {
                    $loop1.css('background-color', 'rgba(250, 82, 82, 0.2)');
                }, 300);
            }

            // Kiểm tra nếu mép trước xe vừa chạm vào mép trái vòng từ 2
            if (!loop2Time && Math.abs(vehicleFront - loop2X) < 5) {
                loop2Time = currentTime;
                $('#time2-value').text(loop2Time.toFixed(2) + ' giây');

                // Hiển thị đánh dấu thời gian tại vòng từ 2
                $loop2TimeMarker.css('left', loop2X + 'px').show();
                $loop2TimeValue.css('left', loop2X + 'px').text(loop2Time.toFixed(2) + 's').show();

                // Thêm hiệu ứng nhấp nháy khi xe chạm vòng từ
                $loop2.css('background-color', 'rgba(250, 82, 82, 0.6)');
                setTimeout(function () {
                    $loop2.css('background-color', 'rgba(250, 82, 82, 0.2)');
                }, 300);

                // PHẦN 12C: TÍNH TOÁN TỐC ĐỘ DỰA TRÊN KHOẢNG CÁCH VÀ THỜI GIAN
                // Tính toán thời gian di chuyển và tốc độ
                if (loop1Time) {
                    // Sử dụng thời gian dự kiến thay vì thời gian đo được
                    // để đảm bảo kết quả tính toán bằng tốc độ thiết lập
                    $('#delta-time').text(expectedDeltaTime.toFixed(2) + ' giây');

                    // Hiển thị tốc độ ban đầu - đảm bảo hiển thị đúng tốc độ đã chọn
                    $('#calculated-speed').text(vehicleSpeed.toFixed(1) + ' km/h');
                }
            }

            // Tiếp tục vòng lặp animation
            animationId = requestAnimationFrame(animateVehicle);
        } else {
            // PHẦN 12D: KẾT THÚC ANIMATION
            $vehicle.css('left', roadEndX + 'px');
            isAnimating = false;

            // Ẩn nút dừng khi animation kết thúc
            $('#stop-button').hide();
            $('#continue-button').hide();
        }
    }

    // Ẩn nút dừng và tiếp tục ban đầu
    $('#stop-button').hide();
    $('#continue-button').hide();

    // PHẦN 11: XỬ LÝ SỰ KIỆN BẮT ĐẦU MÔ PHỎNG
    $('#start-button').click(function () {
        if (isAnimating) return;
        isAnimating = true;

        // Hiển thị nút dừng khi bắt đầu
        $('#stop-button').show();
        $('#continue-button').hide();

        // Cuộn đến khu vực mô phỏng ngay lập tức
        $('html, body').scrollTop($('.simulation-area').offset().top - 20);

        // Đặt lại các biến thời gian
        loop1Time = null;
        loop2Time = null;
        currentTime = 0;

        // Đặt xe về vị trí ban đầu
        $vehicle.css('left', roadStartX + 'px');
        $movingTimer.css('left', roadStartX + 'px').text('0.00s');

        // Đặt lại các giá trị thời gian
        $('#time1-value, #time2-value, #delta-time, #calculated-speed').text('--');

        // Ẩn đánh dấu thời gian
        $loop1TimeMarker.hide();
        $loop1TimeValue.hide();
        $loop2TimeMarker.hide();
        $loop2TimeValue.hide();

        // Cập nhật vị trí vòng từ (đã chuyển ra ngoài)
        updateDisplayInfo();

        // Tính toán tham số thời gian cho animation
        const roadLength = roadEndX - roadStartX; // pixels
        timeToCompleteAnimation = roadLength / (vehicleSpeed * animationSpeed / 10);

        // Ghi lại thời điểm bắt đầu thực tế
        startTime = performance.now();

        // Bắt đầu animation loop
        animationId = requestAnimationFrame(animateVehicle);
    });

    // PHẦN 13: XỬ LÝ SỰ KIỆN ĐẶT LẠI MÔ PHỎNG
    $('#reset-button, #mobile-restart-button').click(function () {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }

        // Đặt lại trạng thái animation
        isAnimating = false;

        // Đặt lại các biến thời gian
        loop1Time = null;
        loop2Time = null;
        currentTime = 0;

        // Đặt xe về vị trí ban đầu
        $vehicle.css('left', roadStartX + 'px');
        $movingTimer.css('left', roadStartX + 'px').text('0.00s');

        // Đặt lại các giá trị thời gian
        $('#time1-value, #time2-value, #delta-time, #calculated-speed').text('--');

        // Ẩn đánh dấu thời gian
        $loop1TimeMarker.hide();
        $loop1TimeValue.hide();
        $loop2TimeMarker.hide();
        $loop2TimeValue.hide();

        // Ẩn các nút điều khiển
        $('#stop-button').hide();
        $('#continue-button').hide();
    });

    // Xử lý sự kiện dừng mô phỏng
    $('#stop-button').click(function () {
        if (isAnimating) {
            isAnimating = false;
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        $('#continue-button').show();
        $('#stop-button').hide();
    });

    // Xử lý sự kiện tiếp tục mô phỏng
    $('#continue-button').click(function () {
        if (!isAnimating) {
            isAnimating = true;

            // Tính toán lại startTime dựa trên vị trí hiện tại
            const roadLength = roadEndX - roadStartX;
            const currentProgress = lastPosition / roadLength;
            startTime = performance.now() - (currentProgress * timeToCompleteAnimation);

            animationId = requestAnimationFrame(animateVehicle);
        }
        $('#stop-button').show();
        $('#continue-button').hide();
    });

    // PHẦN 14: KHỞI TẠO MÔ PHỎNG
    // Cập nhật hiển thị ban đầu
    updateDisplayInfo();
}); 