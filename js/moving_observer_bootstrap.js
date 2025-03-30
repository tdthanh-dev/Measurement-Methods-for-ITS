$(document).ready(function () {
    // PHẦN 1: KHỞI TẠO BIẾN VÀ PHẦN TỬ DOM
    // Tham chiếu đến các phần tử DOM
    const $probeCar = $('#probe-car');
    const $carsUp = $('.car-up');
    const $carsDown = $('.car-down');

    // Biến điều khiển mô phỏng
    let animationId = null;
    let isAnimating = false;
    let probeCarSpeed = 35; // km/h
    let incomingCount = 42; // số xe đến (cùng chiều)
    let outgoingCount = 18; // số xe đi (ngược chiều)
    let observationTime = 15; // phút

    // PHẦN 2: TẠO VẠCH KẺ ĐƯỜNG ĐỨT ĐOẠN
    const roadWidth = $('.road').width();
    const spacing = roadWidth / 15;

    for (let i = 0; i < 15; i++) {
        $('.simulation-area').append(`<div class="road-marking-dashed" style="left: ${spacing * i + spacing / 2}px;"></div>`);
    }

    // PHẦN 3: HÀM TÍNH TOÁN
    // Tính lưu lượng giao thông (xe/phút)
    function calculateFlowRate() {
        // q = (Ma + Mw) / T
        return (incomingCount + outgoingCount) / observationTime;
    }

    // Tính mật độ giao thông (xe/km)
    function calculateDensity() {
        // k = (Ma - Mw) / (T × v_obs)
        // Chuyển đổi tốc độ từ km/h sang km/phút
        const probeSpeedInKmPerMin = probeCarSpeed / 60;
        return (incomingCount - outgoingCount) / (observationTime * probeSpeedInKmPerMin);
    }

    // Tính vận tốc dòng xe (km/h)
    function calculateSpeed() {
        const flowRate = calculateFlowRate(); // xe/phút
        const density = calculateDensity(); // xe/km

        // Kiểm tra để tránh chia cho 0 hoặc số âm
        if (density <= 0) {
            return 0;
        }

        // Chuyển đổi flow rate từ xe/phút sang xe/giờ và chia cho mật độ (xe/km)
        return flowRate * 60 / density;
    }

    // PHẦN 4: CẬP NHẬT GIAO DIỆN
    // Cập nhật hiển thị các thông số
    function updateDisplayInfo() {
        // Cập nhật giá trị đầu vào
        $('#incoming-count').text(incomingCount + ' xe');
        $('#outgoing-count').text(outgoingCount + ' xe');
        $('#observation-time').text(observationTime + ' phút');
        $('#probe-speed').text(probeCarSpeed + ' km/h');

        // Tính toán và hiển thị kết quả
        const flowRate = calculateFlowRate();
        const density = calculateDensity();
        const speed = calculateSpeed();

        $('#flow-rate').text(flowRate.toFixed(1) + ' xe/phút');
        $('#density').text(density.toFixed(3) + ' xe/km');
        $('#stream-speed').text(speed.toFixed(1) + ' km/h');
    }

    // PHẦN 5: XỬ LÝ SỰ KIỆN SLIDER
    // Cập nhật khi số xe đến thay đổi
    $('#incoming-slider').on('input', function () {
        incomingCount = parseInt($(this).val());
        // Đảm bảo Ma >= Mw để mật độ không âm
        if (incomingCount < outgoingCount) {
            outgoingCount = incomingCount;
            $('#outgoing-slider').val(outgoingCount);
        }
        updateDisplayInfo();
    });

    // Cập nhật khi số xe đi thay đổi
    $('#outgoing-slider').on('input', function () {
        outgoingCount = parseInt($(this).val());
        // Đảm bảo Ma >= Mw
        if (outgoingCount > incomingCount) {
            outgoingCount = incomingCount;
            $(this).val(outgoingCount);
        }
        updateDisplayInfo();
    });

    // Cập nhật khi thời gian quan sát thay đổi
    $('#observation-time-slider').on('input', function () {
        observationTime = parseInt($(this).val());
        updateDisplayInfo();
    });

    // Cập nhật khi tốc độ xe thăm dò thay đổi
    $('#probe-speed-slider').on('input', function () {
        probeCarSpeed = parseInt($(this).val());
        updateDisplayInfo();

        // Nếu đang chạy animation và tốc độ về 0, đặt lại vị trí xe
        if (isAnimating && probeCarSpeed <= 1) {
            resetCarPositions();
            isAnimating = false;
        }
    });

    // PHẦN 6: XỬ LÝ SỰ KIỆN CÁC NÚT ĐIỀU KHIỂN
    // Bắt đầu mô phỏng
    $('#start-button').click(function () {
        if (isAnimating) return;

        // Kiểm tra xem tốc độ có bằng 0 không
        if (probeCarSpeed <= 1) {
            alert("Tốc độ xe thăm dò phải lớn hơn 0 km/h để bắt đầu mô phỏng!");
            return;
        }

        isAnimating = true;

        // Cuộn đến khu vực mô phỏng
        $('html, body').animate({
            scrollTop: $('.simulation-area').offset().top - 20
        }, 500);

        // Đặt lại vị trí tất cả xe
        resetCarPositions();

        // Tạo hiệu ứng delay để reset animation
        setTimeout(function () {
            // Thiết lập animation cho xe thăm dò (đi lên)
            const probeAnimationDuration = 15000 / probeCarSpeed * 35; // Tỉ lệ với tốc độ cơ sở 35km/h

            $probeCar.css({
                'animation': 'none',  // Reset animation trước
                'left': '25px'      // Đảm bảo vị trí bắt đầu
            }).outerHeight(); // Force reflow

            $probeCar.css({
                'animation': `moveCarUp ${probeAnimationDuration}ms linear forwards`,
                'visibility': 'visible'
            });

            // Tính tốc độ dòng xe
            const streamSpeed = calculateSpeed();

            // Tính toán số lượng xe hiển thị dựa trên tỷ lệ với incomingCount và outgoingCount
            const maxVisibleCarsUp = 4; // Tổng số xe chiều đi lên có thể hiển thị
            const maxVisibleCarsDown = 4; // Tổng số xe chiều đi xuống có thể hiển thị

            // Tính phân bố xe trên làn nhanh/chậm (tối đa 2 xe mỗi làn)
            let fastLaneUp = Math.min(2, Math.ceil(incomingCount * 0.6 / 10)); // 60% xe trên làn nhanh
            let slowLaneUp = Math.min(2, Math.ceil(incomingCount * 0.4 / 10)); // 40% xe trên làn chậm

            let fastLaneDown = Math.min(2, Math.ceil(outgoingCount * 0.7 / 5)); // 70% xe trên làn nhanh
            let slowLaneDown = Math.min(2, Math.ceil(outgoingCount * 0.3 / 5)); // 30% xe trên làn chậm

            // Hiển thị xe chiều đi lên làn nhanh dựa trên số lượng xe thực tế
            for (let i = 1; i <= fastLaneUp; i++) {
                const $car = $(`#car-up-fast-${i}`);
                // Hiển thị xe sau khi có delay để tạo khoảng cách an toàn với xe thăm dò
                const safeDistanceDelay = i * 3000;

                setTimeout(() => {
                    $car.css({
                        'animation': 'none',
                        'left': '25px',
                        'visibility': 'visible'
                    }).outerHeight(); // Force reflow

                    // Tốc độ luôn chậm hơn xe thăm dò 15-30%
                    const speedFactor = 0.7 + (Math.random() * 0.15); // 70-85% tốc độ xe thăm dò
                    const carDuration = probeAnimationDuration / speedFactor;

                    $car.css({
                        'animation': `moveCarUp ${carDuration}ms linear forwards`
                    });
                }, safeDistanceDelay);
            }

            // Hiển thị xe chiều đi lên làn chậm
            for (let i = 1; i <= slowLaneUp; i++) {
                const $car = $(`#car-up-slow-${i}`);

                // Điều chỉnh độ trễ để tạo khoảng cách ban đầu phù hợp hơn
                const safeDistanceDelay = i === 1 ? 1000 : 3500;

                setTimeout(() => {
                    $car.css({
                        'animation': 'none',
                        'left': '25px',
                        'visibility': 'visible'
                    }).outerHeight(); // Force reflow

                    // Điều chỉnh tốc độ cho từng xe cụ thể
                    let speedFactor;
                    if (i === 1) {
                        // A3: Tăng tốc độ lên rất cao (160-180% tốc độ xe thăm dò)
                        speedFactor = 1.6 + (Math.random() * 0.2);
                    } else {
                        // A4: Chậm hơn A3 nhưng vẫn nhanh hơn xe thăm dò (115-130% tốc độ xe thăm dò)
                        speedFactor = 1.15 + (Math.random() * 0.15);
                    }

                    const carDuration = probeAnimationDuration / speedFactor;

                    $car.css({
                        'animation': `moveCarUp ${carDuration}ms linear forwards`
                    });
                }, safeDistanceDelay);
            }

            // Tính khoảng cách giữa các xe dựa trên mật độ
            const density = calculateDensity(); // xe/km
            const roadLength = 0.8; // Chiều dài đoạn đường mô phỏng (km)
            const expectedCarsPerRoad = density * roadLength;

            // Hiển thị xe chiều đi xuống làn nhanh
            for (let i = 1; i <= fastLaneDown; i++) {
                const $car = $(`#car-down-fast-${i}`);

                // Đặt lại animation trước
                $car.css({
                    'animation': 'none',
                    'visibility': 'hidden'
                }).outerHeight(); // Force reflow

                // Tạo tốc độ phù hợp với streamSpeed đã tính
                // Xe ngược chiều sẽ có tốc độ tương đối với xe thăm dò là v_rel = v_stream + v_obs
                const relativeSpeed = streamSpeed + probeCarSpeed;
                const speedVariation = 0.9 + (Math.random() * 0.2); // 90-110% của tốc độ tương đối
                const carSpeed = relativeSpeed * speedVariation;

                // Thời gian di chuyển qua màn hình
                const carDuration = 15000 / carSpeed * 87;

                // Vị trí ban đầu dựa trên mật độ giao thông
                const roadWidth = $('.road').width();
                const startPos = 300 + (i - 1) * (roadWidth / (expectedCarsPerRoad + 1));
                const delayTime = (i - 1) * 2200;

                setTimeout(() => {
                    $car.css({
                        'visibility': 'visible',
                        'left': `${startPos}px`
                    }).outerHeight(); // Force reflow

                    $car.css({
                        'animation': `moveCarDown ${carDuration}ms linear forwards`
                    });
                }, delayTime);
            }

            // Hiển thị xe chiều đi xuống làn chậm
            for (let i = 1; i <= slowLaneDown; i++) {
                const $car = $(`#car-down-slow-${i}`);

                // Đặt lại animation trước
                $car.css({
                    'animation': 'none',
                    'visibility': 'hidden'
                }).outerHeight(); // Force reflow

                // Xe đi chậm hơn tốc độ dòng tổng thể
                const relativeSpeed = streamSpeed + probeCarSpeed;
                const speedVariation = 0.7 + (Math.random() * 0.2); // 70-90% của tốc độ tương đối
                const carSpeed = relativeSpeed * speedVariation;

                const carDuration = 15000 / carSpeed * 87;

                // Vị trí ban đầu dựa trên mật độ giao thông
                const roadWidth = $('.road').width();
                const startPos = 180 + (i - 1) * (roadWidth / (expectedCarsPerRoad + 1));
                const delayTime = (i - 1) * 3000;

                setTimeout(() => {
                    $car.css({
                        'visibility': 'visible',
                        'left': `${startPos}px`
                    }).outerHeight(); // Force reflow

                    $car.css({
                        'animation': `moveCarDown ${carDuration}ms linear forwards`
                    });
                }, delayTime);
            }

            // Thiết lập kết thúc animation sau khoảng thời gian dài nhất
            setTimeout(function () {
                isAnimating = false;
            }, probeAnimationDuration + 5000); // Thêm 5s cho animation-delay
        }, 50);
    });

    // Đặt lại mô phỏng
    $('#reset-button, #mobile-restart-button').click(function () {
        // Dừng animation đang chạy
        resetCarPositions();
        isAnimating = false;
    });

    // Hàm đặt lại vị trí tất cả xe
    function resetCarPositions() {
        // Dừng animation đang chạy
        $probeCar.add('.car-up').add('.car-down').css('animation', 'none');

        // Force reflow để đảm bảo animation được dừng hoàn toàn
        $probeCar[0].offsetHeight;

        // Đặt lại vị trí xe thăm dò
        $probeCar.css({
            'left': '25px',
            'visibility': 'visible'
        });

        // Đặt lại vị trí các xe đi lên làn nhanh (ẩn đến khi xe thăm dò di chuyển)
        $('#car-up-fast-1, #car-up-fast-2').css({
            'left': '25px',
            'visibility': 'hidden'
        });

        // Đặt lại vị trí các xe đi lên làn chậm (ẩn đến khi xe thăm dò di chuyển)
        $('#car-up-slow-1, #car-up-slow-2').css({
            'left': '25px',
            'visibility': 'hidden'
        });

        // Đặt lại vị trí các xe đi xuống làn nhanh
        $('#car-down-fast-1').css({ 'left': '300px', 'visibility': 'hidden' });
        $('#car-down-fast-2').css({ 'left': '600px', 'visibility': 'hidden' });

        // Đặt lại vị trí các xe đi xuống làn chậm
        $('#car-down-slow-1').css({ 'left': '180px', 'visibility': 'hidden' });
        $('#car-down-slow-2').css({ 'left': '650px', 'visibility': 'hidden' });
    }

    // PHẦN 7: KHỞI TẠO BAN ĐẦU
    // Cập nhật hiển thị ban đầu
    updateDisplayInfo();

    // Xử lý đóng mở bảng công thức
    $('#close-formula').click(function () {
        $('.formula-box').hide();
    });

    // Thêm nút để hiển thị lại công thức
    $('.card-body.simulation-area').append('<button class="btn btn-sm btn-success position-absolute" style="bottom: 10px; right: 10px; z-index: 1000;" id="show-formula"><i class="fas fa-calculator me-1"></i>Công thức</button>');

    // Xử lý khi click vào nút hiển thị lại
    $('#show-formula').click(function () {
        $('.formula-box').show();
    });
}); 