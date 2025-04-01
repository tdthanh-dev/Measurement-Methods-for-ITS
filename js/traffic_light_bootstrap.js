$(document).ready(function () {
    // PHẦN 1: KHỞI TẠO BIẾN VÀ THAM SỐ
    let isRunning = false;            // Trạng thái đang chạy mô phỏng
    let isPaused = false;             // Trạng thái tạm dừng
    let isEmergency = false;          // Trạng thái khẩn cấp
    let greenTime = 30;               // Thời gian đèn xanh (giây)
    let yellowTime = 3;               // Thời gian đèn vàng (giây)
    let currentPhase = 0;             // Pha hiện tại (0: Đông-Tây, 1: Bắc-Nam)
    let currentTimer = greenTime;     // Bộ đếm thời gian hiện tại
    let timerInterval;                // ID của interval đếm thời gian
    let emergencyInterval;            // ID của interval nhấp nháy khẩn cấp
    let animationFrameId;             // ID của requestAnimationFrame
    let trafficDensity = 5;           // Mật độ giao thông (1-10)
    let vehicleSpeed = 5;             // Tốc độ xe (1-10)
    let vehicleId = 0;                // ID tăng dần cho mỗi xe mới
    let vehicleSpawnInterval;         // ID của interval tạo xe mới
    let lastFrameTime = 0;            // Thời gian frame cuối cùng cho animation
    let delayTime = 1;                // Thời gian trễ giữa các pha đèn (giây)
    let isSmartMode = false;          // Chế độ thông minh (điều chỉnh thời gian theo mật độ giao thông)
    let isPedestrianMode = false;     // Chế độ người đi bộ
    let simulationTimeSeconds = 0;    // Thời gian mô phỏng tính bằng giây
    let cycleCount = 0;               // Số chu kỳ đèn đã hoàn thành
    let simulationTimer;              // Timer cho việc đếm thời gian mô phỏng
    let vehicles = {                  // Mảng chứa các xe đang hoạt động
        north: [],
        south: [],
        east: [],
        west: []
    };

    // Vị trí ban đầu của xe
    const initialPositions = {
        north: { top: '-50px', left: '42%' },
        south: { top: '550px', left: '52%' },
        east: { top: '40%', left: '800px' },
        west: { top: '55%', left: '-50px' }
    };

    // Các loại xe và màu sắc tương ứng
    const vehicleTypes = [
        { icon: 'fa-car', class: 'car' },
        { icon: 'fa-truck-pickup', class: 'truck' },
        { icon: 'fa-motorcycle', class: 'motorcycle' },
        { icon: 'fa-bus', class: 'bus' },
        { icon: 'fa-truck', class: 'truck' },
        { icon: 'fa-taxi', class: 'taxi' },
        { icon: 'fa-ambulance', class: 'ambulance' }
    ];

    // Vị trí vạch dừng
    const stopLinePositions = {
        north: 195,  // Vị trí Y của vạch dừng hướng Bắc
        south: 355,  // Vị trí Y của vạch dừng hướng Nam
        east: 315,   // Vị trí X của vạch dừng hướng Đông
        west: 250    // Vị trí X của vạch dừng hướng Tây
    };

    // Tốc độ tối đa của xe (px mỗi frame) dựa trên vehicleSpeed
    function getMaxSpeed() {
        return vehicleSpeed * 0.8;
    }

    // PHẦN 2: TẠO MÔI TRƯỜNG GIAO THÔNG
    // Tạo vạch kẻ đường đứt đoạn
    function createRoadMarkings() {
        const simulationArea = $('.simulation-area');
        const areaWidth = simulationArea.width();
        const areaHeight = simulationArea.height();

        // Xóa vạch kẻ đường cũ nếu có
        $('.lane-marking-v, .lane-marking-h').remove();

        // Tạo vạch kẻ đường ngang
        const hSpacing = areaWidth / 20;
        for (let i = 0; i < 20; i++) {
            if (i < 9 || i > 10) { // Bỏ qua khu vực giao lộ
                simulationArea.append(`<div class="lane-marking-h" style="left: ${hSpacing * i + hSpacing / 2}px;"></div>`);
            }
        }

        // Tạo vạch kẻ đường dọc
        const vSpacing = areaHeight / 20;
        for (let i = 0; i < 20; i++) {
            if (i < 9 || i > 10) { // Bỏ qua khu vực giao lộ
                simulationArea.append(`<div class="lane-marking-v" style="top: ${vSpacing * i + vSpacing / 2}px;"></div>`);
            }
        }
    }

    // PHẦN 3: QUẢN LÝ XE CỘ
    // Đặt lại vị trí xe
    function resetVehicles() {
        // Xóa tất cả các xe
        $('#vehicles-container').empty();

        // Đặt lại mảng vehicles
        vehicles = {
            north: [],
            south: [],
            east: [],
            west: []
        };

        // Đặt lại ID xe
        vehicleId = 0;
    }

    // Tạo xe mới
    function createNewVehicle(direction) {
        vehicleId++;
        const id = `vehicle-${direction}-${vehicleId}`;

        // Chọn ngẫu nhiên loại xe
        const vehicleTypeIndex = Math.floor(Math.random() * vehicleTypes.length);
        const vehicleType = vehicleTypes[vehicleTypeIndex];

        // Tạo element mới
        const newVehicle = $(`<div class="vehicle vehicle-${direction} ${vehicleType.class}" id="${id}">
                    <i class="fas ${vehicleType.icon}"></i>
                </div>`);

        // Thêm vào container và vào mảng
        $('#vehicles-container').append(newVehicle);

        // Đặt vị trí ban đầu
        newVehicle.css({
            top: initialPositions[direction].top,
            left: initialPositions[direction].left
        });

        // Thêm sự kiện click đúp để đánh dấu xe phạt nguội
        newVehicle.on('dblclick', function () {
            const wasMarked = $(this).hasClass('fined-vehicle');

            if (wasMarked) {
                // Nếu đã đánh dấu, bỏ đánh dấu
                $(this).removeClass('fined-vehicle');
                console.log(`Bỏ đánh dấu phạt nguội xe ${id}`);

                // Cập nhật trạng thái trong mảng xe
                const vehicleIndex = vehicles[direction].findIndex(v => v.id === id);
                if (vehicleIndex !== -1) {
                    vehicles[direction][vehicleIndex].fined = false;
                }
            } else {
                // Nếu chưa đánh dấu, thêm đánh dấu
                $(this).addClass('fined-vehicle');
                console.log(`Đánh dấu phạt nguội xe ${id}`);

                // Hiển thị thông báo phạt nguội
                const notification = $(`<div class="alert alert-danger fine-notification" 
                    style="position: absolute; top: ${$(this).css('top')}; left: ${$(this).css('left')}; z-index: 1001;">
                    Phạt nguội!</div>`);
                $('body').append(notification);
                setTimeout(() => notification.fadeOut('slow', function () { $(this).remove(); }), 2000);

                // Cập nhật trạng thái trong mảng xe
                const vehicleIndex = vehicles[direction].findIndex(v => v.id === id);
                if (vehicleIndex !== -1) {
                    vehicles[direction][vehicleIndex].fined = true;
                }
            }
        });

        // Thêm vào mảng xe
        vehicles[direction].push({
            id: id,
            element: newVehicle,
            position: { ...initialPositions[direction] },
            speed: 0,
            maxSpeed: getMaxSpeed() * (0.7 + Math.random() * 0.6), // Tốc độ ngẫu nhiên cho mỗi xe
            lastUpdate: performance.now(),
            stopped: false,
            fined: false  // Thêm trạng thái phạt nguội
        });

        return vehicles[direction][vehicles[direction].length - 1];
    }

    // Hàm kiểm tra khoảng cách giữa các xe
    function checkDistance(direction, position) {
        const minDistance = 70; // Khoảng cách tối thiểu giữa các xe (px)
        let canSpawn = true;

        // Kiểm tra với tất cả xe hiện có trong cùng hướng
        vehicles[direction].forEach(vehicle => {
            let distance;

            if (direction === 'north' || direction === 'south') {
                distance = Math.abs(parseFloat(vehicle.element.css('top')) - parseFloat(position.top));
            } else {
                distance = Math.abs(parseFloat(vehicle.element.css('left')) - parseFloat(position.left));
            }

            if (distance < minDistance) {
                canSpawn = false;
            }
        });

        return canSpawn;
    }

    // Quản lý việc tạo xe mới
    function manageVehicleSpawns() {
        if (!isRunning || isPaused || isEmergency) return;

        // Tỷ lệ tạo xe dựa trên mật độ giao thông
        const spawnChance = trafficDensity / 50; // 2-20% cơ hội mỗi 500ms

        // Cố gắng tạo xe ở mỗi hướng
        ['north', 'south', 'east', 'west'].forEach(direction => {
            if (Math.random() < spawnChance) {
                // Kiểm tra xem có thể tạo xe mới không
                if (vehicles[direction].length < trafficDensity + 2 &&
                    checkDistance(direction, initialPositions[direction])) {
                    createNewVehicle(direction);
                }
            }
        });
    }

    // Cập nhật tốc độ xe
    $('#vehicle-speed-slider').on('input', function () {
        vehicleSpeed = parseInt($(this).val());
        let speedText;

        if (vehicleSpeed <= 3) speedText = "Chậm";
        else if (vehicleSpeed <= 7) speedText = "Trung bình";
        else speedText = "Nhanh";

        $('#vehicle-speed-display').text(speedText);

        // Cập nhật tốc độ cho tất cả xe hiện có
        Object.keys(vehicles).forEach(direction => {
            vehicles[direction].forEach(vehicle => {
                vehicle.maxSpeed = getMaxSpeed() * (0.7 + Math.random() * 0.6);
            });
        });
    });

    // PHẦN 4: ANIMATION & ĐIỀU KHIỂN XE
    // Kiểm tra va chạm giữa các xe
    function checkCollision(vehicle, direction) {
        let willCollide = false;
        const buffer = 50; // Khoảng cách an toàn
        const intersectionBuffer = 35; // Khoảng cách an toàn tại ngã tư

        const vehiclePos = {
            top: parseFloat(vehicle.element.css('top')),
            left: parseFloat(vehicle.element.css('left'))
        };

        // Kiểm tra trung tâm giao lộ
        const centerX = $('.simulation-area').width() / 2;
        const centerY = $('.simulation-area').height() / 2;
        const isApproachingIntersection =
            (Math.abs(vehiclePos.left - centerX) < 80 && Math.abs(vehiclePos.top - centerY) < 80);

        // Nếu xe đang đến gần trung tâm giao lộ, kiểm tra va chạm với xe từ các hướng khác
        if (isApproachingIntersection) {
            // Kiểm tra tất cả xe từ hướng khác đang ở gần trung tâm
            const directions = ['north', 'south', 'east', 'west'];
            for (let i = 0; i < directions.length; i++) {
                const otherDirection = directions[i];
                if (otherDirection === direction) continue;

                // Kiểm tra tất cả xe từ hướng khác
                for (let j = 0; j < vehicles[otherDirection].length; j++) {
                    const otherVehicle = vehicles[otherDirection][j];
                    const otherPos = {
                        top: parseFloat(otherVehicle.element.css('top')),
                        left: parseFloat(otherVehicle.element.css('left'))
                    };

                    // Tính khoảng cách đến trung tâm
                    const distanceToCenter = Math.sqrt(
                        Math.pow(otherPos.left - centerX, 2) +
                        Math.pow(otherPos.top - centerY, 2)
                    );

                    // Nếu xe khác đang ở gần trung tâm và nó đi trước
                    if (distanceToCenter < 60) {
                        // Tính toán thời gian để đến trung tâm
                        let timeToCenter = 0;

                        // Thời gian của xe đầu tiên đến trung tâm
                        if (direction === 'north') {
                            timeToCenter = (centerY - vehiclePos.top) / vehicle.speed;
                        } else if (direction === 'south') {
                            timeToCenter = (vehiclePos.top - centerY) / vehicle.speed;
                        } else if (direction === 'east') {
                            timeToCenter = (vehiclePos.left - centerX) / vehicle.speed;
                        } else if (direction === 'west') {
                            timeToCenter = (centerX - vehiclePos.left) / vehicle.speed;
                        }

                        // Nếu thời gian quá gần (sắp va chạm)
                        if (timeToCenter > 0 && timeToCenter < 15) {
                            willCollide = true;
                            break;
                        }
                    }
                }
                if (willCollide) break;
            }
        }

        // Vẫn giữ nguyên kiểm tra va chạm với xe cùng hướng
        vehicles[direction].forEach(otherVehicle => {
            if (otherVehicle.id !== vehicle.id) {
                const otherPos = {
                    top: parseFloat(otherVehicle.element.css('top')),
                    left: parseFloat(otherVehicle.element.css('left'))
                };

                let distance;

                if (direction === 'north') {
                    // Xe phía trước có tọa độ top lớn hơn (gần đỉnh trang hơn)
                    if (vehiclePos.top < otherPos.top && otherPos.top - vehiclePos.top < buffer) {
                        willCollide = true;
                    }
                } else if (direction === 'south') {
                    // Xe phía trước có tọa độ top nhỏ hơn (gần đáy trang hơn)
                    if (vehiclePos.top > otherPos.top && vehiclePos.top - otherPos.top < buffer) {
                        willCollide = true;
                    }
                } else if (direction === 'east') {
                    // Xe phía trước có tọa độ left nhỏ hơn (gần bên trái hơn)
                    if (vehiclePos.left > otherPos.left && vehiclePos.left - otherPos.left < buffer) {
                        willCollide = true;
                    }
                } else if (direction === 'west') {
                    // Xe phía trước có tọa độ left lớn hơn (gần bên phải hơn)
                    if (vehiclePos.left < otherPos.left && otherPos.left - vehiclePos.left < buffer) {
                        willCollide = true;
                    }
                }
            }
        });

        return willCollide;
    }

    // Kiểm tra đèn đỏ
    function shouldStopAtRedLight(vehicle, direction) {
        const redLightN = $('#north-red').hasClass('active');
        const redLightS = $('#south-red').hasClass('active');
        const redLightE = $('#east-red').hasClass('active');
        const redLightW = $('#west-red').hasClass('active');

        const pos = {
            top: parseFloat(vehicle.element.css('top')),
            left: parseFloat(vehicle.element.css('left'))
        };

        // Kiểm tra vị trí của xe và đèn đỏ
        if (direction === 'north' && redLightN) {
            return pos.top >= stopLinePositions.north - 30 && pos.top < stopLinePositions.north;
        } else if (direction === 'south' && redLightS) {
            return pos.top <= stopLinePositions.south + 30 && pos.top > stopLinePositions.south;
        } else if (direction === 'east' && redLightE) {
            return pos.left <= stopLinePositions.east + 30 && pos.left > stopLinePositions.east;
        } else if (direction === 'west' && redLightW) {
            // Điều chỉnh khoảng cách kiểm tra để xe dừng trước vạch dừng
            return pos.left >= stopLinePositions.west - 60 && pos.left < stopLinePositions.west - 15;
        }

        return false;
    }

    // Hàm chính di chuyển xe (sử dụng requestAnimationFrame)
    function animateVehicles(timestamp) {
        if (!lastFrameTime) lastFrameTime = timestamp;
        const deltaTime = timestamp - lastFrameTime;
        lastFrameTime = timestamp;

        if (!isRunning || isPaused || isEmergency) {
            animationFrameId = requestAnimationFrame(animateVehicles);
            return;
        }

        const simulationArea = $('.simulation-area');
        const areaWidth = simulationArea.width();
        const areaHeight = simulationArea.height();

        // Xác định đèn nào đang xanh
        const northSouthCanMove = $('#north-green').hasClass('active') || $('#north-yellow').hasClass('active');
        const eastWestCanMove = $('#east-green').hasClass('active') || $('#east-yellow').hasClass('active');

        // Di chuyển xe theo hướng
        Object.keys(vehicles).forEach(direction => {
            // Mảng tạm để lưu các xe cần xóa
            const toRemove = [];

            vehicles[direction].forEach((vehicle, index) => {
                const pos = {
                    top: parseFloat(vehicle.element.css('top')),
                    left: parseFloat(vehicle.element.css('left'))
                };

                // Kiểm tra điều kiện để xóa xe ra khỏi màn hình
                if ((direction === 'north' && pos.top > areaHeight + 50) ||
                    (direction === 'south' && pos.top < -50) ||
                    (direction === 'east' && pos.left < -50) ||
                    (direction === 'west' && pos.left > areaWidth + 50)) {
                    toRemove.push(index);
                    vehicle.element.remove();
                    return;
                }

                // Kiểm tra nếu xe đã vượt qua đèn đỏ (đã vượt qua vạch dừng)
                const hasCrossedStopLine = hasCrossedRedLight(vehicle, direction);

                // Kiểm tra có đèn đỏ và xe đang đến gần vạch dừng không
                // Chỉ kiểm tra khi xe chưa vượt qua vạch dừng
                const shouldStop = !hasCrossedStopLine && shouldStopAtRedLight(vehicle, direction);

                // Kiểm tra va chạm với xe khác
                const willCollide = checkCollision(vehicle, direction);

                let canMove = true;

                // Nếu xe chưa vượt qua vạch dừng, kiểm tra đèn tín hiệu
                if (!hasCrossedStopLine) {
                    if ((direction === 'north' || direction === 'south') && !northSouthCanMove) {
                        canMove = false;
                    } else if ((direction === 'east' || direction === 'west') && !eastWestCanMove) {
                        canMove = false;
                    }
                }
                // Nếu xe đã vượt qua vạch dừng, luôn cho phép di chuyển

                // Điều chỉnh tốc độ dựa trên hoàn cảnh
                if (shouldStop || willCollide) {
                    // Giảm tốc độ khi gần đèn đỏ hoặc xe phía trước
                    vehicle.speed = Math.max(0, vehicle.speed - 0.5);
                    vehicle.stopped = true;
                } else if (!canMove && vehicle.stopped) {
                    // Giữ nguyên khi đã dừng tại đèn đỏ
                    vehicle.speed = 0;
                } else {
                    // Tăng tốc trong điều kiện bình thường
                    vehicle.speed = Math.min(vehicle.maxSpeed, vehicle.speed + 0.2);
                    vehicle.stopped = false;
                }

                // Áp dụng tốc độ theo hướng di chuyển
                let newPos = { ...pos };

                if (direction === 'north') {
                    newPos.top += vehicle.speed * (deltaTime / 16);
                } else if (direction === 'south') {
                    newPos.top -= vehicle.speed * (deltaTime / 16);
                } else if (direction === 'east') {
                    newPos.left -= vehicle.speed * (deltaTime / 16);
                } else if (direction === 'west') {
                    newPos.left += vehicle.speed * (deltaTime / 16);
                }

                // Cập nhật vị trí mới
                vehicle.element.css({
                    top: newPos.top + 'px',
                    left: newPos.left + 'px'
                });
            });

            // Xóa các xe đã ra khỏi màn hình (bắt đầu từ cuối mảng)
            for (let i = toRemove.length - 1; i >= 0; i--) {
                vehicles[direction].splice(toRemove[i], 1);
            }
        });

        // Tiếp tục vòng lặp animation
        animationFrameId = requestAnimationFrame(animateVehicles);
    }

    // Hàm mới để kiểm tra xe đã vượt qua vạch dừng đèn đỏ chưa
    function hasCrossedRedLight(vehicle, direction) {
        const pos = {
            top: parseFloat(vehicle.element.css('top')),
            left: parseFloat(vehicle.element.css('left'))
        };

        // Kiểm tra dựa vào hướng di chuyển
        if (direction === 'north') {
            return pos.top > stopLinePositions.north;
        } else if (direction === 'south') {
            return pos.top < stopLinePositions.south;
        } else if (direction === 'east') {
            return pos.left < stopLinePositions.east;
        } else if (direction === 'west') {
            return pos.left > stopLinePositions.west;
        }

        return false;
    }

    // PHẦN 5: ĐIỀU KHIỂN ĐÈN TÍN HIỆU
    // Đặt trạng thái đèn cho hướng cụ thể
    function setLightState(direction, color) {
        $(`#${direction}-red`).removeClass('active');
        $(`#${direction}-yellow`).removeClass('active');
        $(`#${direction}-green`).removeClass('active');

        if (color) {
            $(`#${direction}-${color}`).addClass('active');
            console.log(`Đã kích hoạt đèn ${color} cho hướng ${direction}`);
        }
    }

    // Cập nhật hiển thị thời gian đếm ngược
    function updateCountdowns(time) {
        // Đảm bảo thời gian hiển thị luôn dương
        time = Math.max(0, time);

        if (currentPhase === 0) {
            // Hiển thị đếm ngược cho đèn Đông-Tây
            $('#east-countdown, #west-countdown').text(time);
            $('#north-countdown, #south-countdown').text('');
        } else {
            // Hiển thị đếm ngược cho đèn Bắc-Nam
            $('#north-countdown, #south-countdown').text(time);
            $('#east-countdown, #west-countdown').text('');
        }
    }

    // Đặt trạng thái đèn cho tất cả các hướng
    function setAllLights(state) {
        if (state === 'eastwest-green') {
            // Đông-Tây đèn xanh, Bắc-Nam đèn đỏ
            setLightState('east', 'green');
            setLightState('west', 'green');
            setLightState('north', 'red');
            setLightState('south', 'red');
        }
        else if (state === 'eastwest-yellow') {
            // Đông-Tây đèn vàng, Bắc-Nam đèn đỏ
            setLightState('east', 'yellow');
            setLightState('west', 'yellow');
            setLightState('north', 'red');
            setLightState('south', 'red');
        }
        else if (state === 'northsouth-green') {
            // Bắc-Nam đèn xanh, Đông-Tây đèn đỏ
            setLightState('north', 'green');
            setLightState('south', 'green');
            setLightState('east', 'red');
            setLightState('west', 'red');
        }
        else if (state === 'northsouth-yellow') {
            // Bắc-Nam đèn vàng, Đông-Tây đèn đỏ
            setLightState('north', 'yellow');
            setLightState('south', 'yellow');
            setLightState('east', 'red');
            setLightState('west', 'red');
        }
        else if (state === 'all-red') {
            // Tất cả đèn đỏ
            setLightState('north', 'red');
            setLightState('south', 'red');
            setLightState('east', 'red');
            setLightState('west', 'red');
        }
    }

    // PHẦN 6: CHỨC NĂNG KHẨN CẤP
    // Chuyển đổi chế độ khẩn cấp
    function toggleEmergency() {
        isEmergency = !isEmergency;

        if (isEmergency) {
            // Dừng bộ đếm thời gian hiện tại
            clearInterval(timerInterval);
            clearInterval(vehicleSpawnInterval);

            // Xác định loại khẩn cấp
            const emergencyType = $('#emergency-type').val();

            // Xử lý theo loại khẩn cấp
            if (emergencyType === 'standard') {
                // Nhấp nháy đèn vàng tiêu chuẩn
                let isYellowOn = true;
                emergencyInterval = setInterval(function () {
                    if (isYellowOn) {
                        setLightState('north', 'yellow');
                        setLightState('south', 'yellow');
                        setLightState('east', 'yellow');
                        setLightState('west', 'yellow');
                    } else {
                        setLightState('north', '');
                        setLightState('south', '');
                        setLightState('east', '');
                        setLightState('west', '');
                    }
                    isYellowOn = !isYellowOn;
                }, 500);
            } else {
                // Xe ưu tiên - đặt đèn xanh cho hướng ưu tiên
                if (emergencyType === 'ambulance' || emergencyType === 'police') {
                    // Giả định xe cứu thương/cảnh sát đi theo hướng Bắc-Nam
                    setLightState('north', 'green');
                    setLightState('south', 'green');
                    setLightState('east', 'red');
                    setLightState('west', 'red');
                } else if (emergencyType === 'firetruck') {
                    // Giả định xe cứu hỏa đi theo hướng Đông-Tây
                    setLightState('north', 'red');
                    setLightState('south', 'red');
                    setLightState('east', 'green');
                    setLightState('west', 'green');
                }

                // Phát âm thanh nếu được bật
                if ($('#sound-switch').is(':checked')) {
                    // Giả lập phát âm thanh (có thể thêm thư viện âm thanh thực tế)
                    console.log("Phát âm thanh cảnh báo cho " + emergencyType);
                }
            }

            // Cập nhật giao diện
            $('#emergency-button').text('KẾT THÚC KHẨN CẤP');
            $('#start-button, #stop-button, #continue-button').prop('disabled', true);
            $('.countdown').text('');
        } else {
            // Dừng nhấp nháy
            clearInterval(emergencyInterval);

            // Đặt lại trạng thái ban đầu
            setAllLights('all-red');
            $('#emergency-button').html('<i class="fas fa-exclamation-triangle mb-1"></i><br>KHẨN<br>CẤP');
            $('#start-button').prop('disabled', false);
            $('#stop-button, #continue-button').prop('disabled', true);

            // Đặt lại mô phỏng
            resetSimulation();
        }
    }

    // PHẦN 7: BỘ ĐẾM THỜI GIAN VÀ CHU KỲ ĐÈN
    // Điều chỉnh hàm startTrafficCycle để đảm bảo đèn xanh được kích hoạt chính xác
    function startTrafficCycle() {
        // Dừng các interval hiện tại nếu có
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        if (simulationTimer) {
            clearInterval(simulationTimer);
        }

        // Đặt lại các đèn trước
        setAllLights('all-red');

        // Thiết lập trạng thái ban đầu và đảm bảo các đèn được hiển thị đúng
        if (currentPhase === 0) {
            console.log("Kích hoạt đèn xanh hướng Đông-Tây");
            setAllLights('eastwest-green');
        } else {
            console.log("Kích hoạt đèn xanh hướng Bắc-Nam");
            setAllLights('northsouth-green');
        }

        // Kiểm tra lại xem đèn đã được thiết lập chưa
        if (currentPhase === 0) {
            if (!$('#east-green').hasClass('active') || !$('#west-green').hasClass('active')) {
                console.log("Đèn xanh chưa được kích hoạt đúng cách, thử lại");
                setLightState('east', 'green');
                setLightState('west', 'green');
                setLightState('north', 'red');
                setLightState('south', 'red');
            }
        } else {
            if (!$('#north-green').hasClass('active') || !$('#south-green').hasClass('active')) {
                console.log("Đèn xanh chưa được kích hoạt đúng cách, thử lại");
                setLightState('north', 'green');
                setLightState('south', 'green');
                setLightState('east', 'red');
                setLightState('west', 'red');
            }
        }

        // Bắt đầu bộ đếm thời gian
        currentTimer = greenTime;
        updateCountdowns(currentTimer);
        console.log("Bắt đầu đếm ngược từ: " + currentTimer);

        // Bắt đầu tạo xe mới
        vehicleSpawnInterval = setInterval(manageVehicleSpawns, 500);

        // Bắt đầu animation
        if (!animationFrameId) {
            lastFrameTime = 0;
            animationFrameId = requestAnimationFrame(animateVehicles);
        }

        // Bắt đầu đếm thời gian mô phỏng
        simulationTimer = setInterval(function () {
            try {
                simulationTimeSeconds++;
                updateStatistics();
            } catch (error) {
                console.error("Lỗi khi cập nhật thời gian mô phỏng:", error);
            }
        }, 1000);

        // Thiết lập interval để cập nhật đếm ngược
        timerInterval = setInterval(function () {
            try {
                if (currentTimer > 0) {
                    currentTimer--;
                    updateCountdowns(currentTimer);
                    console.log("Đếm ngược: " + currentTimer);
                } else {
                    // Kết thúc thời gian hiện tại, chuyển sang trạng thái tiếp theo
                    if (currentPhase === 0) {
                        if ($('#east-green').hasClass('active')) {
                            console.log("Chuyển từ đèn xanh sang đèn vàng (Đông-Tây)");
                            setAllLights('eastwest-yellow');
                            currentTimer = yellowTime;
                            updateCountdowns(currentTimer);
                        } else if ($('#east-yellow').hasClass('active')) {
                            console.log("Chuyển từ đèn vàng sang đèn đỏ, chờ trễ");
                            setAllLights('all-red');
                            currentTimer = delayTime;
                            updateCountdowns(currentTimer);
                        } else {
                            console.log("Sau thời gian trễ, chuyển sang pha Bắc-Nam");
                            currentPhase = 1;
                            setAllLights('northsouth-green');
                            currentTimer = greenTime;
                            updateCountdowns(currentTimer);

                            // Kiểm tra xem đèn xanh có được kích hoạt không
                            if (!$('#north-green').hasClass('active') || !$('#south-green').hasClass('active')) {
                                console.log("Đèn xanh Bắc-Nam chưa được kích hoạt, thử lại");
                                setLightState('north', 'green');
                                setLightState('south', 'green');
                            }

                            // Tăng số chu kỳ khi hoàn thành một chu kỳ đầy đủ
                            cycleCount++;
                            updateStatistics();

                            // Nếu đang ở chế độ thông minh, điều chỉnh thời gian đèn
                            if (isSmartMode) {
                                adjustLightTimingBasedOnTraffic();
                            }
                        }
                    } else {
                        if ($('#north-green').hasClass('active')) {
                            console.log("Chuyển từ đèn xanh sang đèn vàng (Bắc-Nam)");
                            setAllLights('northsouth-yellow');
                            currentTimer = yellowTime;
                            updateCountdowns(currentTimer);
                        } else if ($('#north-yellow').hasClass('active')) {
                            console.log("Chuyển từ đèn vàng sang đèn đỏ, chờ trễ");
                            setAllLights('all-red');
                            currentTimer = delayTime;
                            updateCountdowns(currentTimer);
                        } else {
                            console.log("Sau thời gian trễ, chuyển sang pha Đông-Tây");
                            currentPhase = 0;
                            setAllLights('eastwest-green');
                            currentTimer = greenTime;
                            updateCountdowns(currentTimer);

                            // Kiểm tra xem đèn xanh có được kích hoạt không
                            if (!$('#east-green').hasClass('active') || !$('#west-green').hasClass('active')) {
                                console.log("Đèn xanh Đông-Tây chưa được kích hoạt, thử lại");
                                setLightState('east', 'green');
                                setLightState('west', 'green');
                            }

                            // Nếu đang ở chế độ thông minh, điều chỉnh thời gian đèn
                            if (isSmartMode) {
                                adjustLightTimingBasedOnTraffic();
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Lỗi trong chu kỳ đèn tín hiệu:", error);
            }
        }, 1000);
    }

    // Thêm hàm kiểm tra trạng thái đèn để debug
    function checkLightStates() {
        console.log("Trạng thái đèn hiện tại:");
        console.log("North - Red: " + $('#north-red').hasClass('active') +
            ", Yellow: " + $('#north-yellow').hasClass('active') +
            ", Green: " + $('#north-green').hasClass('active'));
        console.log("South - Red: " + $('#south-red').hasClass('active') +
            ", Yellow: " + $('#south-yellow').hasClass('active') +
            ", Green: " + $('#south-green').hasClass('active'));
        console.log("East - Red: " + $('#east-red').hasClass('active') +
            ", Yellow: " + $('#east-yellow').hasClass('active') +
            ", Green: " + $('#east-green').hasClass('active'));
        console.log("West - Red: " + $('#west-red').hasClass('active') +
            ", Yellow: " + $('#west-yellow').hasClass('active') +
            ", Green: " + $('#west-green').hasClass('active'));
    }

    // Dừng chu kỳ đèn tín hiệu
    function stopTrafficCycle() {
        clearInterval(timerInterval);
        clearInterval(vehicleSpawnInterval);
        clearInterval(simulationTimer);
        // Không hủy animationFrameId để xe vẫn hiển thị đúng
    }

    // Đặt lại mô phỏng
    function resetSimulation() {
        // Dừng mô phỏng nếu đang chạy
        if (isRunning) {
            stopTrafficCycle();
        }

        // Hủy animation frame
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        // Đặt lại các biến
        isRunning = false;
        isPaused = false;
        currentPhase = 0;
        currentTimer = greenTime;
        simulationTimeSeconds = 0;
        cycleCount = 0;

        // Đặt lại đèn tín hiệu - đảm bảo tất cả đèn đỏ hiển thị đúng
        $('.light').removeClass('active'); // Xóa tất cả các trạng thái active trước
        setAllLights('all-red');

        // Kiểm tra lại đèn đỏ
        setTimeout(function () {
            if (!$('#north-red').hasClass('active')) {
                $('#north-red').addClass('active');
            }
            if (!$('#south-red').hasClass('active')) {
                $('#south-red').addClass('active');
            }
            if (!$('#east-red').hasClass('active')) {
                $('#east-red').addClass('active');
            }
            if (!$('#west-red').hasClass('active')) {
                $('#west-red').addClass('active');
            }

            // Log trạng thái đèn sau khi reset
            console.log("Trạng thái đèn sau khi reset:");
            checkLightStates();
        }, 100);

        updateCountdowns(currentTimer);

        // Đặt lại vị trí xe
        resetVehicles();

        // Đặt lại thống kê
        updateStatistics();

        // Đặt lại giao diện nút
        $('#start-button').show();
        $('#stop-button, #continue-button').hide();
        $('#start-button, #reset-button').prop('disabled', false);
    }

    // Thêm reset trạng thái đèn khi tải trang
    $(document).ready(function () {
        // Khởi tạo thêm
        setTimeout(function () {
            // Xóa tất cả các trạng thái active trước
            $('.light').removeClass('active');

            // Thiết lập đèn đỏ mặc định
            $('#north-red').addClass('active');
            $('#south-red').addClass('active');
            $('#east-red').addClass('active');
            $('#west-red').addClass('active');

            // Kiểm tra đèn sau khi khởi tạo
            console.log("Trạng thái đèn sau khi khởi tạo:");
            checkLightStates();
        }, 500);
    });

    // PHẦN 8: XỬ LÝ SỰ KIỆN NÚT
    // Sự kiện khi nhấn nút bắt đầu
    $('#start-button').on('click', function () {
        isRunning = true;
        isPaused = false;
        console.log("Bắt đầu mô phỏng đèn tín hiệu");

        // Kiểm tra trạng thái ban đầu
        checkLightStates();

        // Bắt đầu chu kỳ đèn tín hiệu
        startTrafficCycle();

        // Kiểm tra lại sau khi bắt đầu
        setTimeout(checkLightStates, 500);

        // Cập nhật giao diện nút
        $(this).hide();
        $('#stop-button').show();
        $('#continue-button').hide();
        $('#reset-button').prop('disabled', false);
    });

    // Sự kiện khi nhấn nút dừng
    $('#stop-button').on('click', function () {
        isPaused = true;

        // Dừng chu kỳ đèn tín hiệu
        stopTrafficCycle();

        // Cập nhật giao diện nút
        $(this).hide();
        $('#continue-button').show();
    });

    // Sự kiện khi nhấn nút tiếp tục
    $('#continue-button').on('click', function () {
        isPaused = false;

        // Tiếp tục chu kỳ đèn tín hiệu
        startTrafficCycle();

        // Cập nhật giao diện nút
        $(this).hide();
        $('#stop-button').show();
    });

    // Sự kiện khi nhấn nút đặt lại
    $('#reset-button').on('click', function () {
        resetSimulation();
    });

    // Sự kiện khi nhấn nút khẩn cấp
    $('#emergency-button').on('click', function () {
        toggleEmergency();
    });

    // Xử lý sự kiện khi nhấn nút thêm xe
    $('.add-vehicle-btn').on('click', function () {
        if (!isRunning) return;

        if ($(this).hasClass('add-north')) {
            createNewVehicle('north');
        } else if ($(this).hasClass('add-south')) {
            createNewVehicle('south');
        } else if ($(this).hasClass('add-east')) {
            createNewVehicle('east');
        } else if ($(this).hasClass('add-west')) {
            createNewVehicle('west');
        }
    });

    // PHẦN 9: KHỞI TẠO CHỨC NĂNG THÍCH ỨNG
    // Điều chỉnh vạch kẻ đường khi thay đổi kích thước cửa sổ
    $(window).on('resize', function () {
        createRoadMarkings();
    });

    // Xử lý các sự kiện chạm cho thiết bị di động
    $('.simulation-area').on('touchstart', function (e) {
        if (isRunning && !isPaused) {
            $('#stop-button').trigger('click');
        } else if (isPaused) {
            $('#continue-button').trigger('click');
        }
    });

    // PHẦN 10: KHỞI TẠO
    // Khởi tạo ban đầu
    function initializeSimulation() {
        // Tạo vạch kẻ đường
        createRoadMarkings();

        // Đặt lại xe
        resetVehicles();

        // Đặt các đèn về trạng thái ban đầu
        $('.light').removeClass('active');
        $('#north-red').addClass('active');
        $('#south-red').addClass('active');
        $('#east-red').addClass('active');
        $('#west-red').addClass('active');

        // Khởi tạo đồng hồ đếm ngược
        $('.countdown').text('');

        // Đặt lại các biến thống kê
        simulationTimeSeconds = 0;
        cycleCount = 0;

        // Cập nhật thống kê
        updateStatistics();

        // Ẩn nút dừng và tiếp tục
        $('#stop-button').hide();
        $('#continue-button').hide();

        // Hiển thị nút bắt đầu
        $('#start-button').show();

        console.log("Đã khởi tạo mô phỏng đèn tín hiệu giao thông");
    }

    // Chạy hàm khởi tạo khi trang tải xong
    $(document).ready(function () {
        // Khởi tạo mô phỏng
        initializeSimulation();

        // Kiểm tra trạng thái đèn sau khi khởi tạo
        setTimeout(function () {
            console.log("Kiểm tra trạng thái đèn sau khi khởi tạo:");
            checkLightStates();
        }, 500);
    });

    // Cập nhật biến và hiển thị đèn vàng
    $('#yellow-time-slider').on('input', function () {
        yellowTime = parseInt($(this).val());
        $('#yellow-time-display').text(yellowTime + 's');
    });

    // Cập nhật biến và hiển thị đèn xanh
    $('#green-time-slider').on('input', function () {
        greenTime = parseInt($(this).val());
        $('#green-time-display').text(greenTime + 's');
    });

    // Cập nhật biến và hiển thị mật độ giao thông
    $('#traffic-density-slider').on('input', function () {
        trafficDensity = parseInt($(this).val());
        let densityText;

        if (trafficDensity <= 3) densityText = "Thấp";
        else if (trafficDensity <= 7) densityText = "Trung bình";
        else densityText = "Cao";

        $('#traffic-density-display').text(densityText);

        // Nếu đang ở chế độ thông minh, điều chỉnh thời gian đèn
        if (isSmartMode && isRunning) {
            adjustLightTimingBasedOnTraffic();
        }
    });

    // Cập nhật độ trễ đèn đỏ
    $('#delay-time-slider').on('input', function () {
        delayTime = parseFloat($(this).val());
        $('#delay-time-display').text(delayTime + 's');
    });

    // Bật/tắt chế độ thông minh
    $('#smart-traffic-switch').on('change', function () {
        isSmartMode = $(this).is(':checked');
        if (isSmartMode && isRunning) {
            adjustLightTimingBasedOnTraffic();
        }
    });

    // Bật/tắt chế độ bộ hành
    $('#pedestrian-switch').on('change', function () {
        isPedestrianMode = $(this).is(':checked');
    });

    // Hàm mới: Điều chỉnh thời gian đèn dựa trên mật độ giao thông
    function adjustLightTimingBasedOnTraffic() {
        // Số xe trong mỗi hướng
        const northCount = vehicles.north.length;
        const southCount = vehicles.south.length;
        const eastCount = vehicles.east.length;
        const westCount = vehicles.west.length;

        // Tổng số xe theo hướng
        const northSouthTotal = northCount + southCount;
        const eastWestTotal = eastCount + westCount;

        // Điều chỉnh thời gian đèn xanh dựa trên tỷ lệ xe
        if (northSouthTotal > eastWestTotal * 2) {
            // Nhiều xe hướng Bắc-Nam hơn nhiều
            greenTime = Math.min(60, 30 + Math.floor(trafficDensity * 1.5));
            $('#green-time-slider').val(greenTime);
            $('#green-time-display').text(greenTime + 's');
        } else if (eastWestTotal > northSouthTotal * 2) {
            // Nhiều xe hướng Đông-Tây hơn nhiều
            greenTime = Math.min(60, 30 + Math.floor(trafficDensity * 1.5));
            $('#green-time-slider').val(greenTime);
            $('#green-time-display').text(greenTime + 's');
        } else {
            // Mật độ tương đối cân bằng
            greenTime = 30;
            $('#green-time-slider').val(greenTime);
            $('#green-time-display').text(greenTime + 's');
        }
    }

    // Cập nhật thống kê
    function updateStatistics() {
        // Đếm tổng số xe
        const totalVehicles = vehicles.north.length + vehicles.south.length +
            vehicles.east.length + vehicles.west.length;
        $('#vehicle-count').text(totalVehicles);

        // Đếm số xe bị phạt nguội
        let finedVehicles = 0;
        Object.keys(vehicles).forEach(direction => {
            vehicles[direction].forEach(vehicle => {
                if (vehicle.fined) {
                    finedVehicles++;
                }
            });
        });

        // Hiển thị số xe bị phạt nguội (nếu đã có element)
        if ($('#fined-count').length) {
            $('#fined-count').text(finedVehicles);
        } else {
            // Thêm thông tin phạt nguội vào bảng thống kê
            $('#statistics-container .card-body').append(`
                <div class="row mt-2">
                    <div class="col-7">Xe bị phạt nguội:</div>
                    <div class="col-5 text-end"><span id="fined-count">${finedVehicles}</span></div>
                </div>
            `);
        }

        // Cập nhật thời gian mô phỏng
        const minutes = Math.floor(simulationTimeSeconds / 60);
        const seconds = simulationTimeSeconds % 60;
        $('#simulation-time').text(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);

        // Cập nhật chu kỳ đèn
        $('#cycle-count').text(cycleCount);

        // Cập nhật hiệu suất lưu thông (dựa trên số xe đang di chuyển vs số xe đang dừng)
        let movingVehicles = 0;
        let totalVehiclesWithState = 0;

        Object.keys(vehicles).forEach(direction => {
            vehicles[direction].forEach(vehicle => {
                totalVehiclesWithState++;
                if (!vehicle.stopped) {
                    movingVehicles++;
                }
            });
        });

        const flowEfficiency = totalVehiclesWithState > 0 ?
            Math.round((movingVehicles / totalVehiclesWithState) * 100) : 100;

        $('#traffic-flow-bar').css('width', `${flowEfficiency}%`).text(`${flowEfficiency}%`);

        // Thay đổi màu của thanh tiến trình dựa trên hiệu suất
        if (flowEfficiency > 75) {
            $('#traffic-flow-bar').removeClass('bg-warning bg-danger').addClass('bg-success');
        } else if (flowEfficiency > 40) {
            $('#traffic-flow-bar').removeClass('bg-success bg-danger').addClass('bg-warning');
        } else {
            $('#traffic-flow-bar').removeClass('bg-success bg-warning').addClass('bg-danger');
        }
    }

    // Sự kiện khi nhấn nút hình thành kẹt xe
    $('#create-congestion-button').on('click', function () {
        if (!isRunning) return;

        console.log("Hình thành tình trạng kẹt xe");

        // Tăng mật độ giao thông lên mức cao
        trafficDensity = 10;
        $('#traffic-density-slider').val(trafficDensity);
        $('#traffic-density-display').text("Cao");

        // Giảm tốc độ xe
        vehicleSpeed = 2;
        $('#vehicle-speed-slider').val(vehicleSpeed);
        $('#vehicle-speed-display').text("Chậm");

        // Tạo nhiều xe cùng lúc ở tất cả các hướng
        const congestionCount = 5;
        for (let i = 0; i < congestionCount; i++) {
            setTimeout(function () {
                ['north', 'south', 'east', 'west'].forEach(direction => {
                    createNewVehicle(direction);
                });
            }, i * 300); // Tạo từng đợt xe cách nhau 300ms
        }

        // Thông báo UI
        const notification = $('<div class="alert alert-warning position-absolute" style="top: 10px; left: 50%; transform: translateX(-50%); z-index: 1000;">Đang hình thành kẹt xe...</div>');
        $('body').append(notification);
        setTimeout(() => notification.fadeOut('slow', function () { $(this).remove(); }), 3000);
    });

    // Thêm CSS cho xe bị phạt nguội vào phần đầu tài liệu hoặc file CSS riêng
    $('<style>')
        .prop('type', 'text/css')
        .html(`
            .fined-vehicle {
                background-color: rgba(255, 0, 0, 0.6) !important;
                border: 2px solid #ff0000 !important;
                box-shadow: 0 0 10px #ff0000 !important;
            }
            .fine-notification {
                font-size: 14px;
                padding: 5px 10px;
                border-radius: 5px;
                white-space: nowrap;
                transform: translate(-50%, -100%);
                animation: fadeInOut 2s ease-in-out;
            }
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, -80%); }
                20% { opacity: 1; transform: translate(-50%, -100%); }
                80% { opacity: 1; transform: translate(-50%, -100%); }
                100% { opacity: 0; transform: translate(-50%, -120%); }
            }
        `)
        .appendTo('head');
});