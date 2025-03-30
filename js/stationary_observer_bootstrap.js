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
    let incomingCount = 0; // số xe đến (cùng chiều) - bắt đầu từ 0
    let outgoingCount = 0; // số xe đi (ngược chiều) - bắt đầu từ 0
    let observationTime = 15; // phút
    let realIncomingCount = parseInt($('#incoming-slider').val()); // Giá trị từ slider
    let realOutgoingCount = parseInt($('#outgoing-slider').val()); // Giá trị từ slider

    // Thêm biến theo dõi cho hệ thống continuous spawning
    let carUpFastCounter = 0;
    let carUpSlowCounter = 0;
    let carDownFastCounter = 0;
    let carDownSlowCounter = 0;
    let spawnIntervalId = null;

    // Xác định vị trí vạch đỏ
    const countingLineX = 450; // Vị trí vạch đỏ theo trục X

    // Ẩn tất cả các xe mặc định
    $(document).ready(function () {
        $('#car-up-fast-1, #car-up-fast-2, #car-up-slow-1, #car-up-slow-2, #car-down-fast-1, #car-down-fast-2, #car-down-slow-1, #car-down-slow-2').css('visibility', 'hidden');
    });

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

        // Tính toán và hiển thị kết quả
        const flowRate = calculateFlowRate();
        $('#flow-rate').text(flowRate.toFixed(1) + ' xe/phút');
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
        if (isAnimating) {
            // Nếu đang chạy, dừng lại
            clearInterval(spawnIntervalId);
            isAnimating = false;
            $(this).html('<i class="fas fa-play me-1"></i>Bắt đầu');
            return;
        }

        // Bắt đầu mô phỏng liên tục
        isAnimating = true;
        $(this).html('<i class="fas fa-pause me-1"></i>Tạm dừng');

        // Cuộn đến khu vực mô phỏng
        $('html, body').animate({
            scrollTop: $('.simulation-area').offset().top - 20
        }, 500);

        // Đặt lại vị trí tất cả xe
        resetCarPositions();

        // Đặt lại bộ đếm thực tế
        incomingCount = 0;
        outgoingCount = 0;
        // Lấy giá trị mong muốn từ slider
        realIncomingCount = parseInt($('#incoming-slider').val());
        realOutgoingCount = parseInt($('#outgoing-slider').val());
        updateDisplayInfo();

        // Thiết lập spawning liên tục
        spawnIntervalId = setInterval(function () {
            // Spawn xe đi lên làn nhanh
            if (Math.random() < 0.3 && carUpFastCounter < realIncomingCount) { // Tăng từ 10% lên 30%
                spawnUpFastCar();
            }

            // Spawn xe đi lên làn chậm
            if (Math.random() < 0.25 && carUpSlowCounter < realIncomingCount) { // Tăng từ 8% lên 25%
                spawnUpSlowCar();
            }

            // Spawn xe đi xuống làn nhanh
            if (Math.random() < 0.3 && carDownFastCounter < realOutgoingCount) { // Tăng từ 10% lên 30%
                spawnDownFastCar();
            }

            // Spawn xe đi xuống làn chậm
            if (Math.random() < 0.25 && carDownSlowCounter < realOutgoingCount) { // Tăng từ 7% lên 25%
                spawnDownSlowCar();
            }

        }, 2500); //(trung bình 2-3 giây)
    });

    // Hàm kiểm tra xem xe có đi qua vạch đỏ không
    function checkCarPassedCountingLine(carId, direction) {
        const $car = $(`#${carId}`);
        const carLeft = $car.position().left;
        const carWidth = $car.width();

        // Nếu xe đi lên (từ trái sang phải)
        if (direction === 'up') {
            // Phần đầu xe vừa vượt qua vạch đỏ
            if (carLeft <= countingLineX && carLeft + carWidth >= countingLineX) {
                return !$car.data('counted');
            }
        }
        // Nếu xe đi xuống (từ phải sang trái)
        else if (direction === 'down') {
            // Phần đuôi xe vừa vượt qua vạch đỏ
            if (carLeft <= countingLineX && carLeft + carWidth >= countingLineX) {
                return !$car.data('counted');
            }
        }

        return false;
    }

    // Thêm giới hạn số xe hiển thị trên mỗi làn
    function getLaneVehicleCount(laneClass) {
        return $(laneClass).length;
    }

    // Hàm tạo xe đi lên làn nhanh mới
    function spawnUpFastCar() {
        // Giới hạn số xe đồng thời trên làn
        if (getLaneVehicleCount('[id^="car-up-fast-dynamic-"]') >= 3) {
            return;
        }

        carUpFastCounter++;
        const carId = `car-up-fast-dynamic-${carUpFastCounter}`;

        // Xác định loại xe ngẫu nhiên
        const vehicleTypes = ['sedan', 'suv', 'motorcycle', 'truck', 'bus'];
        const vehicleClass = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];

        // Xác định icon tương ứng với loại xe
        let vehicleIcon = 'fa-car'; // mặc định
        if (vehicleClass === 'suv') vehicleIcon = 'fa-truck-monster';
        if (vehicleClass === 'motorcycle') vehicleIcon = 'fa-motorcycle';
        if (vehicleClass === 'truck') vehicleIcon = 'fa-truck';
        if (vehicleClass === 'bus') vehicleIcon = 'fa-bus';

        // Tạo phần tử xe mới
        const $newCar = $('<div>', {
            id: carId,
            class: `car-up ${vehicleClass}`,
            css: {
                'top': '95px',
                'left': '25px',  // Bắt đầu từ bên trái
                'visibility': 'visible'
            },
            html: `<i class="fa-icon fas ${vehicleIcon}"></i><span>A${carUpFastCounter}</span>`
        });

        // Đánh dấu xe chưa được đếm
        $newCar.data('counted', false);

        // Thêm vào khu vực mô phỏng
        $('.simulation-area').append($newCar);

        // Thiết lập animation
        const speedFactor = 1.5 + (Math.random() * 0.5); // Tăng từ 70-85% lên 150-200%
        const carDuration = 15000 / (probeCarSpeed * speedFactor) * 35;

        $newCar.css({
            'animation': `moveCarUp ${carDuration}ms linear forwards`
        });

        // Theo dõi vị trí xe để đếm khi đi qua vạch đỏ
        const checkInterval = setInterval(function () {
            if (checkCarPassedCountingLine(carId, 'up')) {
                incomingCount++;
                updateDisplayInfo();
                $newCar.data('counted', true);
            }
        }, 50);

        // Xóa xe và clear interval khi animation kết thúc
        setTimeout(function () {
            clearInterval(checkInterval);
            $newCar.remove();
        }, carDuration + 500);
    }

    // Hàm tạo xe đi lên làn chậm mới
    function spawnUpSlowCar() {
        // Giới hạn số xe đồng thời trên làn
        if (getLaneVehicleCount('[id^="car-up-slow-dynamic-"]') >= 3) {
            return;
        }

        carUpSlowCounter++;
        const carId = `car-up-slow-dynamic-${carUpSlowCounter}`;

        // Xác định loại xe ngẫu nhiên
        const vehicleTypes = ['sedan', 'suv', 'motorcycle', 'truck', 'bus'];
        const vehicleClass = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];

        // Xác định icon tương ứng với loại xe
        let vehicleIcon = 'fa-car'; // mặc định
        if (vehicleClass === 'suv') vehicleIcon = 'fa-shuttle-van';
        if (vehicleClass === 'motorcycle') vehicleIcon = 'fa-motorcycle';
        if (vehicleClass === 'truck') vehicleIcon = 'fa-truck';
        if (vehicleClass === 'bus') vehicleIcon = 'fa-bus';

        // Tạo phần tử xe mới
        const $newCar = $('<div>', {
            id: carId,
            class: `car-up ${vehicleClass}`,
            css: {
                'top': '155px',
                'left': '25px',  // Bắt đầu từ bên trái
                'visibility': 'visible'
            },
            html: `<i class="fa-icon fas ${vehicleIcon}"></i><span>A${carUpSlowCounter}</span>`
        });

        // Đánh dấu xe chưa được đếm
        $newCar.data('counted', false);

        // Thêm vào khu vực mô phỏng
        $('.simulation-area').append($newCar);

        // Thiết lập animation với tốc độ ngẫu nhiên
        const speedFactor = 2.0 + (Math.random() * 0.5); // Tăng từ 115-140% lên 200-250%
        const carDuration = 15000 / (probeCarSpeed * speedFactor) * 35;

        $newCar.css({
            'animation': `moveCarUp ${carDuration}ms linear forwards`
        });

        // Theo dõi vị trí xe để đếm khi đi qua vạch đỏ
        const checkInterval = setInterval(function () {
            if (checkCarPassedCountingLine(carId, 'up')) {
                incomingCount++;
                updateDisplayInfo();
                $newCar.data('counted', true);
            }
        }, 50);

        // Xóa xe và clear interval khi animation kết thúc
        setTimeout(function () {
            clearInterval(checkInterval);
            $newCar.remove();
        }, carDuration + 500);
    }

    // Hàm tạo xe đi xuống làn nhanh mới
    function spawnDownFastCar() {
        // Giới hạn số xe đồng thời trên làn
        if (getLaneVehicleCount('[id^="car-down-fast-dynamic-"]') >= 3) {
            return;
        }

        carDownFastCounter++;
        const carId = `car-down-fast-dynamic-${carDownFastCounter}`;

        // Xác định loại xe ngẫu nhiên
        const vehicleTypes = ['sedan', 'suv', 'motorcycle', 'truck', 'bus'];
        const vehicleClass = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];

        // Xác định icon tương ứng với loại xe
        let vehicleIcon = 'fa-car'; // mặc định
        if (vehicleClass === 'suv') vehicleIcon = 'fa-shuttle-van';
        if (vehicleClass === 'motorcycle') vehicleIcon = 'fa-motorcycle';
        if (vehicleClass === 'truck') vehicleIcon = 'fa-truck';
        if (vehicleClass === 'bus') vehicleIcon = 'fa-bus';

        // Tạo phần tử xe mới
        const $newCar = $('<div>', {
            id: carId,
            class: `car-down ${vehicleClass}`,
            css: {
                'top': '215px',
                'left': 'calc(100% - 150px)',  // Bắt đầu từ bên phải
                'visibility': 'visible'
            },
            html: `<i class="fa-icon fas ${vehicleIcon}"></i><span>B${carDownFastCounter}</span>`
        });

        // Đánh dấu xe chưa được đếm
        $newCar.data('counted', false);

        // Thêm vào khu vực mô phỏng
        $('.simulation-area').append($newCar);

        // Thiết lập animation
        const relativeSpeed = calculateSpeed() + probeCarSpeed;
        const speedVariation = 1.7 + (Math.random() * 0.3); // Tăng từ 90-110% lên 170-200%
        const carSpeed = relativeSpeed * speedVariation;
        const carDuration = 15000 / carSpeed * 87;

        $newCar.css({
            'animation': `moveCarDown ${carDuration}ms linear forwards`
        });

        // Theo dõi vị trí xe để đếm khi đi qua vạch đỏ
        const checkInterval = setInterval(function () {
            if (checkCarPassedCountingLine(carId, 'down')) {
                outgoingCount++;
                updateDisplayInfo();
                $newCar.data('counted', true);
            }
        }, 50);

        // Xóa xe và clear interval khi animation kết thúc
        setTimeout(function () {
            clearInterval(checkInterval);
            $newCar.remove();
        }, carDuration + 500);
    }

    // Hàm tạo xe đi xuống làn chậm mới
    function spawnDownSlowCar() {
        // Giới hạn số xe đồng thời trên làn
        if (getLaneVehicleCount('[id^="car-down-slow-dynamic-"]') >= 3) {
            return;
        }

        carDownSlowCounter++;
        const carId = `car-down-slow-dynamic-${carDownSlowCounter}`;

        // Xác định loại xe ngẫu nhiên
        const vehicleTypes = ['sedan', 'suv', 'motorcycle', 'truck', 'bus'];
        const vehicleClass = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];

        // Xác định icon tương ứng với loại xe
        let vehicleIcon = 'fa-car'; // mặc định
        if (vehicleClass === 'suv') vehicleIcon = 'fa-shuttle-van';
        if (vehicleClass === 'motorcycle') vehicleIcon = 'fa-motorcycle';
        if (vehicleClass === 'truck') vehicleIcon = 'fa-truck';
        if (vehicleClass === 'bus') vehicleIcon = 'fa-bus';

        // Tạo phần tử xe mới
        const $newCar = $('<div>', {
            id: carId,
            class: `car-down ${vehicleClass}`,
            css: {
                'top': '275px',
                'left': 'calc(100% - 150px)',  // Bắt đầu từ bên phải
                'visibility': 'visible'
            },
            html: `<i class="fa-icon fas ${vehicleIcon}"></i><span>B${carDownSlowCounter}</span>`
        });

        // Đánh dấu xe chưa được đếm
        $newCar.data('counted', false);

        // Thêm vào khu vực mô phỏng
        $('.simulation-area').append($newCar);

        // Thiết lập animation
        const relativeSpeed = calculateSpeed() + probeCarSpeed;
        const speedVariation = 1.5 + (Math.random() * 0.2); // Tăng từ 70-90% lên 150-170%
        const carSpeed = relativeSpeed * speedVariation;
        const carDuration = 15000 / carSpeed * 87;

        $newCar.css({
            'animation': `moveCarDown ${carDuration}ms linear forwards`
        });

        // Theo dõi vị trí xe để đếm khi đi qua vạch đỏ
        const checkInterval = setInterval(function () {
            if (checkCarPassedCountingLine(carId, 'down')) {
                outgoingCount++;
                updateDisplayInfo();
                $newCar.data('counted', true);
            }
        }, 50);

        // Xóa xe và clear interval khi animation kết thúc
        setTimeout(function () {
            clearInterval(checkInterval);
            $newCar.remove();
        }, carDuration + 500);
    }

    // Sửa đổi hàm reset để xử lý xe động
    function resetCarPositions() {
        // Đặt lại bộ đếm
        carUpFastCounter = 0;
        carUpSlowCounter = 0;
        carDownFastCounter = 0;
        carDownSlowCounter = 0;
        incomingCount = 0;
        outgoingCount = 0;

        // Xóa tất cả xe động
        $('[id^="car-up-fast-dynamic"], [id^="car-up-slow-dynamic"], [id^="car-down-fast-dynamic"], [id^="car-down-slow-dynamic"]').remove();

        // Đặt lại vị trí xe thăm dò nếu có
        if ($probeCar.length) {
            $probeCar.css({
                'animation': 'none',
                'left': '25px',
                'visibility': 'visible'
            });
        }

        // Cập nhật hiển thị
        updateDisplayInfo();
    }

    // Điều chỉnh nút reset để dừng spawning
    $('#reset-button, #mobile-restart-button').click(function () {
        // Dừng spawning liên tục
        clearInterval(spawnIntervalId);
        isAnimating = false;
        $('#start-button').html('<i class="fas fa-play me-1"></i>Bắt đầu');

        // Đặt lại vị trí tất cả xe
        resetCarPositions();

        // Đặt lại bộ đếm theo slider
        realIncomingCount = parseInt($('#incoming-slider').val());
        realOutgoingCount = parseInt($('#outgoing-slider').val());
        incomingCount = 0;
        outgoingCount = 0;
        updateDisplayInfo();
    });

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