$(document).ready(function () {
    // PHẦN 1: KHỞI TẠO MÔI TRƯỜNG MÔ PHỎNG
    // Tạo vạch kẻ đường động để thích ứng với kích thước màn hình
    const roadWidth = $('.road').width();
    const spacing = roadWidth / 13;

    for (let i = 0; i < 13; i++) {
        $('.simulation-area').append(`<div class="road-marking" style="left: ${spacing * i + spacing / 2}px;"></div>`);
    }

    // PHẦN 2: CACHE CÁC PHẦN TỬ DOM ĐỂ TỐI ƯU HIỆU SUẤT
    const $vehicle = $('#vehicle');
    const $pulseHigh = $('#pulse-high');
    const $movingTimer = $('#moving-timer');
    const $loopEntryMarker = $('#loop-entry-marker');
    const $loopEntryValue = $('#loop-entry-value');
    const $loopExitMarker = $('#loop-exit-marker');
    const $loopExitValue = $('#loop-exit-value');
    const $occupancyMarker = $('#occupancy-marker');
    const $occupancyLabel = $('#occupancy-label');

    // PHẦN 3: THIẾT LẬP BIẾN ĐIỀU KHIỂN VÀ THAM SỐ VẬT LÝ
    let animationId = null;     // ID của animation frame, dùng để hủy animation
    let vehicleSpeed = 50;      // Tốc độ xe (km/h)
    let vehicleLength = 3;      // Chiều dài xe (m)
    let loopWidth = 2;          // Độ rộng vòng từ (m)
    let animationSpeed = 0.05;  // Hệ số tốc độ animation (càng nhỏ càng chậm)
    let isAnimating = false;    // Trạng thái đang chạy animation

    // PHẦN 4: BIẾN THEO DÕI THỜI GIAN
    let startTime = 0;          // Thời điểm bắt đầu animation
    let loopEntryTime = null;   // Thời điểm xe bắt đầu đi vào vòng từ
    let loopExitTime = null;    // Thời điểm xe hoàn toàn rời khỏi vòng từ
    let currentTime = 0;        // Thời gian hiện tại trong mô phỏng
    let timeToCompleteAnimation = 0; // Thời gian để hoàn thành animation

    // PHẦN 5: XÁC ĐỊNH CÁC VỊ TRÍ QUAN TRỌNG
    const roadStartX = 0;                    // Điểm bắt đầu đường
    const roadEndX = roadWidth;              // Điểm kết thúc đường
    const loopX = roadWidth / 2 - 40;        // Vị trí bắt đầu vòng từ
    const loopEndX = loopX + 80;             // Vị trí kết thúc vòng từ
    const pixelsPerMeter = roadWidth / 25;   // Tỉ lệ pixel/meter cho tính toán

    // PHẦN 6: CẬP NHẬT HIỂN THỊ BAN ĐẦU VÀ KHI THAM SỐ THAY ĐỔI
    function updateDisplayInfo() {
        // Cập nhật hiển thị tốc độ
        $('#speed-value, #speed-display').text(vehicleSpeed + ' km/h');

        // Tính thời gian chiếm dụng lý thuyết = (chiều dài xe + độ rộng vòng từ) / tốc độ(m/s)
        const speedInMPS = vehicleSpeed / 3.6; // Chuyển từ km/h sang m/s
        const occupancyTime = (vehicleLength + loopWidth) / speedInMPS;
        $('#time-value').text(occupancyTime.toFixed(3) + ' giây');

        // Cập nhật hiển thị chiều dài xe
        $('#length-value').text(vehicleLength.toFixed(1) + ' mét');

        // Thay đổi chiều dài xe trong giao diện
        $vehicle.width((vehicleLength * pixelsPerMeter) + 'px');

        // Đặt lại thanh thời gian di chuyển
        $movingTimer.text('0.00s').css('left', roadStartX + 'px');

        // Ẩn tất cả đánh dấu thời gian và chiếm dụng
        $loopEntryMarker.hide();
        $loopEntryValue.hide();
        $loopExitMarker.hide();
        $loopExitValue.hide();
        $occupancyMarker.hide();
        $occupancyLabel.hide();
    }

    // PHẦN 7: XỬ LÝ SỰ KIỆN THAY ĐỔI TỐC ĐỘ XE
    $('#speed-slider').on('input', function () {
        vehicleSpeed = parseInt($(this).val());
        updateDisplayInfo();
    });

    // PHẦN 8: XỬ LÝ SỰ KIỆN THAY ĐỔI CHIỀU DÀI XE
    $('#length-slider').on('input', function () {
        vehicleLength = parseFloat($(this).val());
        updateDisplayInfo();
    });

    // PHẦN 10: HÀM XỬ LÝ ANIMATION CHÍNH - Đưa ra ngoài để có thể gọi từ nhiều nơi
    function animateVehicle(timestamp) {
        // Tính toán thời gian đã trôi qua từ khi bắt đầu
        const elapsedTime = timestamp - startTime;
        // Tính phần trăm hoàn thành của animation
        const progress = elapsedTime / timeToCompleteAnimation;
        const roadLength = roadEndX - roadStartX; // chiều dài đường (pixels)

        if (progress < 1) {
            // PHẦN 10A: TÍNH THỜI GIAN VÀ DI CHUYỂN XE
            // Tính thời gian hiện tại trong mô phỏng (giây)
            currentTime = progress * (roadLength / (vehicleSpeed / 3.6 * pixelsPerMeter));

            // Di chuyển xe dựa trên tiến độ animation
            const position = roadStartX + progress * roadLength;
            $vehicle.css('left', position + 'px');

            // Di chuyển thanh thời gian cùng với xe
            const vehicleWidth = $vehicle.width();
            $movingTimer.css('left', (position + vehicleWidth / 2 - 30) + 'px')
                .text(currentTime.toFixed(2) + 's');

            // PHẦN 10B: PHÁT HIỆN TƯƠNG TÁC VỚI VÒNG TỪ
            // Tính vị trí cạnh phải và trái của xe
            const vehicleRight = position + vehicleWidth;
            const vehicleLeft = position;

            // Phát hiện khi xe bắt đầu vào vòng từ (cạnh trước chạm vòng từ)
            if (!loopEntryTime && vehicleRight >= loopX && vehicleLeft < loopX) {
                loopEntryTime = currentTime;
                $loopEntryMarker.css('left', loopX + 'px').show();
                $loopEntryValue.css('left', loopX + 'px').text(loopEntryTime.toFixed(2) + 's').show();
            }

            // Phát hiện khi xe hoàn toàn rời khỏi vòng từ (cạnh sau rời khỏi vòng từ)
            if (!loopExitTime && loopEntryTime && vehicleLeft > loopEndX) {
                loopExitTime = currentTime;
                $loopExitMarker.css('left', loopEndX + 'px').show();
                $loopExitValue.css('left', loopEndX + 'px').text(loopExitTime.toFixed(2) + 's').show();

                // Hiển thị thông tin thời gian chiếm dụng vòng từ
                if (loopEntryTime) {
                    const occupancyTime = loopExitTime - loopEntryTime;
                    $('#time-value').text(occupancyTime.toFixed(3) + ' giây');

                    $occupancyMarker.css({
                        'left': loopX + 'px',
                        'width': (loopEndX - loopX) + 'px'
                    }).show();

                    $occupancyLabel.css('left', (loopX + (loopEndX - loopX) / 2 - 60) + 'px')
                        .text('Chiếm dụng: ' + occupancyTime.toFixed(2) + 's')
                        .show();
                }
            }

            // Cập nhật trạng thái tín hiệu xung khi xe đang ở trên vòng từ
            if ((vehicleRight >= loopX && vehicleLeft < loopEndX) ||
                (vehicleLeft <= loopEndX && vehicleRight > loopX)) {
                // Xe đang ở trên vòng từ - hiển thị xung cao
                $pulseHigh.css({
                    'height': '50px',
                    'top': '170px'
                });
            } else {
                // Xe không ở trên vòng từ - hiển thị xung thấp
                $pulseHigh.css({
                    'height': '0px',
                    'top': '220px'
                });
            }

            // Tiếp tục vòng lặp animation
            animationId = requestAnimationFrame(animateVehicle);
        } else {
            // PHẦN 10C: KẾT THÚC ANIMATION
            $vehicle.css('left', roadEndX + 'px');
            $pulseHigh.css({
                'height': '0px',
                'top': '220px'
            });
            isAnimating = false;
        }
    }

    // PHẦN 14: KHỞI TẠO MÔ PHỎNG
    // Cập nhật hiển thị ban đầu
    updateDisplayInfo();

    // Ẩn nút dừng và tiếp tục ban đầu, chỉ hiện sau khi bắt đầu mô phỏng
    $('#stop-button').hide();
    $('#continue-button').hide();

    // PHẦN 9: XỬ LÝ SỰ KIỆN BẮT ĐẦU MÔ PHỎNG
    $('#start-button').click(function () {
        if (isAnimating) return;
        isAnimating = true;

        // Hiển thị nút dừng khi bắt đầu mô phỏng
        $('#stop-button').show();
        $('#continue-button').hide();

        // Đặt lại các biến thời gian theo dõi
        loopEntryTime = null;
        loopExitTime = null;
        currentTime = 0;

        // Đặt xe về vị trí ban đầu
        $vehicle.css('left', roadStartX + 'px');
        $movingTimer.css('left', roadStartX + 'px').text('0.00s');

        // Ẩn tất cả đánh dấu thời gian
        $loopEntryMarker.hide();
        $loopEntryValue.hide();
        $loopExitMarker.hide();
        $loopExitValue.hide();
        $occupancyMarker.hide();
        $occupancyLabel.hide();

        // Tính toán tham số animation dựa trên tốc độ xe
        const roadLength = roadEndX - roadStartX; // chiều dài đường (pixels)
        timeToCompleteAnimation = roadLength / (vehicleSpeed * animationSpeed / 10);

        // Ghi lại thời điểm bắt đầu thực tế
        startTime = performance.now();

        // Bắt đầu animation loop
        animationId = requestAnimationFrame(animateVehicle);
    });

    // PHẦN 11: XỬ LÝ SỰ KIỆN ĐẶT LẠI MÔ PHỎNG
    $('#reset-button').click(function () {
        // Hủy animation đang chạy nếu có
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }

        // Đặt lại vị trí xe và thanh thời gian
        $vehicle.css('left', roadStartX + 'px');
        $movingTimer.css('left', roadStartX + 'px').text('0.00s');
        $pulseHigh.css({
            'height': '0px',
            'top': '220px'
        });

        // Ẩn tất cả đánh dấu thời gian
        $loopEntryMarker.hide();
        $loopEntryValue.hide();
        $loopExitMarker.hide();
        $loopExitValue.hide();
        $occupancyMarker.hide();
        $occupancyLabel.hide();

        // Đặt lại các biến thời gian
        loopEntryTime = null;
        loopExitTime = null;
        currentTime = 0;

        isAnimating = false;

        // Ẩn cả nút dừng và tiếp tục khi đặt lại mô phỏng
        $('#stop-button').hide();
        $('#continue-button').hide();
    });

    // PHẦN 12: XỬ LÝ SỰ KIỆN DỪNG MÔ PHỎNG
    let lastPosition = 0;
    $('#stop-button').click(function () {
        if (isAnimating) {
            isAnimating = false;
            cancelAnimationFrame(animationId);
            animationId = null;
            // Lưu vị trí hiện tại khi dừng
            lastPosition = $vehicle.position().left;
        }
        $('#continue-button').show();
        $('#stop-button').hide();
    });

    // PHẦN 13: XỬ LÝ SỰ KIỆN TIẾP TỤC MÔ PHỎNG
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
}); 