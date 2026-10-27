const API_BASE = '/api/v1';

let productsData = [];
let categoriesData = [];
let tablesData = [];
let customersData = [];
let currentOrder = null; 
let currentTable = null;
let currentCustomer = null;
let cartItems = []; // items of the current order

let currentFilteredProducts = [];
let selectedCategoryId = 0;
let currentProductPage = 1;
let productPageSize = 12; // Thích hợp hiển thị 2x3 hoặc 3x4 trên iPad

function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    const response = await fetch(API_BASE + url, { ...options, headers });
    
    if (response.status === 401 || response.status === 403) {
        alert("Phiên đăng nhập hết hạn hoặc bạn không có quyền truy cập!");
        window.location.href = '/login';
        throw new Error("Unauthorized");
    }
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Lỗi từ máy chủ API');
    }
    
    return data;
}

async function loadInitialData() {
    setupAuthUI();
    
    try {
        const [catRes, prodRes, tableRes] = await Promise.all([
            fetchWithAuth('/categories/all'),
            fetchWithAuth('/products/all'),
            fetchWithAuth('/tables')
        ]);
        categoriesData = catRes.data || [];
        productsData = prodRes.data || [];
        tablesData = tableRes.data || [];
        
        renderCategories();
        
        // Auto-load from URL or sessionStorage if coming from pos-tables.html
        const urlParams = new URLSearchParams(window.location.search);
        let urlTableId = parseInt(urlParams.get('tableId'));
        let urlOrderId = parseInt(urlParams.get('orderId'));
        
        if (urlTableId) {
            sessionStorage.setItem('posTableId', urlTableId);
            if (urlOrderId) {
                sessionStorage.setItem('posOrderId', urlOrderId);
            } else {
                sessionStorage.removeItem('posOrderId');
            }
        } else {
            const savedTableId = sessionStorage.getItem('posTableId');
            const savedOrderId = sessionStorage.getItem('posOrderId');
            if (savedTableId) {
                urlTableId = parseInt(savedTableId);
                if (savedOrderId) urlOrderId = parseInt(savedOrderId);
            }
        }
        
        if (urlTableId && urlOrderId) {
            const table = tablesData.find(t => t.id === urlTableId);
            if (table) {
                currentTable = table;
                const res = await fetchWithAuth(`/orders/${urlOrderId}`);
                if (res.data) {
                    currentOrder = res.data;
                    updateTableLabel();
                    await loadOrderItems(urlOrderId);
                }
            }
        } else if (urlTableId) {
            const table = tablesData.find(t => t.id === urlTableId);
            if (table) {
                currentTable = table;
                updateTableLabel();
                // Check if has active order
                const res = await fetchWithAuth('/orders/all');
                const orders = res.data || [];
                const active = orders.find(o => o.tableId === table.id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
                if (active) {
                    currentOrder = active;
                    await loadOrderItems(active.id);
                }
            }
        }
        
        if (!currentTable) {
            alert("Vui lòng chọn Bàn trước khi gọi món! Hệ thống chuyển bạn về Sơ đồ bàn...");
            window.location.href = "/pos-tables";
            return;
        }

        // Cập nhật URL sạch đẹp
        if (window.location.search) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        window.applyFilters();
    } catch (err) {
        console.error("Error loading data", err);
    }
}

async function updateTableLabel() {
    if (!currentTable) return;
    let tName = String(currentTable.tableName || currentTable.name || currentTable.id).trim();
    let display = tName.toLowerCase().startsWith('bàn') ? tName : 'Bàn ' + tName;
    const label = document.getElementById('current-table-label');
    if (label) label.innerText = display;

    const roles = JSON.parse(localStorage.getItem('userRoles') || '[]');
    const singleRole = localStorage.getItem('role') || localStorage.getItem('userRole') || '';
    const allRoles = [...roles, singleRole];
    const isCashierOrAdmin = allRoles.some(r => typeof r === 'string' && (r.toUpperCase().includes('ADMIN') || r.toUpperCase().includes('CASHIER')));
    
    const btnOrderSwitchTable = document.getElementById('btnOrderSwitchTable');
    const btnOrderFutureRes = document.getElementById('btnOrderFutureRes');
    const btnOrderViewFutureRes = document.getElementById('btnOrderViewFutureRes');
    if (btnOrderSwitchTable) {
        btnOrderSwitchTable.style.display = (isCashierOrAdmin && currentOrder) ? 'inline-flex' : 'none';
    }
    if (btnOrderFutureRes) {
        btnOrderFutureRes.style.display = isCashierOrAdmin ? 'inline-flex' : 'none';
    }
    if (btnOrderViewFutureRes) {
        btnOrderViewFutureRes.style.display = 'none';
    }
    
    const kBadge = document.getElementById('order-kitchen-status-badge');
    if (kBadge) {
        if (currentOrder) {
            kBadge.style.display = 'inline-flex';
            if (currentOrder.status === 'PROCESSING') {
                kBadge.style.backgroundColor = '#ea580c';
                kBadge.style.color = '#fff';
                kBadge.innerHTML = '<i class="fa fa-fire"></i> Bếp đang chế biến';
            } else if (currentOrder.status === 'SERVED' || currentOrder.status === 'READY') {
                kBadge.style.backgroundColor = '#16a34a';
                kBadge.style.color = '#fff';
                kBadge.innerHTML = '<i class="fa fa-check-circle"></i> Đã lên đủ món';
            } else {
                kBadge.style.backgroundColor = '#475569';
                kBadge.style.color = '#fff';
                kBadge.innerHTML = '<i class="fa fa-clock-o"></i> Chờ bếp nhận đơn';
            }
        } else {
            kBadge.style.display = 'none';
        }
    }

    const staffBadge = document.getElementById('order-staff-badge');
    const staffNameEl = document.getElementById('order-staff-name');
    if (staffBadge && staffNameEl) {
        if (currentOrder && (currentOrder.username || currentOrder.userName)) {
            staffBadge.style.display = 'inline-flex';
            staffNameEl.textContent = 'Order: ' + (currentOrder.username || currentOrder.userName);
        } else {
            staffBadge.style.display = 'none';
        }
    }

    const btnCus = document.getElementById('current-customer-btn');
    const nameCus = document.getElementById('current-customer-name');
    const badgeCus = document.getElementById('current-customer-visit-badge');
    if (btnCus) {
        if (currentOrder) {
            btnCus.style.display = 'inline-flex';
            const cName = currentOrder.customerName || 'Khách vãng lai';
            if (nameCus) nameCus.innerText = cName;
            
            const visits = currentOrder.visitCount || 1;
            const phone = currentOrder.customerPhone;
            if (badgeCus) {
                if (phone && phone !== '0000000000' && visits > 1) {
                    badgeCus.style.display = 'inline-block';
                    badgeCus.innerText = `Ghé ${visits} lần`;
                    badgeCus.style.backgroundColor = '#10b981';
                } else if (phone && phone !== '0000000000') {
                    badgeCus.style.display = 'inline-block';
                    badgeCus.innerText = 'Lần đầu';
                    badgeCus.style.backgroundColor = '#0ea5e9';
                } else {
                    badgeCus.style.display = 'none';
                }
            }
        } else {
            btnCus.style.display = 'none';
        }
    }

    if (isCashierOrAdmin && currentTable.id) {
        checkTableFutureReservations(currentTable.id);
    }
}

let orderLookupTimeout = null;
window.lookupCustomerByPhoneOrder = function(phone, nameInputId, feedbackElemId) {
    if (orderLookupTimeout) clearTimeout(orderLookupTimeout);
    const feedbackElem = document.getElementById(feedbackElemId);
    if (!phone || phone.trim().length < 8) {
        if (feedbackElem) feedbackElem.innerHTML = '';
        return;
    }
    const cleanPhone = phone.trim();
    if (cleanPhone === '0000000000') {
        if (feedbackElem) feedbackElem.innerHTML = '';
        return;
    }

    orderLookupTimeout = setTimeout(async () => {
        try {
            if (feedbackElem) feedbackElem.innerHTML = '<span style="color:#6c757d; font-size:12px;"><i class="fa fa-spinner fa-spin"></i> Đang tra cứu thông tin khách...</span>';
            const res = await fetchWithAuth(`/customers/by-phone/${cleanPhone}`);
            const customer = res.data;
            if (customer && customer.fullName) {
                const nameInput = document.getElementById(nameInputId);
                if (nameInput && (!nameInput.value || nameInput.value === 'Khách vãng lai' || nameInput.value.trim() === '')) {
                    nameInput.value = customer.fullName;
                }
                const visits = customer.visitCount || 1;
                if (feedbackElem) {
                    feedbackElem.innerHTML = `
                        <div style="background: #e6fffa; border: 1px solid #38b2ac; color: #234e52; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-top: 4px;">
                            <i class="fa fa-star" style="color: #d69e2e;"></i> <b>Khách quen!</b> Đã ghé quán <b>${visits}</b> lần • Tên: <b>${escapeHtml(customer.fullName)}</b>
                        </div>`;
                }
            } else {
                if (feedbackElem) {
                    feedbackElem.innerHTML = `
                        <div style="background: #ebf8ff; border: 1px solid #63b3ed; color: #2b6cb0; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-top: 4px;">
                            <i class="fa fa-info-circle"></i> <b>Khách mới</b> ghé lần đầu
                        </div>`;
                }
            }
        } catch (err) {
            if (feedbackElem) feedbackElem.innerHTML = '';
        }
    }, 300);
};

window.openCustomerInfoModalInOrder = async function() {
    if (!currentOrder) {
        Swal.fire({
            icon: 'warning',
            title: 'Chưa có đơn hàng',
            text: 'Bàn hiện chưa có đơn hàng nào đang phục vụ!'
        });
        return;
    }

    try {
        const ordRes = await fetchWithAuth(`/orders/${currentOrder.id}`);
        const order = ordRes.data || currentOrder;
        
        let customer = null;
        if (order.customerId) {
            try {
                const cusRes = await fetchWithAuth(`/customers/${order.customerId}`);
                customer = cusRes.data;
            } catch(e) {}
        }

        const cusName = (customer ? customer.fullName : order.customerName) || 'Khách vãng lai';
        const cusPhone = (customer ? customer.phone : order.customerPhone) || '';
        const visits = customer && customer.visitCount ? customer.visitCount : (order.visitCount || 1);
        const tableName = (currentTable ? (currentTable.tableName || currentTable.name || ('Bàn ' + currentTable.id)) : 'Bàn ăn');
        
        const isWalkIn = !cusPhone || cusPhone === '0000000000' || cusPhone.startsWith('VL');
        const visitBadge = (!isWalkIn && visits > 1)
            ? `<span class="badge" style="background: #10b981; color: #fff; padding: 6px 10px; font-size:12px;"><i class="fa fa-star"></i> Khách quen! Đã ghé ${visits} lần</span>`
            : (!isWalkIn)
            ? `<span class="badge" style="background: #0ea5e9; color: #fff; padding: 6px 10px; font-size:12px;"><i class="fa fa-user"></i> Khách mới ghé lần đầu</span>`
            : `<span class="badge" style="background: #64748b; color: #fff; padding: 6px 10px; font-size:12px;"><i class="fa fa-user"></i> Khách vãng lai</span>`;

        const { value: formValues } = await Swal.fire({
            title: `<div style="font-size:20px; font-weight:bold; color:#0284c7;"><i class="fa fa-user"></i> Thông Tin Khách Đang Ăn - ${escapeHtml(tableName)}</div>`,
            html: `
                <div style="text-align: left; font-size: 14px;">
                    <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px; margin-bottom: 12px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-weight:bold; color:#0369a1;">Mã đơn: #${order.orderCode || order.id}</div>
                            <div style="font-size:12px; color:#64748b;">Bàn: ${escapeHtml(tableName)}</div>
                        </div>
                        <div>${visitBadge}</div>
                    </div>

                    <div class="form-group" style="margin-bottom:12px;">
                        <label style="font-weight:bold; margin-bottom:4px; display:block;">Số điện thoại khách hàng</label>
                        <input id="swal-order-cus-phone" class="swal2-input" style="width:100%; margin:0;" value="${escapeHtml(isWalkIn ? '' : cusPhone)}" placeholder="Ví dụ: 0987654321">
                        <div id="swal-order-cus-phone-feedback" style="margin-top:4px;"></div>
                    </div>

                    <div class="form-group" style="margin-bottom:12px;">
                        <label style="font-weight:bold; margin-bottom:4px; display:block;">Tên khách hàng <span class="text-danger" style="color:red;">*</span></label>
                        <input id="swal-order-cus-name" class="swal2-input" style="width:100%; margin:0;" value="${escapeHtml(cusName)}" placeholder="Nhập tên khách hàng">
                    </div>

                    <div class="form-group" style="margin-bottom:12px;">
                        <label style="font-weight:bold; margin-bottom:4px; display:block;">Ghi chú đơn hàng / Yêu cầu riêng</label>
                        <input id="swal-order-note" class="swal2-input" style="width:100%; margin:0;" value="${escapeHtml(order.note || '')}" placeholder="Ghi chú món ăn, khẩu vị, thông tin thêm...">
                    </div>
                </div>
            `,
            didOpen: () => {
                const phoneInput = document.getElementById('swal-order-cus-phone');
                if (phoneInput) {
                    phoneInput.addEventListener('input', () => {
                        window.lookupCustomerByPhoneOrder(phoneInput.value, 'swal-order-cus-name', 'swal-order-cus-phone-feedback');
                    });
                }
            },
            showCancelButton: true,
            confirmButtonText: '<i class="fa fa-save"></i> Lưu thông tin',
            cancelButtonText: 'Đóng',
            confirmButtonColor: '#0284c7',
            preConfirm: () => {
                const name = (document.getElementById('swal-order-cus-name').value || '').trim();
                const phone = (document.getElementById('swal-order-cus-phone').value || '').trim() || '0000000000';
                const note = (document.getElementById('swal-order-note').value || '').trim();
                if (!name) {
                    Swal.showValidationMessage('Tên khách hàng không được để trống!');
                    return false;
                }
                return { name, phone, note };
            }
        });

        if (!formValues) return;

        // Check-in thông tin khách hàng mới hoặc cập nhật
        const cusRes = await fetchWithAuth('/customers/check-in', {
            method: 'POST',
            body: JSON.stringify({ fullName: formValues.name, phone: formValues.phone })
        });
        const newCustomer = cusRes.data;
        if (newCustomer && newCustomer.id) {
            await fetchWithAuth(`/orders/${order.id}/customer/${newCustomer.id}`, {
                method: 'PUT'
            }).catch(e => console.warn(e));
        }

        await fetchWithAuth(`/orders/${order.id}/note`, {
            method: 'PUT',
            body: JSON.stringify({ note: formValues.note })
        });

        currentOrder.customerName = formValues.name;
        currentOrder.customerPhone = formValues.phone;
        currentOrder.note = formValues.note;

        try {
            const updatedOrd = await fetchWithAuth(`/orders/${order.id}`);
            if (updatedOrd.data) {
                currentOrder = updatedOrd.data;
            }
        } catch(e) {}

        updateTableLabel();

        Swal.fire({
            icon: 'success',
            title: 'Cập nhật thành công! 🎉',
            text: `Đã lưu thông tin khách hàng cho ${tableName}`,
            timer: 1500,
            showConfirmButton: false
        });

    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Lỗi cập nhật',
            text: err.message,
            confirmButtonColor: '#d33'
        });
    }
};

async function checkTableFutureReservations(tableId) {
    try {
        const res = await fetchWithAuth('/reservations/all');
        const allRes = res.data || [];
        const tableResList = allRes.filter(r => r.tableId === tableId && r.status !== 'CANCELLED' && r.status !== 'COMPLETED');
        const btnOrderViewFutureRes = document.getElementById('btnOrderViewFutureRes');
        if (btnOrderViewFutureRes && tableResList.length > 0) {
            btnOrderViewFutureRes.style.display = 'inline-flex';
            
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            const currentMin = now.getHours() * 60 + now.getMinutes();
            let isSoon = false;
            tableResList.forEach(r => {
                if (r.reservationDate === todayStr && r.startTime) {
                    const [h, m] = r.startTime.split(':').map(Number);
                    const diff = (h * 60 + m) - currentMin;
                    if (diff >= -30 && diff <= 60) isSoon = true;
                }
            });

            if (isSoon) {
                btnOrderViewFutureRes.style.background = '#e11d48';
                btnOrderViewFutureRes.innerHTML = `<i class="fa fa-bell"></i> Sắp tới ca sau (${tableResList.length})`;
            } else {
                btnOrderViewFutureRes.style.background = '#0284c7';
                btnOrderViewFutureRes.innerHTML = `<i class="fa fa-clock-o"></i> Xem ca sau (${tableResList.length})`;
            }
        }
    } catch (e) {}
}

// Lấy tên hiển thị của thu ngân (TUYỆT ĐỐI KHÔNG LẤY ROLE hoặc fallback Administrator)
function getCashierDisplayName() {
    let name = localStorage.getItem('userFullName');
    if (name && !name.toUpperCase().startsWith('ROLE_') && name.toUpperCase() !== 'ADMIN' && name.toUpperCase() !== 'CASHIER' && name.toUpperCase() !== 'ADMINISTRATOR') {
        return name.trim();
    }
    let userName = localStorage.getItem('userName');
    if (userName && !userName.toUpperCase().startsWith('ROLE_') && userName.toUpperCase() !== 'ADMIN' && userName.toUpperCase() !== 'CASHIER' && userName.toUpperCase() !== 'ADMINISTRATOR') {
        return userName.trim();
    }
    let email = localStorage.getItem('userEmail') || '';
    if (email && email.includes('@')) {
        return email.split('@')[0];
    }
    return email || 'Thu ngân';
}

async function setupAuthUI() {
    let fullName = localStorage.getItem('userFullName');
    const email = localStorage.getItem('userEmail');
    const userId = localStorage.getItem('userId');

    if ((!fullName || fullName.toUpperCase().startsWith('ROLE_') || fullName.toUpperCase() === 'ADMIN' || fullName.toUpperCase() === 'CASHIER' || fullName.toUpperCase() === 'ADMINISTRATOR') && userId) {
        try {
            const uRes = await fetchWithAuth(`/users/${userId}`);
            if (uRes && uRes.data && (uRes.data.fullName || uRes.data.username)) {
                fullName = (uRes.data.fullName || uRes.data.username).trim();
                localStorage.setItem('userFullName', fullName);
            }
        } catch(e) {}
    }

    const badge = document.getElementById('auth-email-badge');
    if (badge) {
        badge.innerText = `👤 ${getCashierDisplayName()}`;
    }
}

window.logout = function(e) {
    if(e) e.preventDefault();
    if(confirm("Bạn có chắc chắn muốn đăng xuất?")) {
        const authKeys = ['token', 'userRole', 'userRoles', 'role', 'userEmail', 'userId', 'userFullName', 'userName'];
        authKeys.forEach(k => localStorage.removeItem(k));
        window.location.href = '/login';
    }
};

/* RENDER DANH MỤC DẠNG CỘT DỌC IPAD */
function renderCategories() {
    const container = document.getElementById('category-sidebar-list');
    if (!container) return;

    let html = `
        <div class="category-item ${selectedCategoryId === 0 ? 'active' : ''}" onclick="selectCategory(0)">
            <i class="fa fa-utensils"></i>
            <span>Tất cả món</span>
        </div>
    `;

    const iconMap = {
        'lau': 'fa-fire',
        'thit': 'fa-drumstick-bite',
        'rau': 'fa-seedling',
        'hai san': 'fa-fish',
        'nuoc': 'fa-glass-whiskey',
        'do uong': 'fa-beer',
        'khai vi': 'fa-cookie-bite',
        'trang mieng': 'fa-ice-cream'
    };

    categoriesData.forEach(c => {
        let catLower = c.name.toLowerCase();
        let icon = 'fa-bowl-food';
        for (const [key, ic] of Object.entries(iconMap)) {
            if (catLower.includes(key)) {
                icon = ic;
                break;
            }
        }

        html += `
            <div class="category-item ${selectedCategoryId === c.id ? 'active' : ''}" onclick="selectCategory(${c.id})">
                <i class="fa ${icon}"></i>
                <span>${escapeHtml(c.name)}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

window.selectCategory = function(catId) {
    selectedCategoryId = catId;
    renderCategories();
    window.applyFilters();
};

window.onSearchInput = function(val) {
    window.applyFilters();
};

window.applyFilters = function() {
    const keyword = (document.getElementById('food-search-input')?.value || '').toLowerCase().trim();
    
    let filtered = productsData;
    if (selectedCategoryId !== 0) {
        filtered = filtered.filter(p => p.categoryId === selectedCategoryId);
    }
    if (keyword) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(keyword));
    }
    
    currentFilteredProducts = filtered;
    currentProductPage = 1;
    renderProducts();
};

/* RENDER DANH SÁCH MÓN ĂN GIAO DIỆN IPAD */
function renderProducts() {
    const products = currentFilteredProducts;
    const totalPages = Math.ceil(products.length / productPageSize) || 1;
    if (currentProductPage > totalPages) currentProductPage = totalPages;
    if (currentProductPage < 1) currentProductPage = 1;

    const start = (currentProductPage - 1) * productPageSize;
    const paginated = products.slice(start, start + productPageSize);

    const countLabel = document.getElementById('food-count-label');
    if (countLabel) {
        countLabel.innerText = `Tìm thấy ${products.length} món ăn`;
    }

    const container = document.getElementById('products-container');
    if (!container) return;

    if (paginated.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #888;">
                <i class="fa fa-utensils" style="font-size: 40px; margin-bottom: 12px; color: #ccc;"></i>
                <p>Không tìm thấy món ăn nào phù hợp!</p>
            </div>
        `;
        renderProductPagination(0);
        return;
    }

    let html = '';
    paginated.forEach(p => {
        let imgUrl = p.imageUrl || p.image;
        if (imgUrl) {
            if (!imgUrl.startsWith("http")) {
                imgUrl = imgUrl.startsWith("/uploads") ? imgUrl : "/uploads/" + imgUrl.split("/").pop(); 
            }
        } else {
            imgUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=350&auto=format&fit=crop&q=60";
        }

        // Kiểm tra số lượng đã chọn trong giỏ hàng hiện tại (hỗ trợ cả trường hợp món bị tách dòng)
        const matchingCartItems = cartItems.filter(it => it.productId === p.id);
        const qtyInCart = matchingCartItems.reduce((sum, it) => sum + (it.quantity || 0), 0);
        const inCartItem = matchingCartItems[matchingCartItems.length - 1];
        const isCookingOrReady = matchingCartItems.some(it => it.status === 'PREPARING' || it.status === 'READY');

        let actionHtml = '';
        if (qtyInCart > 0 && inCartItem) {
            actionHtml = `
                <div class="stepper-box">
                    ${isCookingOrReady ? `
                        <button class="btn-stepper" disabled style="opacity:0.35; cursor:not-allowed;" title="Món đang nấu, không thể xóa">-</button>
                    ` : `
                        <button class="btn-stepper" onclick="changeItemQty(${inCartItem.id}, ${p.id}, -1)">-</button>
                    `}
                    <span class="stepper-val">${qtyInCart}</span>
                    <button class="btn-stepper plus" onclick="changeItemQty(${inCartItem.id}, ${p.id}, 1)">+</button>
                </div>
            `;
        } else {
            actionHtml = `
                <button class="btn-circle-add" onclick="quickAddToCart(${p.id})" title="Thêm món">
                    <i class="fa fa-plus"></i>
                </button>
            `;
        }

        html += `
        <div class="dish-card">
            <div class="dish-body">
                <div>
                    <h3 class="dish-title" onclick="quickAddToCart(${p.id})">${escapeHtml(p.name)}</h3>
                    <div class="dish-category-tag">${escapeHtml(p.categoryName || '')}</div>
                    <span class="dish-portion-badge">Phần</span>
                </div>
                <div class="dish-footer">
                    <div class="dish-price">${(p.price || 0).toLocaleString()} ₫</div>
                    <div class="dish-action-group">
                        ${actionHtml}
                    </div>
                </div>
            </div>
            <div class="dish-img-wrap" onclick="quickAddToCart(${p.id})">
                <img src="${imgUrl}" alt="${escapeHtml(p.name)}" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=350&auto=format&fit=crop&q=60'">
            </div>
        </div>`;
    });

    container.innerHTML = html;
    renderProductPagination(products.length);
}

function renderProductPagination(totalItems) {
    const container = document.getElementById('products-pagination-container');
    if (!container) return;

    const totalPages = Math.ceil(totalItems / productPageSize);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    if (currentProductPage > 1) {
        html += `<a href="#" class="page-pill" onclick="changeProductPage(${currentProductPage - 1}, event)"><i class="fa fa-chevron-left"></i></a>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        html += `<a href="#" class="page-pill ${i === currentProductPage ? 'active' : ''}" onclick="changeProductPage(${i}, event)">${i}</a>`;
    }

    if (currentProductPage < totalPages) {
        html += `<a href="#" class="page-pill" onclick="changeProductPage(${currentProductPage + 1}, event)"><i class="fa fa-chevron-right"></i></a>`;
    }

    container.innerHTML = html;
}

window.changeProductPage = function(page, e) {
    if(e) e.preventDefault();
    currentProductPage = page;
    renderProducts();
};

/* THÊM MÓN & ĐIỀU CHỈNH SỐ LƯỢNG TIỆN LỢI */
window.quickAddToCart = async function(productId) {
    if (!currentOrder) {
        Swal.fire({
            icon: 'warning',
            title: 'Chưa chọn bàn!',
            text: 'Bàn chưa có đơn hàng hoạt động. Vui lòng chọn hoặc mở bàn trước.',
            confirmButtonColor: '#d10024'
        });
        return;
    }

    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    try {
        const existingItem = cartItems.find(item => item.productId === product.id);
        
        if (existingItem) {
            // Món đã có trong đơn: hỏi muốn tăng nhanh hay thêm phần mới có ghi chú riêng
            const totalThisProduct = cartItems.filter(i => i.productId === product.id).reduce((s,i) => s + (i.quantity || 0), 0);
            const { value: addChoice, isDismissed } = await Swal.fire({
                title: `<span style="font-size: 20px; color: #1e293b;">${escapeHtml(product.name)}</span>`,
                html: `
                    <div style="text-align: left; font-size: 14px; margin: 10px 0; line-height: 1.5;">
                        Món này hiện đã có <b>${totalThisProduct} phần</b> trong giỏ hàng.<br>
                        Khách muốn gọi thêm thế nào?
                    </div>
                `,
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonText: '<i class="fa fa-plus me-1"></i> Tăng +1 (Cùng ghi chú)',
                denyButtonText: '<i class="fa fa-pencil-alt me-1"></i> Thêm phần mới (Ghi chú riêng)',
                cancelButtonText: 'Đóng',
                confirmButtonColor: '#16a34a',
                denyButtonColor: '#d97706',
                cancelButtonColor: '#64748b'
            });

            if (isDismissed) return; // Người dùng bấm Hủy / Đóng

            if (addChoice) {
                // Tăng số lượng nhanh
                await changeItemQty(existingItem.id, product.id, 1);
                return;
            }
            // Nếu bấm deny (Thêm phần mới có ghi chú riêng) -> Tiếp tục chạy xuống modal nhập ghi chú bên dưới!
        }

        // Popup SweetAlert2 nhập ghi chú to rõ, sang trọng
        const { value: note, isConfirmed } = await Swal.fire({
            title: `<span style="font-size: 22px; color: #222;">📝 Ghi Chú Món Ăn</span>`,
            html: `
                <div style="text-align: left; margin: 12px 0;">
                    <div style="font-size: 18px; font-weight: bold; color: #d10024; margin-bottom: 6px;">
                        ${escapeHtml(product.name)}
                    </div>
                    <div style="font-size: 13.5px; color: #64748b; margin-bottom: 12px;">
                        Nhập yêu cầu chế biến của khách hoặc chọn nhanh bên dưới:
                    </div>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">
                        <span class="badge" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; font-size: 12.5px; padding: 6px 10px; cursor: pointer; border-radius: 6px;" onclick="const inp=document.querySelector('.swal2-input'); inp.value = (inp.value + ' Ít cay').trim()">🌶️ Ít cay</span>
                        <span class="badge" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; font-size: 12.5px; padding: 6px 10px; cursor: pointer; border-radius: 6px;" onclick="const inp=document.querySelector('.swal2-input'); inp.value = (inp.value + ' Không hành').trim()">🧅 Không hành</span>
                        <span class="badge" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; font-size: 12.5px; padding: 6px 10px; cursor: pointer; border-radius: 6px;" onclick="const inp=document.querySelector('.swal2-input'); inp.value = (inp.value + ' Không tiêu').trim()">🧂 Không tiêu</span>
                        <span class="badge" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; font-size: 12.5px; padding: 6px 10px; cursor: pointer; border-radius: 6px;" onclick="const inp=document.querySelector('.swal2-input'); inp.value = (inp.value + ' Mang về').trim()">🥡 Mang về</span>
                        <span class="badge" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; font-size: 12.5px; padding: 6px 10px; cursor: pointer; border-radius: 6px;" onclick="const inp=document.querySelector('.swal2-input'); inp.value = (inp.value + ' Làm nóng').trim()">🔥 Làm nóng</span>
                    </div>
                </div>
            `,
            input: 'text',
            inputPlaceholder: 'Gõ ghi chú chi tiết tại đây...',
            showCancelButton: true,
            confirmButtonText: '<i class="fa fa-check me-1"></i> Xác Nhận Thêm Món',
            cancelButtonText: 'Đóng',
            confirmButtonColor: '#d10024',
            cancelButtonColor: '#6c757d',
            focusConfirm: false
        });

        if (!isConfirmed) return; // Người dùng bấm Hủy
        
        await fetchWithAuth('/order-items/add', {
            method: 'POST',
            body: JSON.stringify({
                orderId: currentOrder.id,
                productId: product.id,
                quantity: 1,
                note: (note || "").trim()
            })
        });
        await loadOrderItems(currentOrder.id);

        // Toast thông báo góc màn hình
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `Đã thêm [${product.name}]`,
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true
        });
    } catch(err) {
        Swal.fire({
            icon: 'error',
            title: 'Lỗi thêm món',
            text: err.message,
            confirmButtonColor: '#d10024'
        });
    }
};

window.changeItemQty = async function(itemId, productId, delta) {
    const item = cartItems.find(it => it.id === itemId);
    if (!item) return;

    // Chặn xóa hoặc giảm món khi bếp đang nấu hoặc đã hoàn thành
    if (delta < 0 && (item.status === 'PREPARING' || item.status === 'READY')) {
        Swal.fire({
            icon: 'warning',
            title: 'Không thể xóa hoặc giảm món!',
            html: `Món <b>[${escapeHtml(item.productName || item.product?.name || 'món')}]</b> hiện đang ở trạng thái <b>${item.status === 'PREPARING' ? '🔥 Đang nấu' : '✅ Đã ra món'}</b>.<br><br>Nhà bếp đã tiếp nhận và đang chế biến, không thể xóa hoặc giảm món này!`,
            confirmButtonColor: '#d10024'
        });
        return;
    }

    // Nếu món đang nấu mà khách muốn gọi THÊM phần mới (delta > 0)
    if (delta > 0 && (item.status === 'PREPARING' || item.status === 'READY')) {
        try {
            await fetchWithAuth('/order-items/add', {
                method: 'POST',
                body: JSON.stringify({
                    orderId: currentOrder.id,
                    productId: productId,
                    quantity: delta,
                    note: item.note ? `${item.note} (gọi thêm)` : "(gọi thêm)"
                })
            });
            await loadOrderItems(currentOrder.id);
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Đã thêm phần mới cho món',
                showConfirmButton: false,
                timer: 1500
            });
        } catch(err) {
            Swal.fire({
                icon: 'error',
                title: 'Lỗi thêm món',
                text: err.message,
                confirmButtonColor: '#d10024'
            });
        }
        return;
    }

    const newQty = item.quantity + delta;
    try {
        if (newQty <= 0) {
            const res = await Swal.fire({
                title: 'Xác nhận xóa món?',
                text: `Bạn có chắc muốn hủy [${item.productName || item.product?.name || 'món'}] khỏi đơn này?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Đồng ý xóa',
                cancelButtonText: 'Giữ lại',
                confirmButtonColor: '#d10024',
                cancelButtonColor: '#6c757d'
            });

            if (!res.isConfirmed) return;

            await fetchWithAuth(`/order-items/${itemId}`, { method: 'DELETE' });
            await loadOrderItems(currentOrder.id);

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: 'Đã hủy món',
                showConfirmButton: false,
                timer: 1500
            });
            return;
        }

        // Delete & Re-add because there is no direct PUT /order-items/{id}
        await fetchWithAuth(`/order-items/${itemId}`, { method: 'DELETE' });
        await fetchWithAuth('/order-items/add', {
            method: 'POST',
            body: JSON.stringify({
                orderId: currentOrder.id,
                productId: productId,
                quantity: newQty,
                note: item.note || ""
            })
        });
        await loadOrderItems(currentOrder.id);
    } catch(err) {
        Swal.fire({
            icon: 'error',
            title: 'Lỗi cập nhật',
            text: err.message,
            confirmButtonColor: '#d10024'
        });
    }
};

async function loadOrderItems(orderId) {
    try {
        const res = await fetchWithAuth(`/order-items/order/${orderId}`);
        cartItems = res.data || [];
        updateCartUI();
        renderProducts(); // Refresh buttons state (+/-)
    } catch(err) {
        console.error("Lỗi tải order items", err);
    }
}

window.splitCartItem = async function(itemId) {
    const item = cartItems.find(it => it.id === itemId);
    if (!item || item.quantity <= 1) return;
    if (item.status === 'PREPARING' || item.status === 'READY') {
        Swal.fire({
            icon: 'warning',
            title: 'Món đang nấu!',
            text: 'Món này đang được bếp chế biến, không thể tách dòng.',
            confirmButtonColor: '#d10024'
        });
        return;
    }

    const qty = item.quantity;
    const p = item.product || productsData.find(prod => prod.id === item.productId) || {};
    const pName = p.name || item.productName || 'Món ăn';

    const confirm = await Swal.fire({
        title: '✂️ Tách Món Thành Các Dòng Riêng?',
        html: `Bạn có muốn tách món <b>[${escapeHtml(pName)}] (SL: ${qty})</b> thành <b>${qty} dòng riêng lẻ (mỗi dòng SL: 1)</b> để nhập ghi chú yêu cầu riêng cho từng phần không?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '<i class="fa fa-scissors me-1"></i> Tách ngay',
        cancelButtonText: 'Giữ nguyên',
        confirmButtonColor: '#d10024',
        cancelButtonColor: '#64748b'
    });

    if (!confirm.isConfirmed) return;

    try {
        await fetchWithAuth(`/order-items/${itemId}`, { method: 'DELETE' });

        for (let i = 1; i <= qty; i++) {
            await fetchWithAuth('/order-items/add', {
                method: 'POST',
                body: JSON.stringify({
                    orderId: currentOrder.id,
                    productId: item.productId || p.id,
                    quantity: 1,
                    note: item.note ? `${item.note} (P${i})` : ""
                })
            });
        }

        await loadOrderItems(currentOrder.id);

        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `Đã tách thành ${qty} phần riêng lẻ`,
            showConfirmButton: false,
            timer: 2000
        });
    } catch(err) {
        Swal.fire({
            icon: 'error',
            title: 'Lỗi tách món',
            text: err.message,
            confirmButtonColor: '#d10024'
        });
    }
};

window.openItemNoteModal = async function(itemId) {
    const item = cartItems.find(it => it.id === itemId);
    if (!item) return;

    const p = item.product || productsData.find(prod => prod.id === item.productId) || {};
    const pName = p.name || item.productName || 'Món ăn';
    const qty = item.quantity || 1;
    const isCooking = item.status === 'PREPARING' || item.status === 'READY';

    if (qty === 1) {
        // Ghi chú cho 1 phần
        const { value: newNote, isConfirmed } = await Swal.fire({
            title: `<span style="font-size: 22px; color: #1e293b;"><i class="fa fa-pencil-alt text-warning"></i> Ghi Chú Món Ăn</span>`,
            html: `
                <div style="text-align: left; margin: 12px 0;">
                    <div style="font-size: 17px; font-weight: bold; color: #d10024; margin-bottom: 4px;">
                        ${escapeHtml(pName)} <span class="badge bg-secondary" style="font-size:12px;">SL: 1</span>
                    </div>
                    <div style="font-size: 13px; color: #64748b; margin-bottom: 10px;">
                        Nhập yêu cầu chế biến của khách hoặc bấm chọn nhanh:
                    </div>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">
                        <span class="badge" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; font-size: 12.5px; padding: 6px 10px; cursor: pointer; border-radius: 6px;" onclick="const inp=document.querySelector('.swal2-input'); inp.value = (inp.value + ' Ít cay').trim()">🌶️ Ít cay</span>
                        <span class="badge" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; font-size: 12.5px; padding: 6px 10px; cursor: pointer; border-radius: 6px;" onclick="const inp=document.querySelector('.swal2-input'); inp.value = (inp.value + ' Không hành').trim()">🧅 Không hành</span>
                        <span class="badge" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; font-size: 12.5px; padding: 6px 10px; cursor: pointer; border-radius: 6px;" onclick="const inp=document.querySelector('.swal2-input'); inp.value = (inp.value + ' Không tiêu').trim()">🧂 Không tiêu</span>
                        <span class="badge" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; font-size: 12.5px; padding: 6px 10px; cursor: pointer; border-radius: 6px;" onclick="const inp=document.querySelector('.swal2-input'); inp.value = (inp.value + ' Mang về').trim()">🥡 Mang về</span>
                        <span class="badge" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; font-size: 12.5px; padding: 6px 10px; cursor: pointer; border-radius: 6px;" onclick="const inp=document.querySelector('.swal2-input'); inp.value = (inp.value + ' Làm nóng').trim()">🔥 Làm nóng</span>
                    </div>
                </div>
            `,
            input: 'text',
            inputValue: item.note || '',
            inputPlaceholder: 'Gõ ghi chú chi tiết...',
            showCancelButton: true,
            confirmButtonText: '<i class="fa fa-save me-1"></i> Lưu Ghi Chú',
            cancelButtonText: 'Đóng',
            confirmButtonColor: '#d10024',
            cancelButtonColor: '#64748b'
        });

        if (!isConfirmed) return;

        try {
            await fetchWithAuth(`/order-items/${itemId}`, { method: 'DELETE' });
            await fetchWithAuth('/order-items/add', {
                method: 'POST',
                body: JSON.stringify({
                    orderId: currentOrder.id,
                    productId: item.productId || p.id,
                    quantity: 1,
                    note: (newNote || '').trim()
                })
            });
            await loadOrderItems(currentOrder.id);
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Đã cập nhật ghi chú',
                showConfirmButton: false,
                timer: 1500
            });
        } catch(e) {}
        return;
    }

    // NẾU SỐ LƯỢNG > 1 (Ví dụ: SL = 3)
    let existingPortionNotes = {};
    if (item.note) {
        const parts = item.note.split('|');
        parts.forEach((part, idx) => {
            const clean = part.trim();
            const match = clean.match(/^(?:P|Phần\s*)(\d+)\s*:\s*(.*)$/i);
            if (match) {
                existingPortionNotes[parseInt(match[1], 10)] = match[2].trim();
            } else {
                existingPortionNotes[idx + 1] = clean;
            }
        });
    }

    let portionInputsHtml = '';
    for (let i = 1; i <= qty; i++) {
        const val = existingPortionNotes[i] || '';
        portionInputsHtml += `
            <div style="margin-bottom: 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
                    <label style="font-weight: 700; color: #1e293b; font-size: 13px; margin: 0;">
                        🍲 Phần ${i} / ${qty}:
                    </label>
                    <div style="display:flex; gap:4px;">
                        <button type="button" class="btn btn-default btn-xs" style="padding:1px 6px; font-size:11px;" onclick="const el=document.getElementById('portion-note-${i}'); el.value=(el.value + ' Ít cay').trim()">Ít cay</button>
                        <button type="button" class="btn btn-default btn-xs" style="padding:1px 6px; font-size:11px;" onclick="const el=document.getElementById('portion-note-${i}'); el.value=(el.value + ' Không hành').trim()">Không hành</button>
                        <button type="button" class="btn btn-default btn-xs" style="padding:1px 6px; font-size:11px;" onclick="const el=document.getElementById('portion-note-${i}'); el.value=(el.value + ' Mang về').trim()">Mang về</button>
                    </div>
                </div>
                <input id="portion-note-${i}" type="text" class="form-control" style="font-size: 13.5px; border-radius: 6px;" placeholder="Ghi chú riêng cho phần ${i} (ví dụ: nhiều ớt, không tiêu...)" value="${escapeHtml(val)}">
            </div>
        `;
    }

    const { value: formValues, isConfirmed } = await Swal.fire({
        title: `<div style="font-size: 20px; font-weight: bold; color: #1e293b;"><i class="fa fa-pencil-alt text-warning"></i> Ghi Chú Riêng Từng Phần (${qty} phần)</div>`,
        width: '560px',
        html: `
            <div style="text-align: left; font-size: 13.5px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background: #fef2f2; border: 1px solid #fecaca; padding: 8px 12px; border-radius: 8px;">
                    <div>
                        <strong style="color: #991b1b; font-size: 15px;">${escapeHtml(pName)}</strong>
                        <span class="badge" style="background: #dc2626; color: #fff; margin-left: 6px;">Số lượng: ${qty}</span>
                    </div>
                    ${!isCooking ? `
                        <button type="button" class="btn btn-sm btn-outline-dark" onclick="Swal.close(); splitCartItem(${itemId});" style="font-size: 12px; padding: 3px 8px; font-weight: 600;" title="Tách dòng thành các phần riêng biệt">
                            <i class="fa fa-scissors"></i> Tách thành ${qty} dòng riêng
                        </button>
                    ` : ''}
                </div>

                <p class="text-muted" style="margin-bottom: 8px; font-size: 12.5px;">
                    Khách có yêu cầu chế biến khác nhau cho từng phần? Hãy nhập chi tiết vào từng ô bên dưới, hệ thống sẽ tự động định dạng gửi cho Bếp & In hóa đơn:
                </p>

                <div style="max-height: 260px; overflow-y: auto; padding-right: 4px;">
                    ${portionInputsHtml}
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="fa fa-save me-1"></i> Lưu Toàn Bộ Ghi Chú',
        cancelButtonText: 'Đóng',
        confirmButtonColor: '#d10024',
        cancelButtonColor: '#64748b',
        preConfirm: () => {
            const notes = [];
            for (let i = 1; i <= qty; i++) {
                const val = (document.getElementById(`portion-note-${i}`)?.value || '').trim();
                if (val) {
                    notes.push(`P${i}: ${val}`);
                }
            }
            return notes.join(' | ');
        }
    });

    if (!isConfirmed) return;

    try {
        await fetchWithAuth(`/order-items/${itemId}`, { method: 'DELETE' });
        await fetchWithAuth('/order-items/add', {
            method: 'POST',
            body: JSON.stringify({
                orderId: currentOrder.id,
                productId: item.productId || p.id,
                quantity: qty,
                note: formValues || ''
            })
        });
        await loadOrderItems(currentOrder.id);
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Đã lưu ghi chú từng phần',
            showConfirmButton: false,
            timer: 2000
        });
    } catch(err) {
        Swal.fire({
            icon: 'error',
            title: 'Lỗi lưu ghi chú',
            text: err.message,
            confirmButtonColor: '#d10024'
        });
    }
};

/* CẬP NHẬT GIỎ HÀNG VÀ THANH BOTTOM BAR */
function updateCartUI() {
    let total = 0;
    let totalQuantity = 0;

    let drawerHtml = '';

    cartItems.forEach(item => {
        const p = item.product || productsData.find(prod => prod.id === item.productId) || {};
        let imgUrl = p.imageUrl || p.image;
        if (imgUrl) {
            if (!imgUrl.startsWith("http")) {
                imgUrl = imgUrl.startsWith("/uploads") ? imgUrl : "/uploads/" + imgUrl.split("/").pop(); 
            }
        } else {
            imgUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=60";
        }

        const price = p.price || item.unitPrice || 0;
        const sub = price * item.quantity;
        total += sub;
        totalQuantity += item.quantity;

        drawerHtml += `
            <div class="cart-item-row">
                <img src="${imgUrl}" class="cart-item-img" alt="">
                <div class="cart-item-info">
                    <div class="cart-item-name" style="display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
                        <span>${escapeHtml(p.name || item.productName || 'Món ăn')}</span>
                        ${item.status === 'PREPARING' ? `
                            <span class="badge" style="background:#ea580c; color:#fff; font-size:10px; padding:2px 6px; border-radius:4px;"><i class="fa fa-fire"></i> Đang nấu</span>
                        ` : item.status === 'READY' ? `
                            <span class="badge" style="background:#16a34a; color:#fff; font-size:10px; padding:2px 6px; border-radius:4px;"><i class="fa fa-check"></i> Đã ra món</span>
                        ` : `
                            <span class="badge" style="background:#64748b; color:#fff; font-size:10px; padding:2px 6px; border-radius:4px;"><i class="fa fa-clock-o"></i> Chờ bếp</span>
                        `}
                        <button type="button" class="btn btn-link btn-xs p-0" onclick="openItemNoteModal(${item.id})" style="font-size:11.5px; text-decoration:none; margin-left:auto; color:#d97706; display:inline-flex; align-items:center; gap:2px;" title="Ghi chú & Tách món">
                            <i class="fa fa-pencil-alt"></i> Ghi chú
                        </button>
                    </div>
                    ${item.note ? `
                        <div class="cart-item-note" onclick="openItemNoteModal(${item.id})" style="cursor:pointer;" title="Bấm để chỉnh sửa ghi chú món">
                            <i class="fa fa-comment-dots me-1"></i>${escapeHtml(item.note)}
                        </div>
                    ` : `
                        <div style="font-size:11px; color:#94a3b8; cursor:pointer; margin-top:2px;" onclick="openItemNoteModal(${item.id})" title="Thêm yêu cầu chế biến cho bếp">
                            <i class="fa fa-plus-circle me-1"></i>Thêm ghi chú...
                        </div>
                    `}
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
                        <div class="cart-item-price">${sub.toLocaleString()} ₫ <span style="color:#888; font-size:11px; font-weight:normal;">(${price.toLocaleString()} ₫/phần)</span></div>
                        ${item.quantity > 1 && item.status !== 'PREPARING' && item.status !== 'READY' ? `
                            <button type="button" class="btn btn-xs" onclick="splitCartItem(${item.id})" style="background:#f8fafc; color:#0284c7; border:1px solid #bae6fd; border-radius:4px; font-size:10.5px; padding:2px 6px; font-weight:600;" title="Tách thành ${item.quantity} dòng riêng biệt để ghi chú riêng từng phần">
                                <i class="fa fa-scissors"></i> Tách dòng (${item.quantity})
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="stepper-box">
                    ${(item.status === 'PREPARING' || item.status === 'READY') ? `
                        <button class="btn-stepper" disabled style="opacity:0.35; cursor:not-allowed;" title="Món đang nấu, không thể xóa">-</button>
                    ` : `
                        <button class="btn-stepper" onclick="changeItemQty(${item.id}, ${item.productId || p.id}, -1)">-</button>
                    `}
                    <span class="stepper-val">${item.quantity}</span>
                    <button class="btn-stepper plus" onclick="changeItemQty(${item.id}, ${item.productId || p.id}, 1)">+</button>
                </div>
            </div>
        `;
    });

    // Update Bottom Bar
    const bTotal = document.getElementById('bottom-cart-total');
    const bCount = document.getElementById('bottom-cart-count');
    const bQty = document.getElementById('bottom-cart-qty');
    if (bTotal) bTotal.innerText = total.toLocaleString() + ' ₫';
    if (bCount) bCount.innerText = totalQuantity;
    if (bQty) bQty.innerText = totalQuantity;

    // Update Drawer
    const drawerList = document.getElementById('cart-drawer-items');
    if (drawerList) {
        drawerList.innerHTML = drawerHtml || '<p class="text-center text-muted" style="margin-top: 40px;">Chưa chọn món nào vào bàn</p>';
    }

    const drawerCount = document.getElementById('drawer-item-count');
    const drawerTotal = document.getElementById('drawer-total-amount');
    if (drawerCount) drawerCount.innerText = `${cartItems.length} loại món (${totalQuantity} phần)`;
    if (drawerTotal) drawerTotal.innerText = total.toLocaleString() + ' ₫';

    // Drawer Buttons Action (Thanh toán / Mở bàn / Hủy đơn)
    const cartBtns = document.getElementById('cart-drawer-btns');
    if (cartBtns && currentOrder) {
        const roles = JSON.parse(localStorage.getItem('userRoles') || '[]');
        const canPay = roles.includes('ROLE_ADMIN') || roles.includes('ADMIN') || roles.includes('ROLE_CASHIER') || roles.includes('CASHIER');

        let reservedBtn = '';
        if (currentTable && currentTable.status === 'RESERVED') {
            reservedBtn = `<button class="btn btn-info w-100" style="padding:10px; font-weight:bold;" onclick="customerArrived(event)">
                <i class="fa fa-check me-1"></i> Khách Đã Đến (Mở Bàn)
            </button>`;
        }

        if (canPay) {
            cartBtns.innerHTML = `
                ${reservedBtn}
                <button class="btn btn-info w-100" style="background-color: #0ea5e9; border:none; padding: 11px; font-weight: bold; font-size: 14px; margin-bottom: 6px; color:#fff;" onclick="printTemporaryBill(event)">
                    <i class="fa fa-print me-1"></i> In Phiếu Tạm Tính (Khách Xem)
                </button>
                <button class="btn btn-danger w-100" style="background-color: var(--haidilao-red); padding: 12px; font-weight: bold; font-size: 15px;" onclick="payOrder(event)">
                    <i class="fa fa-arrow-circle-right me-1"></i> Thanh Toán Ngay
                </button>
                <button class="btn btn-dark w-100" style="padding: 10px; margin-top: 6px;" onclick="cancelOrder(event)">
                    <i class="fa fa-trash me-1"></i> Hủy Bàn / Hủy Đơn
                </button>
            `;
        } else {
            cartBtns.innerHTML = `
                ${reservedBtn}
                <a href="/pos-tables" class="btn btn-success w-100" style="padding: 10px;">
                    <i class="fa fa-check me-1"></i> Xong / Về Sơ đồ bàn
                </a>
            `;
        }
    }
}

/* CART DRAWER TOGGLE */
window.toggleCartDrawer = function() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-drawer-backdrop');
    if (!drawer) return;

    if (drawer.classList.contains('open')) {
        drawer.classList.remove('open');
        if (backdrop) backdrop.style.display = 'none';
    } else {
        drawer.classList.add('open');
        if (backdrop) backdrop.style.display = 'block';
    }
};

/* CHUYỂN BÀN NHANH TRÊN HEADER */
window.openTableSwitchModal = function() {
    const grid = document.getElementById('modal-tables-grid');
    if (!grid) return;

    let html = '';
    tablesData.forEach(t => {
        let isCurrent = currentTable && currentTable.id === t.id;
        let cls = t.status === 'OCCUPIED' ? 'occupied' : 'empty';
        if (isCurrent) cls += ' active';

        let tName = String(t.tableName || t.name || t.id).trim();
        let display = tName.toLowerCase().startsWith('bàn') ? tName : 'Bàn ' + tName;

        html += `
            <div class="table-switch-card ${cls}" onclick="switchActiveTable(${t.id})">
                <i class="fa ${t.status === 'OCCUPIED' ? 'fa-users' : 'fa-check'} mb-1"></i>
                <div>${escapeHtml(display)}</div>
                <small style="font-size:10px;">${t.status === 'OCCUPIED' ? 'Có khách' : 'Trống'}</small>
            </div>
        `;
    });

    grid.innerHTML = html;
    $('#tableSwitchModal').modal('show');
};

window.switchActiveTable = async function(tableId) {
    $('#tableSwitchModal').modal('hide');
    const table = tablesData.find(t => t.id === tableId);
    if (!table || (currentTable && currentTable.id === tableId)) return;

    try {
        const res = await fetchWithAuth('/orders/all');
        const orders = res.data || [];
        const activeOrder = orders.find(o => o.tableId === table.id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
        
        const oldTblName = currentTable ? (currentTable.tableName || ('Bàn ' + currentTable.id)) : '';
        const newTblName = table.tableName || ('Bàn ' + table.id);

        if (activeOrder) {
            // 1. BÀN ĐƯỢC CHỌN ĐANG CÓ KHÁCH:
            // Chuyển sang bàn đó để xem đơn và tiếp tục order
            currentTable = table;
            currentOrder = activeOrder;
            sessionStorage.setItem('posTableId', table.id);
            if (activeOrder) sessionStorage.setItem('posOrderId', activeOrder.id);
            updateTableLabel();
            await loadOrderItems(activeOrder.id);

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: `Đang phục vụ ${newTblName}`,
                showConfirmButton: false,
                timer: 1500
            });
        } else {
            // 2. BÀN ĐƯỢC CHỌN ĐANG TRỐNG:
            if (currentOrder && cartItems.length > 0) {
                // Đang có đơn hàng ở bàn hiện tại -> Cho phép lựa chọn Đổi khách hoặc Mở đơn mới
                const choice = await Swal.fire({
                    title: `🍽️ Thao tác với ${newTblName}`,
                    html: `
                        <div style="font-size:15px; color:#444; margin-bottom:12px;">
                            Bàn <b>${newTblName}</b> hiện đang trống.<br>Bạn muốn thực hiện thao tác nào?
                        </div>
                    `,
                    icon: 'question',
                    showCancelButton: true,
                    showDenyButton: true,
                    confirmButtonText: `<i class="fa fa-exchange"></i> Đổi khách từ ${oldTblName} sang`,
                    denyButtonText: `<i class="fa fa-plus-circle"></i> Mở đơn mới cho ${newTblName}`,
                    cancelButtonText: 'Đóng',
                    confirmButtonColor: '#0284c7',
                    denyButtonColor: '#16a34a',
                    cancelButtonColor: '#6c757d',
                    width: '32em'
                });

                if (choice.isConfirmed) {
                    // ĐỔI KHÁCH VÀ ĐƠN TỪ BÀN HIỆN TẠI SANG BÀN TRỐNG NÀY
                    await fetchWithAuth(`/orders/${currentOrder.id}/switch-table/${table.id}`, {
                        method: 'PUT'
                    });

                    currentTable = table;
                    sessionStorage.setItem('posTableId', table.id);
                    if (currentOrder) sessionStorage.setItem('posOrderId', currentOrder.id);
                    updateTableLabel();

                    Swal.fire({
                        icon: 'success',
                        title: 'Đổi bàn thành công! 🎉',
                        text: `Đã chuyển toàn bộ đơn hàng sang ${newTblName}!`,
                        timer: 1600,
                        showConfirmButton: false
                    });

                    // Cập nhật lại danh sách bàn
                    const tableRes = await fetchWithAuth('/tables');
                    tablesData = tableRes.data || [];
                    return;
                } else if (choice.isDenied) {
                    // MỞ BÀN MỚI CHO BÀN TRỐNG NÀY ĐỂ ORDER
                    await createNewOrderForTable(table);
                    return;
                }
            } else {
                // Bàn hiện tại chưa có đơn hoặc đơn rỗng -> Mở bàn mới ngay để chọn món
                await createNewOrderForTable(table);
            }
        }
    } catch(err) {
        Swal.fire({
            icon: 'error',
            title: 'Lỗi thao tác bàn',
            text: err.message,
            confirmButtonColor: '#d33'
        });
    }
};

async function createNewOrderForTable(table) {
    try {
        const tName = table.tableName || ('Bàn ' + table.id);

        // Hiển thị popup nhập thông tin khách hàng rõ ràng, tiện lợi
        const { value: formValues, isConfirmed } = await Swal.fire({
            title: `🍽️ Mở ${tName}`,
            html: `
                <div style="text-align: left; font-size: 14px; margin-top: 10px;">
                    <div style="margin-bottom: 12px;">
                        <label style="font-weight: bold; margin-bottom: 4px; display: block; color: #333;">Tên khách hàng:</label>
                        <input id="swalCustomerName" class="swal2-input" placeholder="Nhập tên khách (hoặc để trống = Khách vãng lai)" style="width: 100%; margin: 0; font-size: 15px; height: 40px; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label style="font-weight: bold; margin-bottom: 4px; display: block; color: #333;">Số điện thoại (tùy chọn):</label>
                        <input id="swalCustomerPhone" class="swal2-input" placeholder="Ví dụ: 0912345678" style="width: 100%; margin: 0; font-size: 15px; height: 40px; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 6px;">
                        <label style="font-weight: bold; margin-bottom: 4px; display: block; color: #333;">Tiền cọc trước nếu có (VNĐ):</label>
                        <input id="swalCustomerDeposit" type="number" class="swal2-input" placeholder="Ví dụ: 200000" min="0" style="width: 100%; margin: 0; font-size: 15px; height: 40px; box-sizing: border-box;">
                    </div>
                    <small class="text-muted" style="display:block; margin-top:6px; color:#888;">* Bỏ trống nếu là khách vãng lai hoặc không cọc.</small>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: '<i class="fa fa-check"></i> Xác nhận mở bàn',
            cancelButtonText: 'Hủy',
            confirmButtonColor: '#d10024',
            cancelButtonColor: '#6c757d',
            preConfirm: () => {
                return {
                    name: (document.getElementById('swalCustomerName').value || '').trim(),
                    phone: (document.getElementById('swalCustomerPhone').value || '').trim(),
                    deposit: (document.getElementById('swalCustomerDeposit').value || '').trim()
                };
            }
        });

        if (!isConfirmed) return;

        const customerName = formValues.name || "Khách vãng lai";
        const customerPhone = formValues.phone || ("09" + Date.now().toString().slice(-8));
        const deposit = formValues.deposit ? parseInt(formValues.deposit) : 0;

        // Check-in customer để lấy đúng ID khách hàng (không gán mặc định Trần Khánh Nam)
        let customerId = 1;
        try {
            const cusRes = await fetchWithAuth('/customers/check-in', {
                method: 'POST',
                body: JSON.stringify({ fullName: customerName, phone: customerPhone })
            });
            if (cusRes && cusRes.data) {
                customerId = cusRes.data.id;
            }
        } catch (e) {
            console.warn("Check-in customer fallback:", e);
        }

        const userId = localStorage.getItem('userId') || 1;
        const orderCode = 'ORD' + Date.now().toString().slice(-6);
        let orderNote = 'Mở bàn mới tại POS';
        if (deposit > 0) {
            orderNote += ` | Đã cọc: ${deposit.toLocaleString()} đ`;
        }

        // Chuyển trạng thái bàn sang OCCUPIED
        await fetchWithAuth(`/tables/${table.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'OCCUPIED' })
        }).catch(e => console.warn(e));

        // Tạo order mới
        const ordRes = await fetchWithAuth('/orders/add', {
            method: 'POST',
            body: JSON.stringify({
                orderCode: orderCode,
                tableId: table.id,
                customerId: customerId,
                userId: parseInt(userId),
                note: orderNote
            })
        });

        currentTable = table;
        currentOrder = ordRes.data;
        sessionStorage.setItem('posTableId', table.id);
        if (ordRes.data) sessionStorage.setItem('posOrderId', ordRes.data.id);
        updateTableLabel();
        cartItems = [];
        updateCartUI();
        renderProducts();

        // Tải lại danh sách bàn
        const tableRes = await fetchWithAuth('/tables');
        tablesData = tableRes.data || [];

        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `Đã mở ${tName} cho ${customerName}!`,
            showConfirmButton: false,
            timer: 1500
        });
    } catch (e) {
        Swal.fire({
            icon: 'error',
            title: 'Lỗi mở bàn',
            text: e.message
        });
    }
};

/* GỬI ĐƠN SANG BẾP (KITCHEN DISPATCH) */
window.sendOrderToKitchen = async function(e) {
    if (e) e.preventDefault();
    if (!currentOrder) {
        Swal.fire({ icon: 'warning', title: 'Chưa có đơn hàng', text: 'Vui lòng chọn bàn có đơn hàng trước!' });
        return;
    }
    if (cartItems.length === 0) {
        Swal.fire({ icon: 'info', title: 'Đơn trống', text: 'Chưa có món ăn nào trong đơn để gửi bếp!' });
        return;
    }

    const res = await Swal.fire({
        title: 'Gửi thực đơn xuống Bếp?',
        html: `Xác nhận gửi <b>${cartItems.length} món</b> của bàn <b>[${currentTable?.tableName || ''}]</b> xuống Bếp chế biến?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '<i class="fa fa-utensils me-1"></i> Gửi bếp ngay',
        cancelButtonText: 'Để sau',
        confirmButtonColor: '#ff9800',
        cancelButtonColor: '#6c757d'
    });

    if (!res.isConfirmed) return;

    try {
        // Cập nhật trạng thái Order thành PROCESSING để màn hình bếp nhận
        await fetchWithAuth(`/orders/${currentOrder.id}/status?status=PROCESSING`, {
            method: 'PUT'
        });
        currentOrder.status = 'PROCESSING';

        await Swal.fire({
            icon: 'success',
            title: 'Đã gửi Bếp thành công! 🍳',
            text: 'Đơn hàng đã được chuyển sang Màn hình Bếp để chế biến.',
            timer: 1600,
            showConfirmButton: false
        });

    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Lỗi gửi bếp', text: err.message });
    }
};

function printKitchenTicket(tbl, ord, items) {
    const itemsHtml = items.map((it, idx) => {
        const pName = it.productName || (it.product ? it.product.name : 'Món');
        return `
            <tr style="border-bottom: 1px dashed #444;">
                <td style="padding: 6px 4px; font-weight: bold; font-size: 15px;">${idx + 1}. ${escapeHtml(pName)}</td>
                <td style="padding: 6px 4px; text-align: center; font-size: 18px; font-weight: 900; color: #000;">x${it.quantity || 1}</td>
            </tr>
            ${it.note ? `
            <tr style="border-bottom: 1px dashed #ddd;">
                <td colspan="2" style="padding: 0 4px 6px 12px; font-size: 13px; color: #d00; font-style: italic;">
                    👉 Yêu cầu: ${escapeHtml(it.note)}
                </td>
            </tr>` : ''}
        `;
    }).join('');

    const html = `
        <html>
            <head>
                <title>Phiếu Báo Bếp - Bàn ${tbl?.tableName || tbl?.id}</title>
                <style>
                    body { font-family: monospace, 'Courier New', sans-serif; padding: 15px; width: 280px; margin: 0 auto; color: #000; }
                    .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 10px; }
                    .title { font-size: 20px; font-weight: bold; margin: 0; }
                    .table-name { font-size: 24px; font-weight: 900; margin: 5px 0; background: #000; color: #fff; padding: 4px; border-radius: 4px; }
                    .info { font-size: 13px; margin: 2px 0; text-align: left; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    .footer { text-align: center; font-size: 12px; margin-top: 15px; border-top: 2px dashed #000; padding-top: 6px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">🍳 PHIẾU BÁO BẾP</div>
                    <div class="table-name">BÀN ${tbl?.tableName || tbl?.id}</div>
                    <div class="info">Mã đơn: #${ord?.orderCode || ord?.id}</div>
                    <div class="info">Giờ gọi: ${new Date().toLocaleTimeString('vi-VN')} (${new Date().toLocaleDateString('vi-VN')})</div>
                    <div class="info">Nhân viên: ${localStorage.getItem('userEmail') || 'Phục vụ'}</div>
                </div>
                <table>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                <div class="footer">
                    * Vui lòng chế biến đúng theo yêu cầu ghi chú *
                </div>
            </body>
        </html>
    `;

    const printWin = window.open('', '', 'height=550,width=450');
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
        printWin.print();
        printWin.close();
    }, 500);
}

/* CHỨC NĂNG KHÁCH ĐÃ ĐẾN VÀ HỦY ĐƠN */
window.customerArrived = async function(e) {
    if(e) e.preventDefault();
    if(!currentTable || currentTable.status !== 'RESERVED') return;
    
    const result = await Swal.fire({
        title: 'Mở bàn đón khách?',
        text: `Xác nhận khách đã đến bàn [${currentTable.tableName || currentTable.id}] và bắt đầu phục vụ?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '<i class="fa fa-check me-1"></i> Xác nhận mở bàn',
        cancelButtonText: 'Chưa đến',
        confirmButtonColor: '#17a2b8',
        cancelButtonColor: '#6c757d'
    });

    if (!result.isConfirmed) return;
    
    try {
        await fetchWithAuth(`/tables/${currentTable.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'OCCUPIED' })
        });
        currentTable.status = 'OCCUPIED';
        
        Swal.fire({
            icon: 'success',
            title: 'Mở bàn thành công!',
            text: `Bàn [${currentTable.tableName || currentTable.id}] đã chuyển sang Đang phục vụ.`,
            confirmButtonColor: '#d10024'
        });
        updateCartUI();
    } catch(err) {
        Swal.fire({
            icon: 'error',
            title: 'Lỗi cập nhật',
            text: err.message,
            confirmButtonColor: '#d10024'
        });
    }
};

window.cancelOrder = async function(e) {
    if(e) e.preventDefault();
    if(!currentOrder) return;
    
    const roles = JSON.parse(localStorage.getItem('userRoles') || '[]');
    const canPay = roles.includes('ROLE_ADMIN') || roles.includes('ADMIN') || roles.includes('ROLE_CASHIER') || roles.includes('CASHIER');
    if(!canPay) {
        Swal.fire({
            icon: 'error',
            title: 'Từ chối quyền hạn',
            text: 'Chỉ Thu ngân hoặc Quản lý mới có quyền hủy bàn!',
            confirmButtonColor: '#d10024'
        });
        return;
    }
    
    const result = await Swal.fire({
        title: 'CẢNH BÁO: HỦY BÀN / ĐƠN?',
        html: `Thao tác này sẽ <b>HỦY TOÀN BỘ ĐƠN HÀNG</b> và chuyển bàn <b>[${currentTable?.tableName || ''}]</b> về trạng thái <b>BÀN TRỐNG</b>.<br><br>Hành động này không thể hoàn tác!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Đồng ý hủy bàn',
        cancelButtonText: 'Quay lại',
        confirmButtonColor: '#d10024',
        cancelButtonColor: '#6c757d'
    });

    if (!result.isConfirmed) return;
    
    try {
        await fetchWithAuth(`/orders/${currentOrder.id}/status?status=CANCELLED`, { method: 'PUT' });
        await fetchWithAuth(`/tables/${currentTable.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'AVAILABLE' })
        });

        await Swal.fire({
            icon: 'success',
            title: 'Đã hủy đơn thành công',
            text: 'Bàn đã được chuyển về trạng thái bàn trống.',
            confirmButtonColor: '#d10024',
            timer: 1800
        });
        window.location.href = "/pos-tables.html";
    } catch(err) {
        Swal.fire({
            icon: 'error',
            title: 'Lỗi khi hủy đơn',
            text: err.message,
            confirmButtonColor: '#d10024'
        });
    }
};

// Biến toàn cục quản lý chiết khấu / giảm giá khi thanh toán
window.checkoutSubtotal = 0;
window.checkoutDepositAmount = 0;
window.checkoutDiscountType = 'PERCENT'; // 'PERCENT' hoặc 'AMOUNT'
window.checkoutDiscountPercent = 0;
window.checkoutDiscountCash = 0;

window.setDiscountType = function(type) {
    window.checkoutDiscountType = type;
    const btnPercent = document.getElementById('btnDiscountTypePercent');
    const btnAmount = document.getElementById('btnDiscountTypeAmount');
    const unitLabel = document.getElementById('discountUnitLabel');
    const quickPercentPills = document.getElementById('quickDiscountPills');
    const quickAmountPills = document.getElementById('quickDiscountAmountPills');
    const input = document.getElementById('checkoutDiscountInput');

    if (type === 'PERCENT') {
        if (btnPercent) { btnPercent.className = 'btn btn-danger btn-xs'; }
        if (btnAmount) { btnAmount.className = 'btn btn-default btn-xs'; }
        if (unitLabel) unitLabel.innerText = '%';
        if (quickPercentPills) quickPercentPills.style.display = 'flex';
        if (quickAmountPills) quickAmountPills.style.display = 'none';
        if (input) {
            input.value = window.checkoutDiscountPercent || 0;
            input.placeholder = 'Nhập số % giảm...';
        }
    } else {
        if (btnPercent) { btnPercent.className = 'btn btn-default btn-xs'; }
        if (btnAmount) { btnAmount.className = 'btn btn-danger btn-xs'; }
        if (unitLabel) unitLabel.innerText = '₫';
        if (quickPercentPills) quickPercentPills.style.display = 'none';
        if (quickAmountPills) quickAmountPills.style.display = 'flex';
        if (input) {
            input.value = window.checkoutDiscountCash || 0;
            input.placeholder = 'Nhập số tiền VNĐ giảm...';
        }
    }
    recalculateCheckoutTotal();
};

window.applyQuickDiscountPercent = function(val) {
    window.setDiscountType('PERCENT');
    const input = document.getElementById('checkoutDiscountInput');
    if (input) input.value = val;
    recalculateCheckoutTotal();
};

window.applyQuickDiscountAmount = function(val) {
    window.setDiscountType('AMOUNT');
    const input = document.getElementById('checkoutDiscountInput');
    if (input) input.value = val;
    recalculateCheckoutTotal();
};

window.recalculateCheckoutTotal = function() {
    const input = document.getElementById('checkoutDiscountInput');
    const inputVal = parseFloat(input?.value) || 0;

    let discountMoney = 0;
    if (window.checkoutDiscountType === 'PERCENT') {
        const percent = Math.min(100, Math.max(0, inputVal));
        window.checkoutDiscountPercent = percent;
        discountMoney = Math.round(window.checkoutSubtotal * percent / 100);
    } else {
        const cash = Math.min(window.checkoutSubtotal, Math.max(0, inputVal));
        window.checkoutDiscountCash = cash;
        discountMoney = cash;
    }

    // Hiển thị ghi chú số tiền giảm quy đổi
    const notice = document.getElementById('discountConvertedNotice');
    if (notice) {
        if (discountMoney > 0) {
            notice.style.display = 'block';
            notice.innerText = `Số tiền giảm: -${discountMoney.toLocaleString()} ₫`;
        } else {
            notice.style.display = 'none';
        }
    }

    // Cập nhật các dòng tổng kết
    const subtotalEl = document.getElementById('checkoutSubtotalDisplay');
    if (subtotalEl) subtotalEl.innerText = `${window.checkoutSubtotal.toLocaleString()} ₫`;

    const discountRow = document.getElementById('checkoutDiscountRow');
    const discountDisplay = document.getElementById('checkoutDiscountDisplay');
    if (discountRow && discountDisplay) {
        if (discountMoney > 0) {
            discountRow.style.display = 'flex';
            const percentLabel = window.checkoutDiscountType === 'PERCENT' ? ` (${window.checkoutDiscountPercent}%)` : '';
            discountDisplay.innerText = `-${discountMoney.toLocaleString()} ₫${percentLabel}`;
        } else {
            discountRow.style.display = 'none';
        }
    }

    const depositRow = document.getElementById('checkoutDepositRow');
    const depositDisplay = document.getElementById('checkoutDepositDisplay');
    if (depositRow && depositDisplay) {
        if (window.checkoutDepositAmount > 0) {
            depositRow.style.display = 'flex';
            depositDisplay.innerText = `-${window.checkoutDepositAmount.toLocaleString()} ₫`;
        } else {
            depositRow.style.display = 'none';
        }
    }

    let finalTotal = window.checkoutSubtotal - discountMoney - window.checkoutDepositAmount;
    if (finalTotal < 0) finalTotal = 0;

    const totalEl = document.getElementById('checkoutTotal');
    if (totalEl) totalEl.innerText = `THỰC THU: ${finalTotal.toLocaleString()} VNĐ`;
};

/* THANH TOÁN TIỆN LỢI */
window.payOrder = function(e) {
    if(e) e.preventDefault();
    if(!currentOrder) return;
    
    const roles = JSON.parse(localStorage.getItem('userRoles') || '[]');
    const canPay = roles.includes('ROLE_ADMIN') || roles.includes('ADMIN') || roles.includes('ROLE_CASHIER') || roles.includes('CASHIER');
    if(!canPay) {
        Swal.fire({
            icon: 'warning',
            title: 'Chỉ Thu ngân được thanh toán',
            text: 'Nhân viên chỉ có quyền chọn món. Vui lòng gọi Thu ngân để tính tiền!',
            confirmButtonColor: '#d10024'
        });
        return;
    }
    
    // Đóng drawer nếu đang mở
    const drawer = document.getElementById('cart-drawer');
    if (drawer && drawer.classList.contains('open')) {
        window.toggleCartDrawer();
    }

    // Modal Info
    document.getElementById('checkoutTableLabel').innerText = `Bàn: ${currentTable.tableName || currentTable.id}`;
    document.getElementById('checkoutCustomerName').innerText = currentOrder.customerName || 'Khách vãng lai';
    document.getElementById('checkoutUserName').innerText = currentOrder.username || 'Nhân viên thu ngân';
    
    let html = '';
    let total = 0;
    cartItems.forEach(item => {
        const p = item.product || productsData.find(prod => prod.id === item.productId) || {};
        const price = p.price || item.unitPrice || 0;
        total += price * item.quantity;
        html += `<div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:14px;">
                    <span>${item.quantity}x ${escapeHtml(p.name || item.productName || 'Món ăn')}</span>
                    <span>${(price * item.quantity).toLocaleString()} ₫</span>
                 </div>`;
    });
    
    // Lưu subtotal
    window.checkoutSubtotal = total;

    // Tiền cọc trước nếu có
    window.checkoutDepositAmount = 0;
    if (currentOrder.note && currentOrder.note.includes('Đã cọc:')) {
        const match = currentOrder.note.match(/Đã cọc:\s*(\d+)/);
        if (match && match[1]) {
            window.checkoutDepositAmount = parseInt(match[1]);
        }
    }
    
    // Đặt lại giảm giá mặc định về 0%
    window.checkoutDiscountPercent = 0;
    window.checkoutDiscountCash = 0;
    const input = document.getElementById('checkoutDiscountInput');
    if (input) input.value = 0;
    window.setDiscountType('PERCENT');

    document.getElementById('checkoutSummary').innerHTML = html || '<p class="text-muted text-center">Chưa có món nào</p>';
    recalculateCheckoutTotal();
    
    $('#checkoutModal').modal('show');
};

window.confirmCheckout = async function() {
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    try {
        let discountPercentToSend = 0;
        let discountAmountToSend = window.checkoutDepositAmount || 0;

        if (window.checkoutDiscountType === 'PERCENT') {
            discountPercentToSend = window.checkoutDiscountPercent || 0;
            // Tiền giảm trực tiếp (gồm tiền cọc trước nếu có)
            discountAmountToSend = window.checkoutDepositAmount || 0;
        } else {
            discountPercentToSend = 0;
            discountAmountToSend = (window.checkoutDiscountCash || 0) + (window.checkoutDepositAmount || 0);
        }

        const cashierName = getCashierDisplayName();
        const orderSnapshot = currentOrder ? { ...currentOrder } : null;
        const tableSnapshot = currentTable ? { ...currentTable } : null;
        const cartSnapshot = [...cartItems];

        // 1. Tạo Invoice cho Order này với thông tin giảm giá
        const invRes = await fetchWithAuth(`/invoices/add`, {
            method: 'POST',
            body: JSON.stringify({
                orderId: currentOrder.id,
                discountPercent: discountPercentToSend,
                discountAmount: discountAmountToSend,
                cashierName: cashierName
            })
        });
        const invoiceId = invRes.data.id;
        
        // 2. Tạo Payment tương ứng
        const payRes = await fetchWithAuth(`/payments`, {
            method: 'POST',
            body: JSON.stringify({
                invoiceId: invoiceId,
                paymentMethod: paymentMethod,
                transactionCode: 'TXN' + Date.now().toString().slice(-8)
            })
        });
        const paymentId = payRes.data.id;
        
        // 3. Cập nhật Payment thành SUCCESS
        await fetchWithAuth(`/payments/${paymentId}/status?status=SUCCESS`, {
            method: 'PUT'
        });
        
        // 4. Lấy lại thông tin Invoice hoàn chỉnh để in
        const invDetails = await fetchWithAuth(`/invoices/${invoiceId}`);
        const inv = invDetails.data;
        
        $('#checkoutModal').modal('hide');
        sessionStorage.removeItem('posOrderId');
        sessionStorage.removeItem('posTableId');
        currentOrder = null;
        currentTable = null;
        cartItems = [];
        
        await Swal.fire({
            icon: 'success',
            title: '<span style="font-size: 26px; color: #28a745; font-weight: bold;">🎉 Thanh Toán Thành Công!</span>',
            html: `
                <div style="font-size: 16px; color: #444; margin-top: 10px;">
                    Đã thanh toán xong hóa đơn <b>#${inv.invoiceCode || inv.id}</b>.<br>
                    Đang tự động chuẩn bị in hóa đơn cho khách...
                </div>
            `,
            timer: 1000,
            showConfirmButton: false
        });
        
        printInvoice(inv, orderSnapshot, tableSnapshot, cartSnapshot);
        
        // Đồng bộ ngay lập tức số tiền mặt thực tế trong két nếu đơn thanh toán bằng tiền mặt
        syncCurrentCashierDrawerCash();
    } catch(err) {
        Swal.fire({
            icon: 'error',
            title: 'Lỗi thanh toán',
            text: err.message,
            confirmButtonColor: '#d10024'
        });
    }
};

function formatReceiptDateTime(rawDate, fallbackDate = null) {
    if (!rawDate) {
        return fallbackDate ? formatReceiptDateTime(fallbackDate) : new Date().toLocaleString('vi-VN');
    }
    if (Array.isArray(rawDate)) {
        const y = rawDate[0];
        const m = (rawDate[1] || 1) - 1;
        const d = rawDate[2] || 1;
        const h = rawDate[3] || 0;
        const min = rawDate[4] || 0;
        const s = rawDate[5] || 0;
        const dt = new Date(y, m, d, h, min, s);
        return isNaN(dt.getTime()) ? new Date().toLocaleString('vi-VN') : dt.toLocaleString('vi-VN');
    }
    const dt = new Date(rawDate);
    if (isNaN(dt.getTime())) {
        return fallbackDate ? formatReceiptDateTime(fallbackDate) : new Date().toLocaleString('vi-VN');
    }
    return dt.toLocaleString('vi-VN');
}

function printInvoice(inv, orderSnapshot, tableSnapshot, cartSnapshot) {
    const rawItems = (inv.items && inv.items.length > 0) ? inv.items : (inv.invoiceItems || cartSnapshot || []);
    let itemsHtml = rawItems.map((it, i) => {
        const pName = it.productName || (it.product ? it.product.name : 'Món');
        const price = it.unitPrice || it.price || 0;
        const qty = it.quantity || 1;
        const total = it.totalPrice || it.subtotal || (price * qty);
        return `
            <tr style="border-bottom: 1px dashed #ccc;">
                <td style="padding: 6px 2px; text-align: left;">
                    <strong>${i + 1}. ${escapeHtml(pName)}</strong>
                    ${it.note ? `<br><small style="color:#d00; font-style:italic;">👉 ${escapeHtml(it.note)}</small>` : ''}
                </td>
                <td style="padding: 6px 2px; text-align: center; font-weight: bold;">${qty}</td>
                <td style="padding: 6px 2px; text-align: right;">${price.toLocaleString()}</td>
                <td style="padding: 6px 2px; text-align: right; font-weight: bold;">${total.toLocaleString()}</td>
            </tr>
        `;
    }).join('');

    const tblName = inv.tableName || (tableSnapshot?.tableName) || (orderSnapshot ? ('Bàn ' + (orderSnapshot.tableId || '')) : 'Bàn');
    const orderCode = inv.orderCode || orderSnapshot?.orderCode || (inv.orderId ? ('ORD' + inv.orderId) : '-');
    const invoiceCode = inv.invoiceCode || inv.id;
    const displayInvCode = invoiceCode ? (String(invoiceCode).startsWith('#') ? invoiceCode : ('#' + invoiceCode)) : '';
    const displayOrdCode = (orderCode && orderCode !== '-') ? (String(orderCode).startsWith('#') ? orderCode : ('#' + orderCode)) : '';
    const customerName = inv.customerName || orderSnapshot?.customerName || 'Khách vãng lai';
    const orderStaffName = inv.orderStaffName || orderSnapshot?.username || orderSnapshot?.userName || 'Nhân viên order';
    const cashierName = getCashierDisplayName(inv.cashierName);
    const timeInRaw = (orderSnapshot && (orderSnapshot.createdAt || orderSnapshot.orderDate)) || inv.createdAt || inv.issuedAt;
    const timeInStr = formatReceiptDateTime(timeInRaw, inv.issuedAt || new Date());
    const payTimeStr = formatReceiptDateTime(inv.paidAt || inv.issuedAt || inv.createdAt, new Date());

    let depositAmount = 0;
    if (orderSnapshot && orderSnapshot.note && orderSnapshot.note.includes('Đã cọc:')) {
        const match = orderSnapshot.note.match(/Đã cọc:\s*(\d+)/);
        if (match && match[1]) {
            depositAmount = parseInt(match[1]);
        }
    }

    const subtotal = inv.subtotal || 0;
    const discountAmount = inv.discountAmount || 0;
    const discountPercent = inv.discountPercent || 0;
    const finalTotal = inv.finalAmount || inv.totalAmount || (subtotal - discountAmount);

    let discountLabel = 'Giảm giá';
    if (discountPercent > 0) discountLabel += ` (${discountPercent}%)`;
    discountLabel += ':';

    const html = `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <title>Hóa Đơn #${invoiceCode} - ${tblName}</title>
                <style>
                    @page { margin: 0; size: auto; }
                    body {
                        font-family: 'Courier New', Courier, monospace, sans-serif;
                        padding: 15px;
                        width: 320px;
                        margin: 0 auto;
                        color: #000;
                        font-size: 13px;
                        line-height: 1.35;
                        background: #fff;
                    }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .text-left { text-align: left; }
                    .header { text-align: center; margin-bottom: 8px; }
                    .brand-name { font-size: 18px; font-weight: 900; margin: 0; text-transform: uppercase; }
                    .brand-sub { font-size: 11px; margin: 3px 0 6px 0; color: #222; }
                    .title-box {
                        border-top: 1px dashed #000;
                        border-bottom: 1px dashed #000;
                        padding: 6px 0;
                        margin: 6px 0;
                    }
                    .bill-title { font-size: 17px; font-weight: 900; letter-spacing: 1px; margin: 0; }
                    .bill-notice { font-size: 11px; font-style: italic; color: #333; margin: 2px 0 0 0; }
                    .meta-info { margin: 8px 0; font-size: 12px; text-align: left; }
                    .meta-info p { margin: 3px 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
                    th { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 2px; }
                    td { padding: 4px 2px; }
                    .total-box { margin-top: 8px; border-top: 1px dashed #000; padding-top: 6px; }
                    .total-row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 13px; }
                    .grand-total { font-size: 16px; font-weight: 900; border-top: 1px solid #000; padding-top: 6px; margin-top: 6px; }
                    .footer { text-align: center; margin-top: 12px; border-top: 1px dashed #000; padding-top: 8px; font-size: 11px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="brand-name">🍽️ NHÀ HÀNG THANH HÓA</div>
                    <div class="brand-sub">Đ/c: TP. Thanh Hóa • Hotline: 0988888888</div>
                    <div class="title-box">
                        <div class="bill-title">HÓA ĐƠN THANH TOÁN</div>
                        <div class="bill-notice">(Quý khách vui lòng kiểm tra lại hóa đơn)</div>
                    </div>
                </div>

                <div class="meta-info">
                    <p><strong>Bàn:</strong> <span style="font-size: 15px; font-weight: 900;">${tblName}</span></p>
                    ${displayInvCode ? `<p style="margin: 2px 0; font-weight: bold;">${displayInvCode}</p>` : ''}
                    ${displayOrdCode ? `<p style="margin: 2px 0; font-weight: bold;">${displayOrdCode}</p>` : ''}
                    <p><strong>Khách hàng:</strong> ${customerName}</p>
                    <p><strong>Nhân viên order:</strong> ${orderStaffName}</p>
                    <p><strong>Thu ngân:</strong> ${cashierName}</p>
                    <p><strong>Thời gian vào:</strong> ${timeInStr}</p>
                    <p><strong>Thời gian ra:</strong> ${payTimeStr}</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th class="text-left">Tên món</th>
                            <th class="text-center" style="width: 28px;">SL</th>
                            <th class="text-right" style="width: 65px;">Đơn giá</th>
                            <th class="text-right" style="width: 70px;">T.Tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div class="total-box">
                    <div class="total-row">
                        <span>Tổng tiền món:</span>
                        <span>${subtotal.toLocaleString()} ₫</span>
                    </div>
                    ${discountAmount > 0 ? `
                    <div class="total-row">
                        <span>${discountLabel}</span>
                        <span>- ${discountAmount.toLocaleString()} ₫</span>
                    </div>` : ''}
                    ${depositAmount > 0 ? `
                    <div class="total-row">
                        <span>Đã cọc trước:</span>
                        <span>- ${depositAmount.toLocaleString()} ₫</span>
                    </div>` : ''}
                    <div class="total-row grand-total">
                        <span>THỰC THU:</span>
                        <span>${finalTotal.toLocaleString()} ₫</span>
                    </div>
                </div>

                <!-- MÃ QR THANH TOÁN CỦA CHỦ QUÁN -->
                <div class="qr-box" style="text-align: center; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #000;">
                    <div style="font-size: 11px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 3px;">
                        📱 Quét Mã QR Thanh Toán (VietQR)
                    </div>
                    <div style="font-size: 11px; margin-bottom: 5px;">
                        Ngân hàng: <strong>MBBank</strong> • STK: <strong>0329170061</strong><br>
                        Chủ TK: <strong>BUI DINH TRUONG</strong>
                    </div>
                    <div style="display: inline-block; padding: 4px; background: #fff; border: 1px solid #ccc; border-radius: 4px;">
                        <img src="https://img.vietqr.io/image/MB-0329170061-compact2.png?amount=${finalTotal}&addInfo=${encodeURIComponent('TT ' + tblName + ' HD ' + invoiceCode)}&accountName=BUI%20DINH%20TRUONG" 
                             alt="QR Thanh Toán Chủ Quán" 
                             style="width: 140px; height: 140px; display: block; margin: 0 auto;"
                             onerror="this.onerror=null; this.src='https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=https%3A%2F%2Fimg.vietqr.io%2Fimage%2FMB-0329170061-compact2.png%3Famount%3D${finalTotal}%26accountName%3DBUI%2520DINH%2520TRUONG';" />
                    </div>
                    <div style="font-size: 10px; color: #555; margin-top: 3px; font-style: italic;">
                        (Hỗ trợ mọi App Ngân hàng & Ví MoMo, ZaloPay)
                    </div>
                </div>

                <div class="footer">
                    <p style="margin: 3px 0; font-weight: bold; font-size: 12px;">*** ĐÃ THANH TOÁN ***</p>
                    <p style="margin: 2px 0;">Phương thức TT: <strong>${inv.paymentMethod || 'Tiền mặt'}</strong></p>
                    <p style="margin: 3px 0;">Xin Quý khách kiểm tra kỹ danh sách món ăn & số tiền.</p>
                    <p style="margin: 2px 0; font-weight: bold;">Cảm ơn Quý khách & Hẹn gặp lại!</p>
                </div>
            </body>
        </html>
    `;

    const printWindow = window.open('', '', 'height=680,width=420');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
            window.location.href = "/pos-tables.html";
        }, 500);
    } else {
        alert("Vui lòng cho phép popup để in hóa đơn thanh toán!");
        window.location.href = "/pos-tables.html";
    }
}

/* IN PHIẾU TẠM TÍNH (CHO THU NGÂN KHI KHÁCH MUỐN XEM LẠI TIỀN TRƯỚC KHI THANH TOÁN) */
window.printTemporaryBill = function(e) {
    if (e) e.preventDefault();

    if (!currentOrder) {
        Swal.fire({
            icon: 'warning',
            title: 'Chưa có đơn hàng',
            text: 'Vui lòng chọn bàn có đơn hàng đang phục vụ để in phiếu tạm tính!',
            confirmButtonColor: '#0ea5e9'
        });
        return;
    }

    if (!cartItems || cartItems.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Bàn chưa có món',
            text: 'Bàn này chưa có món ăn nào để in phiếu tạm tính!',
            confirmButtonColor: '#0ea5e9'
        });
        return;
    }

    const roles = JSON.parse(localStorage.getItem('userRoles') || '[]');
    const canPrint = roles.includes('ROLE_ADMIN') || roles.includes('ADMIN') || roles.includes('ROLE_CASHIER') || roles.includes('CASHIER') || roles.includes('ROLE_STAFF') || roles.includes('STAFF');
    if (!canPrint) {
        Swal.fire({
            icon: 'error',
            title: 'Từ chối quyền hạn',
            text: 'Chỉ Thu ngân hoặc Quản lý mới được in phiếu tạm tính!',
            confirmButtonColor: '#d10024'
        });
        return;
    }

    const tblName = currentTable?.tableName || ('Bàn ' + (currentOrder.tableId || ''));
    const cashierName = localStorage.getItem('userFullName') || localStorage.getItem('userName') || localStorage.getItem('userEmail') || currentOrder.username || 'Administrator';
    const orderStaffName = currentOrder.username || currentOrder.userName || 'Nhân viên order';
    const orderCode = currentOrder.orderCode || currentOrder.id;
    const displayOrdCode = orderCode ? (String(orderCode).startsWith('#') ? orderCode : ('#' + orderCode)) : '';
    const customerName = currentOrder.customerName || 'Khách vãng lai';

    let total = 0;
    const itemsHtml = cartItems.map((item, idx) => {
        const p = item.product || productsData.find(prod => prod.id === item.productId) || {};
        const pName = p.name || item.productName || 'Món ăn';
        const price = p.price || item.unitPrice || 0;
        const qty = item.quantity || 1;
        const sub = price * qty;
        total += sub;

        return `
            <tr style="border-bottom: 1px dashed #ccc;">
                <td style="padding: 6px 2px; text-align: left;">
                    <strong>${idx + 1}. ${escapeHtml(pName)}</strong>
                    ${item.note ? `<br><small style="color:#d00; font-style:italic;">👉 ${escapeHtml(item.note)}</small>` : ''}
                </td>
                <td style="padding: 6px 2px; text-align: center; font-weight: bold;">${qty}</td>
                <td style="padding: 6px 2px; text-align: right;">${price.toLocaleString()}</td>
                <td style="padding: 6px 2px; text-align: right; font-weight: bold;">${sub.toLocaleString()}</td>
            </tr>
        `;
    }).join('');

    let depositAmount = 0;
    if (currentOrder.note && currentOrder.note.includes('Đã cọc:')) {
        const match = currentOrder.note.match(/Đã cọc:\s*(\d+)/);
        if (match && match[1]) {
            depositAmount = parseInt(match[1]);
        }
    }

    let discountDeduction = 0;
    let discountLabel = '';
    if (window.checkoutDiscountType === 'PERCENT' && window.checkoutDiscountPercent > 0) {
        discountDeduction = Math.round(total * (window.checkoutDiscountPercent / 100));
        discountLabel = `Giảm giá (${window.checkoutDiscountPercent}%):`;
    } else if (window.checkoutDiscountType === 'AMOUNT' && window.checkoutDiscountCash > 0) {
        discountDeduction = window.checkoutDiscountCash;
        discountLabel = 'Giảm giá (tiền mặt):';
    }

    let finalTotal = total - discountDeduction - depositAmount;
    if (finalTotal < 0) finalTotal = 0;

    const printTimeStr = new Date().toLocaleString('vi-VN');
    const timeInRaw = (currentOrder && (currentOrder.createdAt || currentOrder.orderDate));
    const timeInStr = timeInRaw ? new Date(timeInRaw).toLocaleString('vi-VN') : printTimeStr;

    const html = `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <title>Phiếu Tạm Tính - ${tblName}</title>
                <style>
                    @page { margin: 0; size: auto; }
                    body {
                        font-family: 'Courier New', Courier, monospace, sans-serif;
                        padding: 15px;
                        width: 300px;
                        margin: 0 auto;
                        color: #000;
                        font-size: 13px;
                        line-height: 1.35;
                    }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .text-left { text-align: left; }
                    .header { text-align: center; margin-bottom: 10px; }
                    .brand-name { font-size: 18px; font-weight: 900; margin: 0; text-transform: uppercase; }
                    .brand-sub { font-size: 11px; margin: 2px 0 6px 0; }
                    .title-box {
                        border-top: 1px dashed #000;
                        border-bottom: 1px dashed #000;
                        padding: 6px 0;
                        margin: 6px 0;
                    }
                    .bill-title { font-size: 17px; font-weight: 900; letter-spacing: 1px; margin: 0; }
                    .bill-notice { font-size: 11px; font-style: italic; color: #333; margin: 2px 0 0 0; }
                    .meta-info { margin: 6px 0; font-size: 12px; text-align: left; }
                    .meta-info p { margin: 2px 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
                    th { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 2px; }
                    .total-box { margin-top: 10px; border-top: 1px dashed #000; padding-top: 6px; }
                    .total-row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 13px; }
                    .grand-total { font-size: 16px; font-weight: 900; border-top: 1px solid #000; padding-top: 6px; margin-top: 6px; }
                    .footer { text-align: center; margin-top: 14px; border-top: 1px dashed #000; padding-top: 8px; font-size: 11px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="brand-name">🍽️ NHÀ HÀNG THANH HÓA</div>
                    <div class="brand-sub">Đ/c: TP. Thanh Hóa • Hotline: 0988888888</div>
                    <div class="title-box">
                        <div class="bill-title">PHIẾU TẠM TÍNH</div>
                        <div class="bill-notice">(Quý khách vui lòng kiểm tra món trước khi thanh toán)</div>
                    </div>
                </div>

                <div class="meta-info">
                    <p><strong>Bàn:</strong> <span style="font-size: 15px; font-weight: 900;">${tblName}</span></p>
                    ${displayOrdCode ? `<p style="margin: 2px 0; font-weight: bold;">${displayOrdCode}</p>` : ''}
                    <p><strong>Khách hàng:</strong> ${customerName}</p>
                    <p><strong>Nhân viên order:</strong> ${orderStaffName}</p>
                    <p><strong>Thu ngân:</strong> ${cashierName}</p>
                    <p><strong>Thời gian vào:</strong> ${timeInStr}</p>
                    <p><strong>Giờ in tạm tính:</strong> ${printTimeStr}</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th class="text-left">Tên món</th>
                            <th class="text-center" style="width: 28px;">SL</th>
                            <th class="text-right" style="width: 60px;">Đơn giá</th>
                            <th class="text-right" style="width: 65px;">T.Tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div class="total-box">
                    <div class="total-row">
                        <span>Tổng tiền món:</span>
                        <span>${total.toLocaleString()} ₫</span>
                    </div>
                    ${discountDeduction > 0 ? `
                    <div class="total-row" style="color: #000;">
                        <span>${discountLabel}</span>
                        <span>- ${discountDeduction.toLocaleString()} ₫</span>
                    </div>` : ''}
                    ${depositAmount > 0 ? `
                    <div class="total-row" style="color: #000;">
                        <span>Đã cọc trước:</span>
                        <span>- ${depositAmount.toLocaleString()} ₫</span>
                    </div>` : ''}
                    <div class="total-row grand-total">
                        <span>TỔNG TẠM TÍNH:</span>
                        <span>${finalTotal.toLocaleString()} ₫</span>
                    </div>
                </div>

                <!-- MÃ QR THANH TOÁN CỦA CHỦ QUÁN -->
                <div class="qr-box" style="text-align: center; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #000;">
                    <div style="font-size: 11px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 3px;">
                        📱 Quét Mã QR Thanh Toán (VietQR)
                    </div>
                    <div style="font-size: 11px; margin-bottom: 5px;">
                        Ngân hàng: <strong>MBBank</strong> • STK: <strong>0329170061</strong><br>
                        Chủ TK: <strong>BUI DINH TRUONG</strong>
                    </div>
                    <div style="display: inline-block; padding: 4px; background: #fff; border: 1px solid #ccc; border-radius: 4px;">
                        <img src="https://img.vietqr.io/image/MB-0329170061-compact2.png?amount=${finalTotal}&addInfo=${encodeURIComponent('TT ' + tblName + ' ORD ' + orderCode)}&accountName=BUI%20DINH%20TRUONG" 
                             alt="QR Thanh Toán Chủ Quán" 
                             style="width: 140px; height: 140px; display: block; margin: 0 auto;"
                             onerror="this.onerror=null; this.src='https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=https%3A%2F%2Fimg.vietqr.io%2Fimage%2FMB-0329170061-compact2.png%3Famount%3D${finalTotal}%26accountName%3DBUI%2520DINH%2520TRUONG';" />
                    </div>
                    <div style="font-size: 10px; color: #555; margin-top: 3px; font-style: italic;">
                        (Hỗ trợ mọi App Ngân hàng & Ví MoMo, ZaloPay)
                    </div>
                </div>

                <div class="footer">
                    <p style="margin: 3px 0; font-weight: bold;">*** CHƯA THANH TOÁN ***</p>
                    <p style="margin: 3px 0;">Xin Quý khách kiểm tra kỹ danh sách món ăn & số tiền.</p>
                    <p style="margin: 3px 0;">Cảm ơn Quý khách & Hẹn gặp lại!</p>
                </div>
            </body>
        </html>
    `;

    const printWin = window.open('', '', 'height=650,width=400');
    if (printWin) {
        printWin.document.write(html);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
            printWin.print();
            printWin.close();
        }, 500);

        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'info',
            title: `Đã xuất phiếu tạm tính cho ${tblName}!`,
            showConfirmButton: false,
            timer: 2000
        });
    } else {
        alert("Vui lòng cho phép trình duyệt mở popup để in phiếu tạm tính!");
    }
};

/* XEM CÁC CA ĐẶT SAU CỦA BÀN HIỆN TẠI (DÀNH CHO CASHIER & ADMIN) */
window.viewCurrentTableFutureReservations = async function() {
    if (!currentTable) return;
    const roles = JSON.parse(localStorage.getItem('userRoles') || '[]');
    const singleRole = localStorage.getItem('role') || localStorage.getItem('userRole') || '';
    const allRoles = [...roles, singleRole];
    const isCashierOrAdmin = allRoles.some(r => typeof r === 'string' && (r.toUpperCase().includes('ADMIN') || r.toUpperCase().includes('CASHIER')));
    if (!isCashierOrAdmin) {
        Swal.fire({
            icon: 'warning',
            title: 'Giới hạn quyền hạn',
            text: 'Chỉ Thu ngân hoặc Quản trị viên mới có quyền xem thông tin chi tiết các ca đặt trước!',
            confirmButtonColor: '#ff9800'
        });
        return;
    }

    try {
        const res = await fetchWithAuth('/reservations/all');
        const allRes = res.data || [];
        const tableResList = allRes.filter(r => r.tableId === currentTable.id && r.status !== 'CANCELLED' && r.status !== 'COMPLETED');

        const cleanTblName = String(currentTable.tableName || currentTable.id || '').trim().replace(/^Bàn\s+/i, '');
        const tblName = 'Bàn ' + cleanTblName;

        if (tableResList.length === 0) {
            Swal.fire({
                icon: 'info',
                title: `${tblName}`,
                text: 'Hiện không có ca đặt trước tiếp theo nào cho bàn này!',
                confirmButtonColor: '#0284c7'
            });
            return;
        }

        tableResList.sort((a, b) => ((a.reservationDate || '') + ' ' + (a.startTime || '')).localeCompare((b.reservationDate || '') + ' ' + (b.startTime || '')));

        let listHtml = tableResList.map((r, i) => `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; background: #f8fafc; text-align: left; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-weight: bold; color: #0284c7; font-size: 15px;">#${i + 1}. Khách: ${escapeHtml(r.customerName || 'Chưa có tên')}</span>
                    <span class="badge" style="background: #10b981; color: #fff; font-size: 11px;">${r.status || 'CONFIRMED'}</span>
                </div>
                <div style="font-size: 13px; color: #334155; margin-bottom: 3px;">
                    <i class="fa fa-calendar" style="color: #0284c7;"></i> <b>Ngày:</b> ${r.reservationDate} &nbsp;|&nbsp; 
                    <i class="fa fa-clock-o" style="color: #f59e0b;"></i> <b>Giờ:</b> ${(r.startTime || '').slice(0,5)} - ${(r.endTime || '').slice(0,5)}
                </div>
                <div style="font-size: 13px; color: #334155; margin-bottom: 3px;">
                    <i class="fa fa-phone" style="color: #10b981;"></i> SĐT: <b>${escapeHtml(r.customerPhone || r.phone || '0000000000')}</b> &nbsp;|&nbsp; 
                    <i class="fa fa-users"></i> Khách: <b>${r.numberOfGuests || 4} người</b>
                </div>
                ${r.note ? `<div style="font-size: 12px; color: #b45309; background: #fef3c7; padding: 4px 8px; border-radius: 4px; margin-top: 5px;">📝 ${escapeHtml(r.note)}</div>` : ''}
                <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #ddd; display: flex; justify-content: flex-end; gap: 6px;">
                    <button class="btn btn-warning btn-xs" style="font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 4px; background: #f59e0b; color: #fff; border: none;" onclick="Swal.close(); switchReservationTable(${r.id}, ${currentTable.id}, '${escapeHtml(tblName)}', '${escapeHtml(r.customerName)}')">
                        <i class="fa fa-exchange"></i> Chuyển sang bàn khác
                    </button>
                    <button class="btn btn-danger btn-xs" style="font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 4px; background: #ef4444; color: #fff; border: none;" onclick="Swal.close(); cancelSingleReservation(${r.id}, '${escapeHtml(r.customerName)}')">
                        <i class="fa fa-times-circle"></i> Hủy ca đặt
                    </button>
                </div>
            </div>
        `).join('');

        Swal.fire({
            title: `<div style="font-size: 18px; font-weight: bold; color: #0284c7;"><i class="fa fa-calendar-check-o"></i> Các Ca Đặt Sau - ${tblName}</div>`,
            html: `<div style="max-height: 380px; overflow-y: auto;">${listHtml}</div>`,
            confirmButtonText: 'Đóng',
            confirmButtonColor: '#0284c7',
            width: '32em'
        });

    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Lỗi tải thông tin ca đặt',
            text: err.message,
            confirmButtonColor: '#d33'
        });
    }
};

/* HỦY CA ĐẶT TRƯỚC */
window.cancelSingleReservation = async function(reservationId, customerName) {
    if (!reservationId) return;
    const result = await Swal.fire({
        title: 'Xác nhận hủy đặt bàn?',
        html: `Bạn có chắc chắn muốn hủy ca đặt của khách <b>${escapeHtml(customerName || 'này')}</b> không?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '<i class="fa fa-trash"></i> Hủy ca đặt',
        cancelButtonText: 'Đóng',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6c757d'
    });

    if (!result.isConfirmed) return;

    try {
        await fetchWithAuth(`/reservations/${reservationId}`, { method: 'DELETE' });
        await Swal.fire({
            icon: 'success',
            title: 'Đã hủy ca đặt bàn!',
            text: `Lịch hẹn của khách ${customerName || ''} đã được xóa thành công.`,
            confirmButtonColor: '#28a745',
            timer: 2000
        });
        if (currentTable && currentTable.id) {
            checkTableFutureReservations(currentTable.id);
        }
    } catch(err) {
        Swal.fire({
            icon: 'error',
            title: 'Hủy ca đặt thất bại',
            text: err.message,
            confirmButtonColor: '#d33'
        });
    }
};

/* CHUYỂN CA ĐẶT HẸN SANG BÀN KHÁC (TRÁNH BÀN ĐANG CÓ KHÁCH ĂN) */
window.switchReservationTable = async function(reservationId, currentTableId, currentTableName, customerName) {
    if (!reservationId || reservationId === 'null') {
        Swal.fire({ icon: 'warning', title: 'Không tìm thấy ca đặt', text: 'Không có mã ca đặt để chuyển bàn!' });
        return;
    }

    try {
        const tableRes = await fetchWithAuth('/tables');
        const allTables = tableRes.data || [];
        const emptyTables = allTables.filter(t => t.id !== currentTableId && t.status !== 'OCCUPIED');

        if (emptyTables.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Không có bàn trống',
                text: 'Hiện không có bàn nào đang trống để chuyển ca đặt sang!',
                confirmButtonColor: '#ff9800'
            });
            return;
        }

        const inputOptions = {};
        emptyTables.forEach(t => {
            const rawName = String(t.tableName || t.name || t.id).trim();
            const name = rawName.toLowerCase().startsWith('bàn') ? rawName : ('Bàn ' + rawName);
            inputOptions[t.id] = `${name} (${t.capacity || 4} chỗ - ${t.status === 'RESERVED' ? 'Đã đặt' : 'Bàn trống'})`;
        });

        const { value: newTableId } = await Swal.fire({
            title: `🔄 Chuyển Ca Đặt Sang Bàn Khác`,
            html: `Chuyển ca hẹn của khách <b>${customerName || 'Khách đặt'}</b> từ <b>${currentTableName}</b> sang bàn trống mới:`,
            input: 'select',
            inputOptions: inputOptions,
            inputPlaceholder: '-- Chọn bàn chuyển sang --',
            showCancelButton: true,
            confirmButtonText: '<i class="fa fa-check"></i> Xác nhận chuyển bàn',
            cancelButtonText: 'Hủy bỏ',
            confirmButtonColor: '#0284c7',
            inputValidator: (value) => {
                if (!value) return 'Vui lòng chọn bàn muốn chuyển sang!';
            }
        });

        if (newTableId) {
            await fetchWithAuth(`/reservations/${reservationId}/switch-table/${newTableId}`, {
                method: 'PUT'
            });

            await Swal.fire({
                icon: 'success',
                title: 'Chuyển bàn thành công! 🎉',
                html: `Đã chuyển ca đặt của <b>${customerName || 'khách'}</b> sang bàn mới!<br>Bàn <b>${currentTableName}</b> đã được giải phóng ca hẹn.`,
                confirmButtonColor: '#28a745',
                timer: 2000
            });

            if (currentTable && currentTable.id) {
                checkTableFutureReservations(currentTable.id);
            }
        }
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Lỗi chuyển ca đặt',
            text: err.message,
            confirmButtonColor: '#d33'
        });
    }
};

/* ĐẶT BÀN GIỜ TIẾP THEO (KHI BÀN HIỆN ĐANG CÓ KHÁCH SỬ DỤNG - CHỈ CASHIER VÀ ADMIN) */
window.openFutureReservationModal = async function() {
    const roles = JSON.parse(localStorage.getItem('userRoles') || '[]');
    const singleRole = localStorage.getItem('role') || localStorage.getItem('userRole') || '';
    const allRoles = [...roles, singleRole];
    const isCashierOrAdmin = allRoles.some(r => typeof r === 'string' && (r.toUpperCase().includes('ADMIN') || r.toUpperCase().includes('CASHIER')));
    if (!isCashierOrAdmin) {
        Swal.fire({
            icon: 'warning',
            title: 'Giới hạn quyền hạn',
            text: 'Chỉ Thu ngân (Cashier) hoặc Quản trị viên (Admin) mới có quyền đặt trước ca tiếp theo cho bàn này!',
            confirmButtonColor: '#ff9800'
        });
        return;
    }

    if (!currentTable) {
        Swal.fire({
            icon: 'warning',
            title: 'Chưa chọn bàn',
            text: 'Vui lòng chọn bàn để đặt lịch cho ca tiếp theo!',
            confirmButtonColor: '#ff9800'
        });
        return;
    }

    const tableId = currentTable.id;
    const tableName = currentTable.tableName || ('Bàn ' + tableId);
    const today = new Date().toISOString().split('T')[0];
    const nowHour = new Date().getHours();
    const nextStartHour = String(Math.min(nowHour + 1, 23)).padStart(2, '0') + ':00';
    const nextEndHour = String(Math.min(nowHour + 3, 23)).padStart(2, '0') + ':00';

    const { value: formValues } = await Swal.fire({
        title: `<div style="font-size:20px; font-weight:bold; color:#17a2b8;"><i class="fa fa-calendar-plus-o"></i> Đặt ${tableName} Giờ Tiếp Theo</div>`,
        html: `
            <div style="text-align: left; font-size: 14px;">
                <p class="text-muted mb-2"><small>Bàn hiện đang có khách ngồi ăn. Thu ngân đang đặt trước bàn này cho khách tiếp theo vào ca sau:</small></p>
                <div class="form-group mb-2" style="margin-bottom:8px;">
                    <label style="font-weight:bold; margin-bottom:2px;">Tên khách hàng *</label>
                    <input id="swal-order-res-name" class="form-control input-sm" placeholder="Nhập tên khách hàng">
                </div>
                <div class="form-group mb-2" style="margin-bottom:8px;">
                    <label style="font-weight:bold; margin-bottom:2px;">Số điện thoại *</label>
                    <input id="swal-order-res-phone" class="form-control input-sm" placeholder="Nhập số điện thoại">
                </div>
                <div class="row" style="margin:0 -5px 8px -5px;">
                    <div class="col-xs-6" style="padding:0 5px;">
                        <label style="font-weight:bold; margin-bottom:2px;">Ngày đặt *</label>
                        <input id="swal-order-res-date" type="date" class="form-control input-sm" value="${today}">
                    </div>
                    <div class="col-xs-6" style="padding:0 5px;">
                        <label style="font-weight:bold; margin-bottom:2px;">Số khách</label>
                        <input id="swal-order-res-guests" type="number" min="1" class="form-control input-sm" value="4">
                    </div>
                </div>
                <div class="row" style="margin:0 -5px 8px -5px;">
                    <div class="col-xs-6" style="padding:0 5px;">
                        <label style="font-weight:bold; margin-bottom:2px;">Giờ bắt đầu *</label>
                        <input id="swal-order-res-start" type="time" class="form-control input-sm" value="${nextStartHour}">
                    </div>
                    <div class="col-xs-6" style="padding:0 5px;">
                        <label style="font-weight:bold; margin-bottom:2px;">Giờ kết thúc *</label>
                        <input id="swal-order-res-end" type="time" class="form-control input-sm" value="${nextEndHour}">
                    </div>
                </div>
                <div class="form-group mb-2" style="margin-bottom:8px;">
                    <label style="font-weight:bold; margin-bottom:2px;">Tiền cọc trước (VNĐ, nếu có)</label>
                    <input id="swal-order-res-deposit" type="number" class="form-control input-sm" placeholder="Ví dụ: 200000">
                </div>
                <div class="form-group mb-2" style="margin-bottom:8px;">
                    <label style="font-weight:bold; margin-bottom:2px;">Ghi chú</label>
                    <input id="swal-order-res-note" class="form-control input-sm" placeholder="Yêu cầu riêng của khách...">
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '<i class="fa fa-check"></i> Xác nhận đặt bàn',
        cancelButtonText: 'Hủy bỏ',
        confirmButtonColor: '#28a745',
        preConfirm: () => {
            const name = document.getElementById('swal-order-res-name').value.trim();
            const phone = document.getElementById('swal-order-res-phone').value.trim();
            const date = document.getElementById('swal-order-res-date').value;
            const start = document.getElementById('swal-order-res-start').value;
            const end = document.getElementById('swal-order-res-end').value;
            const guests = parseInt(document.getElementById('swal-order-res-guests').value) || 4;
            const deposit = document.getElementById('swal-order-res-deposit').value.trim();
            const note = document.getElementById('swal-order-res-note').value.trim();

            if (!name || !phone) {
                Swal.showValidationMessage('Vui lòng nhập tên và số điện thoại khách hàng!');
                return false;
            }
            if (!date || !start || !end) {
                Swal.showValidationMessage('Vui lòng chọn ngày và giờ bắt đầu - kết thúc!');
                return false;
            }
            if (start >= end) {
                Swal.showValidationMessage('Giờ kết thúc phải sau giờ bắt đầu!');
                return false;
            }
            return { name, phone, date, start: start + ':00', end: end + ':00', guests, deposit, note };
        }
    });

    if (!formValues) return;

    try {
        // 1. Check-in Customer
        const cusRes = await fetchWithAuth('/customers/check-in', {
            method: 'POST',
            body: JSON.stringify({ fullName: formValues.name, phone: formValues.phone })
        });
        const customerId = cusRes.data ? cusRes.data.id : 1;

        let noteText = formValues.note || '';
        if (formValues.deposit && parseInt(formValues.deposit) > 0) {
            noteText += ` | Đã cọc: ${parseInt(formValues.deposit)}`;
        }

        const resCode = 'RES' + Date.now().toString().slice(-8);

        // 2. Tạo Reservation ca tiếp theo
        await fetchWithAuth('/reservations/add', {
            method: 'POST',
            body: JSON.stringify({
                reservationCode: resCode,
                customerId: customerId,
                tableId: tableId,
                reservationDate: formValues.date,
                startTime: formValues.start,
                endTime: formValues.end,
                numberOfGuests: formValues.guests,
                note: noteText.trim()
            })
        });

        // Tự động đồng bộ trạng thái bàn sang RESERVED
        await fetchWithAuth(`/tables/${tableId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'RESERVED' })
        }).catch(e => console.warn(e));

        Swal.fire({
            icon: 'success',
            title: 'Đặt bàn ca sau thành công!',
            html: `Đã đặt trước <b>${tableName}</b> cho khách <b>${formValues.name}</b> vào lúc <b>${formValues.start.slice(0,5)} - ${formValues.end.slice(0,5)}</b> ngày <b>${formValues.date}</b>.<br><br><small class="text-muted">Khách hiện tại ở bàn vẫn tiếp tục dùng bữa bình thường.</small>`,
            confirmButtonColor: '#28a745'
        });
    } catch(err) {
        Swal.fire({
            icon: 'error',
            title: 'Đặt bàn thất bại',
            text: err.message,
            confirmButtonColor: '#d33'
        });
    }
};

let lastKnownOrderStatus = null;
function startOrderRealtimeSync() {
    setInterval(async () => {
        if (!currentOrder || !currentOrder.id) return;
        if ($('.modal.in').length || Swal.isVisible()) return;

        try {
            const res = await fetchWithAuth(`/orders/${currentOrder.id}`);
            if (res.data) {
                const newStatus = res.data.status;
                if (lastKnownOrderStatus === 'PENDING' && newStatus === 'PROCESSING') {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'info',
                        title: '🔥 Bếp đã nhận đơn và đang chế biến món!',
                        showConfirmButton: false,
                        timer: 3000
                    });
                } else if (lastKnownOrderStatus === 'PROCESSING' && (newStatus === 'READY' || newStatus === 'SERVED')) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: '✅ Bếp đã nấu xong toàn bộ món!',
                        showConfirmButton: false,
                        timer: 3000
                    });
                }
                lastKnownOrderStatus = newStatus;
                currentOrder = res.data;
                updateTableLabel();

                const itemRes = await fetchWithAuth(`/order-items/order/${currentOrder.id}`);
                cartItems = itemRes.data || [];
                updateCartUI();
            }
        } catch(e) {}
    }, 4000);
}

// =============================================================
// QUẢN LÝ TIỀN KÉT ĐẦU CA & BÁO CÁO KẾT CA THU NGÂN
// =============================================================
function getActiveCashierShift() {
    const userId = localStorage.getItem('userId');
    const userEmail = localStorage.getItem('userEmail');
    const currentName = getCashierDisplayName();
    const myKey = (currentName || '').trim().toLowerCase();

    // 1. Kiểm tra trong registry đa ca activeCashierShifts_map
    try {
        const mapRaw = localStorage.getItem('activeCashierShifts_map');
        if (mapRaw) {
            const map = JSON.parse(mapRaw);
            if (map && typeof map === 'object') {
                if (myKey && map[myKey] && map[myKey].status === 'OPEN') {
                    return map[myKey];
                }
                const activeEntries = Object.values(map).filter(s => s && s.status === 'OPEN');
                if (activeEntries.length > 0) {
                    return activeEntries[activeEntries.length - 1];
                }
            }
        }
    } catch(e) {}

    // 2. Kiểm tra theo user key
    let shiftRaw = null;
    if (userId) shiftRaw = localStorage.getItem('activeCashierShift_' + userId);
    if (!shiftRaw && userEmail) shiftRaw = localStorage.getItem('activeCashierShift_' + userEmail);
    if (!shiftRaw && myKey) shiftRaw = localStorage.getItem('activeCashierShift_' + myKey);
    if (!shiftRaw) shiftRaw = localStorage.getItem('activeCashierShift');
    
    if (shiftRaw) {
        try {
            const shift = JSON.parse(shiftRaw);
            if (shift && shift.status === 'OPEN') {
                return shift;
            }
        } catch(e) {}
    }
    
    const savedCash = localStorage.getItem('shiftOpeningCash');
    const savedTime = localStorage.getItem('shiftOpeningTime') || localStorage.getItem('shiftLoginTime');
    if (savedCash !== null && savedCash !== undefined && savedTime) {
        return {
            openingCash: parseInt(savedCash, 10) || 0,
            shiftStartTime: savedTime,
            cashierName: localStorage.getItem('shiftOpeningCashier') || currentName,
            cashierId: userId,
            status: 'OPEN'
        };
    }
    return null;
}

function getCashierOpeningCash() {
    const shift = getActiveCashierShift();
    if (shift && shift.openingCash !== undefined) {
        return Math.max(0, parseInt(shift.openingCash, 10));
    }
    const val = localStorage.getItem('shiftOpeningCash');
    if (val !== null && val !== undefined && !isNaN(Number(val))) {
        return Math.max(0, parseInt(val, 10));
    }
    return 0;
}

let currentDrawerTotalCash = 0;
let currentShiftCashRevenue = 0;

function updateOpeningCashBadge(amount, openingCash = 0, shiftCash = 0) {
    const formatted = Number(amount || 0).toLocaleString('vi-VN') + ' ₫';
    const activeShift = getActiveCashierShift();
    const openerName = (activeShift && activeShift.cashierName) || localStorage.getItem('shiftOpeningCashier') || '';
    const currentLoggedInName = getCashierDisplayName();
    const isDifferentUser = openerName && currentLoggedInName && (openerName.trim().toLowerCase() !== currentLoggedInName.trim().toLowerCase());

    const textEl = document.getElementById('headerOpeningCashText');
    if (textEl) {
        textEl.innerHTML = `${formatted}${isDifferentUser ? ` <span style="font-size:11px; opacity:0.9; font-weight:normal;">(Ca do ${escapeHtml(openerName)} mở)</span>` : ''}`;
    }
    const btnEl = document.getElementById('btn-cashier-opening-cash');
    if (btnEl) {
        btnEl.style.display = 'inline-flex';
        let tip = `Tổng tiền mặt trong két: ${Number(amount).toLocaleString('vi-VN')} ₫`;
        if (shiftCash > 0) {
            tip += ` (Vốn đầu ca: ${Number(openingCash).toLocaleString('vi-VN')} ₫ + Thu thêm trong ca: ${Number(shiftCash).toLocaleString('vi-VN')} ₫)`;
        } else {
            tip += ` (Vốn đầu ca đã chốt)`;
        }
        if (isDifferentUser) {
            tip += ` [Ca do ${openerName} mở]`;
        }
        btnEl.title = tip;
    }
}

async function syncShiftToServer(shiftData) {
    if (!shiftData) return;
    try {
        const cName = shiftData.cashierName || shiftData.openedBy || getCashierDisplayName();
        const userId = localStorage.getItem('userId');
        const slug = (cName || 'cashier')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'd')
            .toLowerCase().replace(/[^a-z0-9]/g, '');
        const phone = ('SH_' + (userId ? ('U' + userId) : (slug || 'c'))).slice(0, 20);
        const payload = {
            c: cName,
            b: shiftData.openedBy || cName,
            cb: shiftData.closedBy || '',
            s: shiftData.shiftStartTime || shiftData.shiftStart,
            e: shiftData.shiftEndTime || shiftData.shiftEnd || '',
            o: Number(shiftData.openingCash) || 0,
            st: shiftData.status || 'OPEN',
            d: (shiftData.shiftStartTime || new Date().toISOString()).split('T')[0]
        };
        await fetchWithAuth('/customers/check-in', {
            method: 'POST',
            body: JSON.stringify({
                phone: phone,
                fullName: JSON.stringify(payload)
            })
        });
    } catch(e) {}
}

async function syncShiftClosedToServer(cName, sStart, sEnd, closerName) {
    try {
        const slug = (cName || 'cashier')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'd')
            .toLowerCase().replace(/[^a-z0-9]/g, '');
        const userId = localStorage.getItem('userId');
        let targetPhone = ('SH_' + (userId ? ('U' + userId) : (slug || 'c'))).slice(0, 20);
        try {
            const custRes = await fetchWithAuth('/customers');
            const custList = (custRes && custRes.data) || [];
            const cLower = (cName || '').trim().toLowerCase();
            for (const c of custList) {
                if (c.phone && c.phone.startsWith('SH_') && c.fullName && c.fullName.startsWith('{')) {
                    try {
                        const sData = JSON.parse(c.fullName);
                        if ((sData.c || '').trim().toLowerCase() === cLower && sData.st === 'OPEN') {
                            targetPhone = c.phone;
                            break;
                        }
                    } catch(e) {}
                }
            }
        } catch(e) {}

        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        await fetchWithAuth('/customers/check-in', {
            method: 'POST',
            body: JSON.stringify({
                phone: targetPhone,
                fullName: JSON.stringify({
                    c: cName,
                    b: cName,
                    cb: closerName || cName,
                    s: sStart,
                    e: sEnd || now.toISOString(),
                    st: 'CLOSED',
                    d: todayStr
                })
            })
        });
    } catch(e) {}
}

function performLocalShiftCloseOrder(serverShiftInfo = null) {
    const activeBeforeClose = getActiveCashierShift();
    const currentLoggedInName = getCashierDisplayName();
    const cName = (serverShiftInfo && (serverShiftInfo.c || serverShiftInfo.cashierName || serverShiftInfo.b)) || localStorage.getItem('shiftOpeningCashier') || currentLoggedInName;
    const cKey = (cName || '').trim().toLowerCase();
    const closerName = (serverShiftInfo && (serverShiftInfo.cb || serverShiftInfo.closedBy)) || 'Quản trị viên';

    try {
        const pad = n => String(n).padStart(2, '0');
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const key = 'closedCashierShifts_' + todayStr;
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        const sStart = (serverShiftInfo && (serverShiftInfo.s || serverShiftInfo.shiftStartTime)) || localStorage.getItem('shiftOpeningTime');
        const sEnd = (serverShiftInfo && (serverShiftInfo.e || serverShiftInfo.shiftEndTime)) || now.toISOString();

        const alreadyExists = list.some(item => 
            (item.cashierName || '').toLowerCase() === cKey && item.shiftStartTime === sStart
        );
        if (!alreadyExists) {
            list.push({
                id: 'shift_' + Date.now(),
                cashierName: cName,
                openedBy: (serverShiftInfo && (serverShiftInfo.b || serverShiftInfo.openedBy)) || cName,
                closedBy: closerName,
                shiftStartTime: sStart,
                shiftEndTime: sEnd,
                closedAt: now.toISOString(),
                openingCash: Number(serverShiftInfo && serverShiftInfo.o) || Number(localStorage.getItem('shiftOpeningCash')) || 0,
                status: 'CLOSED'
            });
            localStorage.setItem(key, JSON.stringify(list));
        }
    } catch(e) {}

    let map = {};
    try { map = JSON.parse(localStorage.getItem('activeCashierShifts_map') || '{}') || {}; } catch(e) {}
    Object.keys(map).forEach(k => {
        const val = map[k];
        const vName = val ? (val.cashierName || '').trim().toLowerCase() : '';
        if (k === cKey || vName === cKey) {
            delete map[k];
        }
    });
    localStorage.setItem('activeCashierShifts_map', JSON.stringify(map));

    const userId = localStorage.getItem('userId');
    const userEmail = localStorage.getItem('userEmail');
    if (userId) localStorage.removeItem('activeCashierShift_' + userId);
    if (userEmail) localStorage.removeItem('activeCashierShift_' + userEmail);
    localStorage.removeItem('activeCashierShift_' + cKey);

    // Dọn dẹp an toàn activeCashierShift & shiftOpening*
    if (Object.keys(map).length === 0) {
        localStorage.removeItem('activeCashierShift');
        localStorage.removeItem('shiftOpeningCash');
        localStorage.removeItem('shiftOpeningCashier');
        localStorage.removeItem('shiftOpeningTime');
        localStorage.removeItem('shiftLoginTime');
        localStorage.removeItem('cashierLoginTime');
    } else {
        const remaining = Object.values(map);
        localStorage.setItem('activeCashierShift', JSON.stringify(remaining[0]));
        localStorage.setItem('shiftOpeningCash', remaining[0].openingCash || 0);
        localStorage.setItem('shiftOpeningCashier', remaining[0].cashierName || '');
        localStorage.setItem('shiftOpeningTime', remaining[0].shiftStartTime || '');
    }

    currentDrawerTotalCash = 0;
    currentShiftCashRevenue = 0;
    updateOpeningCashBadge(0, 0, 0);

    // CHỈ hiển thị thông báo kết ca nếu trước đó người dùng THỰC SỰ ĐANG MỞ CA tại máy này
    if (activeBeforeClose && !window._shiftClosedAlertShownOrder) {
        const actName = (activeBeforeClose.cashierName || '').trim().toLowerCase();
        const myKey = (currentLoggedInName || '').trim().toLowerCase();

        const normalizeStr = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
        const normC = normalizeStr(cKey);
        const normMy = normalizeStr(myKey);
        const normAct = normalizeStr(actName);
        const isMatch = !normC || normC === normMy || normC === normAct || normMy.includes(normC) || normC.includes(normMy);

        if (isMatch) {
            window._shiftClosedAlertShownOrder = true;
            setTimeout(() => { window._shiftClosedAlertShownOrder = false; }, 6000);

            Swal.fire({
                icon: 'info',
                title: 'Ca làm việc đã được kết thúc!',
                html: `
                    <div style="text-align: left; font-size: 14px; line-height: 1.5;">
                        <p>Ca làm việc của <b>${escapeHtml(cName)}</b> đã được kết thúc bởi <b>${escapeHtml(closerName)}</b>.</p>
                        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px; margin:10px 0; color:#166534;">
                            <i class="fa fa-check-circle"></i> Tiền két đã được bàn giao và đưa về <b>0 ₫</b>.
                        </div>
                        <p class="text-danger font-weight-bold" style="font-size:13.5px; text-align:center; margin-bottom:0; margin-top:8px;">
                            <i class="fa fa-sign-out"></i> Đang tự động đăng xuất... Vui lòng đăng nhập lại để mở ca mới!
                        </p>
                    </div>
                `,
                timer: 2500,
                timerProgressBar: true,
                showConfirmButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: '<i class="fa fa-sign-out"></i> Đăng xuất ngay',
                allowOutsideClick: false,
                allowEscapeKey: false
            }).then(() => {
                const authKeys = [
                    'token', 'userRole', 'userRoles', 'role', 'userEmail', 'userId', 'userFullName', 'userName',
                    'activeCashierShift', 'shiftOpeningCash', 'shiftOpeningCashier', 'shiftOpeningTime',
                    'shiftLoginTime', 'cashierLoginTime', 'activeCashierShift_' + cKey
                ];
                authKeys.forEach(k => localStorage.removeItem(k));
                sessionStorage.clear();
                window.location.href = '/login';
            });
        }
    }
}

async function syncCurrentCashierDrawerCash() {
    const roles = JSON.parse(localStorage.getItem('userRoles') || '[]');
    const singleRole = localStorage.getItem('role') || localStorage.getItem('userRole') || '';
    const allRoles = [...roles, singleRole];
    const isCashier = allRoles.some(r => typeof r === 'string' && (r.toUpperCase().includes('ADMIN') || r.toUpperCase().includes('CASHIER')));
    if (!isCashier) return;

    let activeShift = getActiveCashierShift();
    const currentCashierName = getCashierDisplayName();
    const myKey = (currentCashierName || '').trim().toLowerCase();

    // 1. Kiểm tra trạng thái ca từ Server DB trước tiên (Đồng bộ đa màn hình / Incognito / Admin đóng ca)
    try {
        const custRes = await fetchWithAuth('/customers');
        const custList = (custRes && custRes.data) || [];
        const openerKey = (activeShift && (activeShift.cashierName || activeShift.openedBy) ? activeShift.cashierName : currentCashierName).trim().toLowerCase();

        let foundServerClosed = null;
        let foundServerOpen = null;

        const pad = n => String(n).padStart(2, '0');
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

        for (const c of custList) {
            if (c.phone && c.phone.startsWith('SH_') && c.fullName && c.fullName.startsWith('{')) {
                try {
                    const sData = JSON.parse(c.fullName);
                    const sName = (sData.c || '').trim().toLowerCase();
                    
                    // CHỈ kiểm tra đóng ca khi thực tế máy này ĐANG CÓ CA MỞ
                    if (activeShift && (sName === myKey || sName === openerKey)) {
                        if (sData.st === 'CLOSED') {
                            const actStartMs = new Date(activeShift.shiftStartTime).getTime();
                            const sEndMs = sData.e ? new Date(sData.e).getTime() : (sData.s ? new Date(sData.s).getTime() : Date.now());
                            if (sEndMs >= actStartMs - 60000 || sData.s === activeShift.shiftStartTime) {
                                foundServerClosed = sData;
                            }
                        }
                    }
                    
                    // Phục hồi ca nếu máy này chưa có ca mở nhưng server có ca OPEN của ngày hôm nay
                    if (!activeShift && sData.st === 'OPEN' && (!sData.d || sData.d === todayStr || (sData.s && sData.s.startsWith(todayStr)))) {
                        if (sName === myKey) {
                            foundServerOpen = sData;
                        } else if (!foundServerOpen) {
                            foundServerOpen = sData;
                        }
                    }
                } catch(e) {}
            }
        }

        // Nếu ca ĐANG MỞ mà bị đóng trên Server (bởi Admin hoặc máy khác)
        if (activeShift && foundServerClosed) {
            performLocalShiftCloseOrder(foundServerClosed);
            return;
        }

        // Nếu local chưa có ca nhưng server có ca OPEN của hôm nay -> phục hồi ca
        if (!activeShift && foundServerOpen) {
            const restoredShift = {
                id: 'server_' + (foundServerOpen.s || Date.now()),
                openingCash: Number(foundServerOpen.o) || 0,
                shiftStartTime: foundServerOpen.s,
                cashierName: foundServerOpen.c,
                openedBy: foundServerOpen.b || foundServerOpen.c,
                status: 'OPEN'
            };
            const restoredKey = (foundServerOpen.c || '').trim().toLowerCase();
            let map = {};
            try { map = JSON.parse(localStorage.getItem('activeCashierShifts_map') || '{}') || {}; } catch(e) {}
            map[restoredKey] = restoredShift;
            localStorage.setItem('activeCashierShifts_map', JSON.stringify(map));
            localStorage.setItem('activeCashierShift_' + restoredKey, JSON.stringify(restoredShift));
            localStorage.setItem('activeCashierShift', JSON.stringify(restoredShift));
            localStorage.setItem('shiftOpeningCash', restoredShift.openingCash);
            localStorage.setItem('shiftOpeningCashier', restoredShift.cashierName);
            localStorage.setItem('shiftOpeningTime', restoredShift.shiftStartTime);
            activeShift = restoredShift;
        }
    } catch(e) {}

    activeShift = getActiveCashierShift();
    if (!activeShift) {
        currentDrawerTotalCash = 0;
        currentShiftCashRevenue = 0;
        updateOpeningCashBadge(0, 0, 0);
        return;
    }

    // Đồng bộ trạng thái ca mở lên Server DB
    syncShiftToServer(activeShift);

    const openingCash = Number(activeShift.openingCash) || 0;
    const pad = n => String(n).padStart(2, '0');
    const formatDtLocal = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const defaultStart = formatDtLocal(new Date(activeShift.shiftStartTime));
    let startD = new Date(defaultStart).getTime();
    const endD = Date.now() + 60000;

    try {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const closedList = JSON.parse(localStorage.getItem('closedCashierShifts_' + todayStr) || '[]');
        let lastClosedTime = new Date(`${todayStr}T00:00:00`).getTime();
        closedList.forEach(cs => {
            const ct = new Date(cs.shiftEndTime || cs.closedAt || cs.shiftStartTime).getTime();
            if (ct > lastClosedTime) lastClosedTime = ct;
        });

        const res = await fetchWithAuth('/invoices/all');
        const allInvoices = res.data || [];

        // Mở rộng mốc bắt đầu nếu có hóa đơn phát sinh sau ca đóng gần nhất
        allInvoices.forEach(inv => {
            if (inv.status !== 'PAID') return;
            const payTime = new Date(inv.paidAt || inv.issuedAt || inv.createdAt).getTime();
            if (!isNaN(payTime) && payTime >= lastClosedTime && payTime < startD) {
                startD = payTime;
            }
        });

        // Tính TOÀN BỘ tiền mặt phát sinh trong ca tại quầy (dù là Thu ngân hay Admin bấm thanh toán phụ)
        let shiftCash = 0;
        allInvoices.forEach(inv => {
            if (inv.status !== 'PAID') return;
            const payTime = new Date(inv.paidAt || inv.issuedAt || inv.createdAt).getTime();
            if (isNaN(payTime) || payTime < startD || payTime > endD) return;

            const pm = (inv.paymentMethod || '').toLowerCase();
            if (pm.includes('tiền mặt') || pm.includes('cash') || (!pm.includes('chuyển') && !pm.includes('transfer') && !pm.includes('qr') && !pm.includes('card') && !pm.includes('thẻ'))) {
                shiftCash += Number(inv.totalAmount || inv.finalAmount || 0);
            }
        });

        currentShiftCashRevenue = shiftCash;
        currentDrawerTotalCash = openingCash + shiftCash;
        updateOpeningCashBadge(currentDrawerTotalCash, openingCash, shiftCash);
    } catch(e) {
        currentDrawerTotalCash = openingCash;
        currentShiftCashRevenue = 0;
        updateOpeningCashBadge(openingCash, openingCash, 0);
    }
}

function closeCashierShift(shiftData = null) {
    const currentLoggedInName = getCashierDisplayName();
    const cName = (shiftData && (shiftData.cashierName || shiftData.openedBy)) || localStorage.getItem('shiftOpeningCashier') || currentLoggedInName;
    const cKey = (cName || '').trim().toLowerCase();

    if (shiftData) {
        try {
            const pad = n => String(n).padStart(2, '0');
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
            const key = 'closedCashierShifts_' + todayStr;
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            const sStart = shiftData.shiftStart;
            const sEnd = shiftData.shiftEnd || now.toISOString();

            // Tránh ghi đè trùng lặp cùng 1 ca
            const alreadyExists = list.some(item => 
                (item.cashierName || '').toLowerCase() === cKey && item.shiftStartTime === sStart
            );
            if (!alreadyExists) {
                list.push({
                    id: 'shift_' + Date.now(),
                    cashierName: cName,
                    openedBy: shiftData.openedBy || shiftData.cashierName || localStorage.getItem('shiftOpeningCashier') || cName,
                    closedBy: shiftData.closedBy || currentLoggedInName,
                    shiftStartTime: sStart,
                    shiftEndTime: sEnd,
                    closedAt: now.toISOString(),
                    openingCash: shiftData.openingCash || Number(localStorage.getItem('shiftOpeningCash')) || 0,
                    status: 'CLOSED',
                    totalRev: shiftData.totalRev || 0,
                    cashRev: shiftData.cashRev || 0,
                    transferRev: shiftData.transferRev || 0,
                    count: shiftData.count || 0
                });
                localStorage.setItem(key, JSON.stringify(list));
            }
        } catch(e) {
            console.warn("Lỗi ghi nhận lịch sử kết ca:", e);
        }

        // Gửi cập nhật CLOSED lên Server DB
        syncShiftClosedToServer(cName, shiftData.shiftStart, shiftData.shiftEnd, shiftData.closedBy || currentLoggedInName);
    }

    // Xóa ca khỏi registry đa ca activeCashierShifts_map
    let map = {};
    try { map = JSON.parse(localStorage.getItem('activeCashierShifts_map') || '{}') || {}; } catch(e) {}
    delete map[cKey];
    localStorage.setItem('activeCashierShifts_map', JSON.stringify(map));

    // Chỉ xóa CHỌN LỌC các active key của thu ngân này, KHÔNG xóa ca của thu ngân khác
    const userId = localStorage.getItem('userId');
    const userEmail = localStorage.getItem('userEmail');
    if (userId) localStorage.removeItem('activeCashierShift_' + userId);
    if (userEmail) localStorage.removeItem('activeCashierShift_' + userEmail);
    localStorage.removeItem('activeCashierShift_' + cKey);

    // Kiểm tra xem activeCashierShift có thuộc về thu ngân này không
    try {
        const actRaw = localStorage.getItem('activeCashierShift');
        if (actRaw) {
            const act = JSON.parse(actRaw);
            if ((act.cashierName || '').trim().toLowerCase() === cKey) {
                const remaining = Object.values(map);
                if (remaining.length > 0) {
                    localStorage.setItem('activeCashierShift', JSON.stringify(remaining[0]));
                } else {
                    localStorage.removeItem('activeCashierShift');
                }
            }
        } else {
            localStorage.removeItem('activeCashierShift');
        }
    } catch(e) {
        localStorage.removeItem('activeCashierShift');
    }

    // Chỉ dọn dẹp shiftOpening* nếu người mở ca là thu ngân này
    const opCashier = (localStorage.getItem('shiftOpeningCashier') || '').trim().toLowerCase();
    if (!opCashier || opCashier === cKey) {
        const remaining = Object.values(map);
        if (remaining.length > 0) {
            const nextAct = remaining[0];
            localStorage.setItem('shiftOpeningCash', nextAct.openingCash || 0);
            localStorage.setItem('shiftOpeningCashier', nextAct.cashierName || '');
            localStorage.setItem('shiftOpeningTime', nextAct.shiftStartTime || '');
        } else {
            localStorage.removeItem('shiftOpeningCash');
            localStorage.removeItem('shiftOpeningCashier');
            localStorage.removeItem('shiftOpeningTime');
            localStorage.removeItem('shiftLoginTime');
            localStorage.removeItem('cashierLoginTime');
        }
    }

    try {
        const shiftBc = new BroadcastChannel('shift_sync_channel');
        shiftBc.postMessage({
            type: 'SHIFT_CLOSED',
            cashierName: cName,
            closedBy: (shiftData && shiftData.closedBy) || currentLoggedInName,
            activeShiftsMap: map
        });
    } catch(e) {}

    currentDrawerTotalCash = 0;
    currentShiftCashRevenue = 0;
    updateOpeningCashBadge(0, 0, 0);
}

window.promptCashierOpeningCashModal = async function(isManual = false) {
    const roles = JSON.parse(localStorage.getItem('userRoles') || '[]');
    const singleRole = localStorage.getItem('role') || localStorage.getItem('userRole') || '';
    const allRoles = [...roles, singleRole];
    const isCashier = allRoles.some(r => typeof r === 'string' && (r.toUpperCase().includes('ADMIN') || r.toUpperCase().includes('CASHIER')));
    if (!isCashier) return;

    const activeShift = getActiveCashierShift();
    if (activeShift) {
        // Đã mở ca -> Đồng bộ số tiền két mới nhất và hiển thị bảng chi tiết
        await syncCurrentCashierDrawerCash();
        const openingCash = Number(activeShift.openingCash) || 0;
        const totalCash = currentDrawerTotalCash || openingCash;
        const shiftCash = currentShiftCashRevenue || 0;
        const openerName = (activeShift && activeShift.cashierName) || localStorage.getItem('shiftOpeningCashier') || '';
        const currentLoggedInName = getCashierDisplayName();
        const isDifferentUser = openerName && currentLoggedInName && (openerName.trim().toLowerCase() !== currentLoggedInName.trim().toLowerCase());

        Swal.fire({
            icon: 'info',
            title: '<span style="color:#0f172a; font-weight:700;">Kiểm Tra Tiền Mặt Trong Két</span>',
            width: '480px',
            html: `
                <div style="text-align: left; font-size: 14px; line-height: 1.5;">
                    ${isDifferentUser ? `
                    <div style="background:#fef3c7; border:1px solid #fde68a; color:#92400e; padding:8px 12px; border-radius:8px; margin-bottom:12px; font-weight:600; font-size:13px;">
                        <i class="fa fa-info-circle text-warning"></i> Ca làm việc này do <b>${escapeHtml(openerName)}</b> mở.<br>
                        <span style="font-size:12px; font-weight:normal; color:#78350f;">Bạn đang đăng nhập: <b>${escapeHtml(currentLoggedInName)}</b> (Hệ thống tính chung két tại quầy)</span>
                    </div>` : ''}
                    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                        <div style="font-size: 12.5px; color: #1e40af; margin-bottom: 8px;">
                            Thu ngân mở ca: <b>${escapeHtml(openerName || activeShift.cashierName)}</b><br>
                            Thời gian vào ca: <b>${new Date(activeShift.shiftStartTime).toLocaleString('vi-VN')}</b>
                        </div>
                        <div style="border-top: 1px dashed #93c5fd; padding-top: 8px; display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 600; color: #1e3a8a;"><i class="fa fa-lock"></i> Vốn lót két đầu ca (A):</span>
                            <span style="font-weight: bold; color: #1d4ed8; font-size: 15px;">${openingCash.toLocaleString('vi-VN')} ₫</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                            <span style="font-weight: 600; color: #b45309;"><i class="fa fa-plus-circle"></i> Tiền mặt thu thêm trong ca (B):</span>
                            <span style="font-weight: bold; color: #d97706; font-size: 15px;">+${shiftCash.toLocaleString('vi-VN')} ₫</span>
                        </div>
                        <div style="border-top: 1px solid #93c5fd; padding-top: 8px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; background: #dbeafe; border-radius: 6px; padding: 6px 10px;">
                            <span style="font-weight: bold; color: #0f172a; font-size: 14px;">TỔNG TRONG KÉT HIỆN TẠI (A + B):</span>
                            <span style="font-weight: 800; color: #16a34a; font-size: 18px;">${totalCash.toLocaleString('vi-VN')} ₫</span>
                        </div>
                    </div>
                    <p style="color: #475569; margin: 0; font-size: 12.5px;">
                        <i class="fa fa-info-circle text-primary"></i> <b>Quy định đối soát:</b> Số tiền trên nút két luôn tự động cộng dồn doanh thu tiền mặt thu được trong ca vào vốn đầu ca để thu ngân dễ dàng kiểm đếm két thực tế bất cứ lúc nào.
                    </p>
                </div>
            `,
            confirmButtonColor: '#d97706',
            confirmButtonText: '<i class="fa fa-check"></i> Đã hiểu'
        });
        return;
    }

    const currentCashierName = getCashierDisplayName();
    const { value: openingCash } = await Swal.fire({
        title: `<div style="font-size:20px; font-weight:bold; color:#d97706;"><i class="fa fa-money"></i> Kiểm Đếm Tiền Két Lúc Mở Ca</div>`,
        width: '460px',
        allowOutsideClick: true,
        showCloseButton: true,
        html: `
            <div style="text-align: left; font-size: 14px;">
                <p class="text-muted" style="margin-bottom:12px; line-height:1.45;">
                    Chào thu ngân <b>${escapeHtml(currentCashierName)}</b>! Vui lòng kiểm tra két tiền và nhập <b>số tiền mặt hiện có trong két</b> lúc bắt đầu ca (tiền thối lót két) để hệ thống tự động đối soát và trừ tiền két khi kết ca.<br>
                    <span style="color:#d97706; font-weight:600; font-size:12px;">* Lưu ý: Tiền két sau khi xác nhận sẽ được khóa cố định và không được sửa trong ca.</span>
                </p>
                <div style="margin-bottom:12px;">
                    <label style="font-weight:bold; margin-bottom:5px; display:block; color:#1e293b;">Số tiền mặt trong két (VNĐ) *:</label>
                    <input id="swal-opening-cash-input" type="text" class="form-control" style="font-size:18px; font-weight:bold; color:#d97706; padding:8px 12px; width:100%; border:1px solid #cbd5e1; border-radius:6px;" value="1.000.000" placeholder="Ví dụ: 1,000,000">
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:4px;">
                    <button type="button" class="btn btn-default btn-xs" style="padding:3px 8px; border:1px solid #ccc; background:#fff; border-radius:4px;" onclick="document.getElementById('swal-opening-cash-input').value = (500000).toLocaleString('vi-VN')">500.000 ₫</button>
                    <button type="button" class="btn btn-default btn-xs" style="padding:3px 8px; border:1px solid #ccc; background:#fff; border-radius:4px;" onclick="document.getElementById('swal-opening-cash-input').value = (1000000).toLocaleString('vi-VN')">1.000.000 ₫</button>
                    <button type="button" class="btn btn-default btn-xs" style="padding:3px 8px; border:1px solid #ccc; background:#fff; border-radius:4px;" onclick="document.getElementById('swal-opening-cash-input').value = (1500000).toLocaleString('vi-VN')">1.500.000 ₫</button>
                    <button type="button" class="btn btn-default btn-xs" style="padding:3px 8px; border:1px solid #ccc; background:#fff; border-radius:4px;" onclick="document.getElementById('swal-opening-cash-input').value = (2000000).toLocaleString('vi-VN')">2.000.000 ₫</button>
                    <button type="button" class="btn btn-default btn-xs" style="padding:3px 8px; border:1px solid #ccc; background:#fff; border-radius:4px;" onclick="document.getElementById('swal-opening-cash-input').value = '0'">0 ₫ (Két trống)</button>
                </div>
            </div>
        `,
        didOpen: () => {
            const inp = document.getElementById('swal-opening-cash-input');
            if (inp) {
                inp.focus();
                inp.select();
                inp.addEventListener('input', () => {
                    const raw = inp.value.replace(/\D/g, '');
                    inp.value = raw ? Number(raw).toLocaleString('vi-VN') : '';
                });
            }
        },
        showCancelButton: true,
        confirmButtonText: '<i class="fa fa-lock"></i> Xác nhận & Khóa tiền két',
        cancelButtonText: '<i class="fa fa-times"></i> Thoát',
        confirmButtonColor: '#d97706',
        cancelButtonColor: '#64748b',
        preConfirm: () => {
            const inp = document.getElementById('swal-opening-cash-input');
            const raw = (inp ? inp.value : '').replace(/\D/g, '');
            if (raw === '') {
                Swal.showValidationMessage('Vui lòng nhập số tiền mặt trong két!');
                return false;
            }
            return parseInt(raw, 10);
        }
    });

    if (openingCash !== undefined && openingCash !== null) {
        const userId = localStorage.getItem('userId');
        const userEmail = localStorage.getItem('userEmail');
        const shiftStartIso = new Date().toISOString();
        localStorage.setItem('cashierLoginTime', shiftStartIso);
        const newShift = {
            id: 'shift_' + Date.now(),
            openingCash: openingCash,
            shiftStartTime: shiftStartIso,
            cashierName: currentCashierName,
            openedBy: currentCashierName,
            cashierId: userId,
            status: 'OPEN'
        };

        const myKey = currentCashierName.trim().toLowerCase();

        // Lưu vào registry đa ca làm việc
        let map = {};
        try { map = JSON.parse(localStorage.getItem('activeCashierShifts_map') || '{}') || {}; } catch(e) {}
        map[myKey] = newShift;
        localStorage.setItem('activeCashierShifts_map', JSON.stringify(map));

        if (userId) localStorage.setItem('activeCashierShift_' + userId, JSON.stringify(newShift));
        if (userEmail) localStorage.setItem('activeCashierShift_' + userEmail, JSON.stringify(newShift));
        localStorage.setItem('activeCashierShift_' + myKey, JSON.stringify(newShift));
        localStorage.setItem('activeCashierShift', JSON.stringify(newShift));
        localStorage.setItem('shiftOpeningCash', openingCash);
        localStorage.setItem('shiftOpeningCashier', currentCashierName);
        localStorage.setItem('shiftOpeningTime', shiftStartIso);
        localStorage.setItem('shiftLoginTime', shiftStartIso);

        try {
            const shiftBc = new BroadcastChannel('shift_sync_channel');
            shiftBc.postMessage({ type: 'SHIFT_OPENED', shift: newShift, cashierName: currentCashierName, openingCash: openingCash, shiftStartTime: shiftStartIso, activeShiftsMap: map });
        } catch(e) {}

        updateOpeningCashBadge(openingCash, openingCash, 0);
        await syncCurrentCashierDrawerCash();
        syncShiftToServer(newShift);

        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `Đã mở ca & khóa tiền két: ${Number(openingCash).toLocaleString('vi-VN')} ₫`,
            showConfirmButton: false,
            timer: 2500
        });
    }
};

async function checkCashierOpeningCashOnLoad() {
    const roles = JSON.parse(localStorage.getItem('userRoles') || '[]');
    const singleRole = localStorage.getItem('role') || localStorage.getItem('userRole') || '';
    const allRoles = [...roles, singleRole];
    const isCashier = allRoles.some(r => typeof r === 'string' && (r.toUpperCase().includes('ADMIN') || r.toUpperCase().includes('CASHIER')));
    if (!isCashier) return;

    let activeShift = getActiveCashierShift();
    const pad = n => String(n).padStart(2, '0');
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    if (!activeShift) {
        // Kiểm tra từ server DB xem có ca đang mở tại quầy hôm nay không
        try {
            const custRes = await fetchWithAuth('/customers');
            const custList = (custRes && custRes.data) || [];
            const cName = getCashierDisplayName();
            const myKey = (cName || '').trim().toLowerCase();
            for (const c of custList) {
                if (c.phone && c.phone.startsWith('SH_') && c.fullName && c.fullName.startsWith('{')) {
                    const shiftData = JSON.parse(c.fullName);
                    const sName = (shiftData.c || '').trim().toLowerCase();
                    if (shiftData.st === 'OPEN' && (!shiftData.d || shiftData.d === todayStr || (shiftData.s && shiftData.s.startsWith(todayStr)))) {
                        if (sName === myKey || !activeShift) {
                            const restoredShift = {
                                id: 'server_' + (shiftData.s || c.phone),
                                openingCash: Number(shiftData.o) || 0,
                                shiftStartTime: shiftData.s,
                                cashierName: shiftData.c,
                                openedBy: shiftData.b || shiftData.c,
                                status: 'OPEN'
                            };
                            const restoredKey = (shiftData.c || '').trim().toLowerCase();
                            let map = {};
                            try { map = JSON.parse(localStorage.getItem('activeCashierShifts_map') || '{}') || {}; } catch(e) {}
                            map[restoredKey] = restoredShift;
                            localStorage.setItem('activeCashierShifts_map', JSON.stringify(map));
                            localStorage.setItem('activeCashierShift_' + restoredKey, JSON.stringify(restoredShift));
                            localStorage.setItem('activeCashierShift', JSON.stringify(restoredShift));
                            localStorage.setItem('shiftOpeningCash', restoredShift.openingCash);
                            localStorage.setItem('shiftOpeningCashier', restoredShift.cashierName);
                            localStorage.setItem('shiftOpeningTime', restoredShift.shiftStartTime);
                            activeShift = restoredShift;
                            if (sName === myKey) break;
                        }
                    }
                }
            }
        } catch(e) {}
    }

    if (activeShift) {
        // Đã mở ca trước đó -> Đồng bộ số tiền trong két hiện tại
        syncCurrentCashierDrawerCash();
    } else {
        // Lần đầu đăng nhập ca mới -> Lưu mốc giờ đăng nhập mới của ca này
        const newLoginTimeIso = new Date().toISOString();
        localStorage.setItem('cashierLoginTime', newLoginTimeIso);

        // Nhắc thu ngân đếm tiền két và nhập
        updateOpeningCashBadge(0, 0, 0);
        setTimeout(() => {
            promptCashierOpeningCashModal(false);
        }, 600);
    }
}

function initOrderApp() {
    loadInitialData();
    startOrderRealtimeSync();
    checkCashierOpeningCashOnLoad();
    // Tự động định kỳ đồng bộ số tiền trong két ngay lập tức và lặp lại mỗi 4 giây
    syncCurrentCashierDrawerCash();
    setInterval(syncCurrentCashierDrawerCash, 4000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOrderApp);
} else {
    initOrderApp();
}

// =============================================================
// CASHIER SHIFT REPORT / BÁO CÁO KẾT CA THU NGÂN
// =============================================================
window.openCashierShiftModal = async function() {
    const roles = JSON.parse(localStorage.getItem('userRoles') || '[]');
    const isCashier = roles.some(r => typeof r === 'string' && (r.toUpperCase().includes('ADMIN') || r.toUpperCase().includes('CASHIER')));
    if (!isCashier) {
        Swal.fire({
            icon: 'warning',
            title: 'Từ chối quyền hạn',
            text: 'Nhân viên order chỉ làm nhiệm vụ gọi món. Chức năng kết ca & báo cáo doanh thu chỉ dành cho Thu ngân trực ca!',
            confirmButtonColor: '#d10024'
        });
        return;
    }

    let activeShift = getActiveCashierShift();
    if (!activeShift) {
        await promptCashierOpeningCashModal(false);
        activeShift = getActiveCashierShift();
        if (!activeShift) return;
    }

    const currentCashierName = getCashierDisplayName();
    const pad = n => String(n).padStart(2, '0');
    const formatDtLocal = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    let shiftStartDate = new Date(activeShift.shiftStartTime);
    const now = new Date();

    // Mở rộng mốc bắt đầu nếu có hóa đơn của ca này phát sinh sau ca đóng gần nhất
    try {
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const closedList = JSON.parse(localStorage.getItem('closedCashierShifts_' + todayStr) || '[]');
        let lastClosedTime = new Date(`${todayStr}T00:00:00`).getTime();
        closedList.forEach(cs => {
            if ((cs.cashierName || '').trim().toLowerCase() === currentCashierName.trim().toLowerCase()) {
                const ct = new Date(cs.shiftEndTime || cs.closedAt || cs.shiftStartTime).getTime();
                if (ct > lastClosedTime) lastClosedTime = ct;
            }
        });

        const allInvoicesRes = await fetchWithAuth('/invoices/all');
        const allInvList = allInvoicesRes.data || [];
        allInvList.forEach(inv => {
            if (inv.status !== 'PAID') return;
            const cName = (inv.cashierName || '').trim().toLowerCase();
            const myName = currentCashierName.trim().toLowerCase();
            if (cName === myName || (!inv.cashierName && roles.some(r => typeof r === 'string' && r.toUpperCase().includes('ADMIN')))) {
                const pt = new Date(inv.paidAt || inv.issuedAt || inv.createdAt).getTime();
                if (pt >= lastClosedTime && pt < shiftStartDate.getTime()) {
                    shiftStartDate = new Date(pt);
                }
            }
        });
    } catch(e) {}

    const defaultStart = formatDtLocal(shiftStartDate);
    const defaultEnd = formatDtLocal(now);
    const openingCash = activeShift.openingCash || 0;

    async function calculateShiftData(startTime, endTime) {
        try {
            const res = await fetchWithAuth('/invoices/all');
            const allInvoices = res.data || [];
            const startD = new Date(startTime).getTime();
            // Đảm bảo tính trọn vẹn cả phút kết ca và thời điểm hiện tại để thanh toán vừa xong hiện NGAY LẬP TỨC
            const endDt = new Date(endTime);
            endDt.setSeconds(59, 999);
            const endD = Math.max(endDt.getTime(), Date.now());

            const shiftInvoices = allInvoices.filter(inv => {
                if (inv.status !== 'PAID') return false;
                const payTime = new Date(inv.paidAt || inv.issuedAt || inv.createdAt).getTime();
                if (isNaN(payTime)) return false;
                if (payTime < startD || payTime > endD) return false;
                // Tính toàn bộ hóa đơn phát sinh trong khung giờ ca mở tại quầy (dù là Thu ngân hay Admin bấm thanh toán phụ)
                return true;
            });

            let totalRev = 0;
            let cashRev = 0;
            let transferRev = 0;
            shiftInvoices.forEach(inv => {
                const amt = Number(inv.totalAmount || inv.finalAmount || 0);
                totalRev += amt;
                const pm = (inv.paymentMethod || '').toLowerCase();
                if (pm.includes('tiền mặt') || pm.includes('cash')) cashRev += amt;
                else transferRev += amt;
            });

            return {
                invoices: shiftInvoices,
                totalRev,
                cashRev,
                transferRev,
                count: shiftInvoices.length
            };
        } catch(e) {
            return { invoices: [], totalRev: 0, cashRev: 0, transferRev: 0, count: 0 };
        }
    }

    let initialData = await calculateShiftData(defaultStart, defaultEnd);
    currentShiftCashRevenue = initialData.cashRev || 0;
    currentDrawerTotalCash = openingCash + currentShiftCashRevenue;
    updateOpeningCashBadge(currentDrawerTotalCash, openingCash, currentShiftCashRevenue);

    const openerName = (activeShift && activeShift.cashierName) || localStorage.getItem('shiftOpeningCashier') || currentCashierName;
    const isDifferentUser = openerName && currentCashierName && (openerName.trim().toLowerCase() !== currentCashierName.trim().toLowerCase());

    const { isConfirmed } = await Swal.fire({
        title: `<div style="font-size:20px; font-weight:bold; color:#0284c7;"><i class="fa fa-file-text-o"></i> Báo Cáo Doanh Thu Ca - Thu Ngân</div>`,
        width: '500px',
        html: `
            <div style="text-align: left; font-size: 14px;">
                <div style="background: #e0f2fe; border: 1px solid #7dd3fc; border-radius: 8px; padding: 10px; margin-bottom: 12px;">
                    <div style="font-weight:bold; color:#0369a1;">
                        Thu ngân trực ca: <b>${escapeHtml(openerName)}</b>
                        ${isDifferentUser ? `<br><small class="text-danger" style="font-weight:600;"><i class="fa fa-user-circle"></i> Người đang thao tác kết ca: <b>${escapeHtml(currentCashierName)}</b></small>` : ''}
                    </div>
                    <div style="font-size:12px; color:#555;">Báo cáo tổng kết ca làm việc từ lúc vào ca đến lúc ra ca / kết ca.</div>
                </div>

                <div class="row g-2 mb-2" style="display:flex; gap:10px;">
                    <div style="flex:1;">
                        <label style="font-weight:bold; margin-bottom:4px; display:block; color:#1e293b;">
                            <i class="fa fa-lock text-muted"></i> Giờ vào ca (Bắt đầu):
                        </label>
                        <input id="swal-shift-start" type="datetime-local" class="form-control" value="${defaultStart}" readonly disabled style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; background:#f1f5f9; cursor:not-allowed;">
                        <small class="text-muted" style="font-size:11px;">* Cố định theo thời gian mở ca đầu tiên</small>
                    </div>
                    <div style="flex:1;">
                        <label style="font-weight:bold; margin-bottom:4px; display:block; color:#1e293b;">
                            <i class="fa fa-clock-o text-success"></i> Giờ kết ca (Ra ca):
                        </label>
                        <div style="font-size:13px; font-weight:bold; color:#16a34a; padding:7px 10px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px;">
                            <i class="fa fa-bolt"></i> Tới bây giờ (${pad(now.getHours())}:${pad(now.getMinutes())})
                        </div>
                        <small class="text-muted" style="font-size:11px;">* Sẽ chốt mốc giờ này khi bấm kết thúc ca</small>
                    </div>
                </div>

                <div id="swal-shift-summary-box" style="margin-top:14px; background:#f8fafc; border:1px dashed #94a3b8; border-radius:8px; padding:12px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span>Số hóa đơn đã thu:</span>
                        <strong id="swal-shift-count">${initialData.count} HĐ</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span>Tiền mặt trong két lúc mở ca (A):</span>
                        <div>
                            <strong id="swal-shift-opening" style="color:#0284c7;">${openingCash.toLocaleString('vi-VN')} ₫</strong>
                            <small class="text-muted" style="font-size:11px; margin-left:4px;">(Đã chốt)</small>
                        </div>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span>Doanh thu Tiền mặt thu trong ca (B):</span>
                        <strong id="swal-shift-cash" style="color:#d97706;">${initialData.cashRev.toLocaleString('vi-VN')} ₫</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span>Doanh thu Chuyển khoản / QR:</span>
                        <strong id="swal-shift-transfer" style="color:#2563eb;">${initialData.transferRev.toLocaleString('vi-VN')} ₫</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-top:1px dashed #cbd5e1; padding-top:6px; margin-top:6px;">
                        <span>TỔNG TIỀN MẶT TRONG KÉT (A + B):</span>
                        <strong id="swal-shift-drawer" style="color:#0f172a; font-size:15px;">${(openingCash + initialData.cashRev).toLocaleString('vi-VN')} ₫</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; background:#fef3c7; border:1px solid #fde68a; border-radius:6px; padding:6px 8px; margin-top:6px;">
                        <div>
                            <span style="font-weight:bold; color:#92400e;">TIỀN MẶT BÀN GIAO NỘP QUỸ (B):</span><br>
                            <small style="color:#78350f; font-size:11px;">(Đã trừ ${openingCash.toLocaleString('vi-VN')} ₫ tiền két giữ lại làm vốn ca sau)</small>
                        </div>
                        <strong id="swal-shift-handover" style="color:#b45309; font-size:16px;">${initialData.cashRev.toLocaleString('vi-VN')} ₫</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-top:1px solid #cbd5e1; padding-top:6px; margin-top:8px; font-size:16px;">
                        <strong>TỔNG DOANH THU CA:</strong>
                        <strong id="swal-shift-total" style="color:#16a34a;">${initialData.totalRev.toLocaleString('vi-VN')} ₫</strong>
                    </div>
                </div>

                <div style="margin-top:12px;">
                    <button type="button" class="btn btn-default btn-xs" onclick="const el = document.getElementById('swal-shift-orders-table-wrapper'); el.style.display = el.style.display === 'none' ? 'block' : 'none';" style="width:100%; padding:6px; font-weight:600; color:#0284c7; border:1px dashed #0284c7; background:#f0f9ff; border-radius:6px;">
                        <i class="fa fa-list me-1"></i> Xem danh sách ${initialData.count} đơn hàng trong ca (Bấm xem/đóng)
                    </button>
                    <div id="swal-shift-orders-table-wrapper" style="display:none; max-height:160px; overflow-y:auto; margin-top:8px; border:1px solid #e2e8f0; border-radius:6px; font-size:12px; background:#fff;">
                        <table style="width:100%; border-collapse:collapse;">
                            <thead style="background:#f1f5f9; position:sticky; top:0;">
                                <tr>
                                    <th style="padding:5px 6px; text-align:left;">Mã HĐ</th>
                                    <th style="padding:5px 6px; text-align:left;">Bàn</th>
                                    <th style="padding:5px 6px; text-align:center;">Giờ TT</th>
                                    <th style="padding:5px 6px; text-align:right;">Thực thu</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${initialData.invoices.map(inv => `
                                    <tr style="border-bottom:1px solid #f1f5f9;">
                                        <td style="padding:4px 6px; font-weight:bold; color:#0284c7;">#${inv.invoiceCode || inv.id}</td>
                                        <td style="padding:4px 6px;">${escapeHtml(inv.tableName || 'Bàn ' + (inv.tableId || '-'))}</td>
                                        <td style="padding:4px 6px; text-align:center; color:#666;">${new Date(inv.paidAt || inv.issuedAt || inv.createdAt).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</td>
                                        <td style="padding:4px 6px; text-align:right; font-weight:bold; color:#16a34a;">${Number(inv.finalAmount || inv.totalAmount || 0).toLocaleString('vi-VN')} ₫</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="4" style="text-align:center; padding:8px; color:#888;">Chưa có đơn hàng thanh toán</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="fa fa-print"></i> In Phiếu & Kết Thúc Ca',
        cancelButtonText: 'Đóng',
        confirmButtonColor: '#0284c7'
    });

    if (isConfirmed) {
        const closeNow = new Date();
        const effectiveEnd = formatDtLocal(closeNow);

        // 1. In phiếu báo cáo kết ca (ghi rõ Thu ngân trực ca và Người xác nhận kết ca)
        window.printThermalCashierShiftReceipt({
            cashierName: openerName,
            openerName: openerName,
            closerName: currentCashierName,
            shiftStart: defaultStart,
            shiftEnd: effectiveEnd,
            openingCash: openingCash,
            count: initialData.count,
            cashRev: initialData.cashRev,
            transferRev: initialData.transferRev,
            totalRev: initialData.totalRev,
            invoices: initialData.invoices
        });

        // 2. KẾT CA LUÔN: Lưu lịch sử ca đã kết thúc và giải phóng ca làm việc
        closeCashierShift({
            cashierName: openerName,
            openedBy: openerName,
            closedBy: currentCashierName,
            shiftStart: defaultStart,
            shiftEnd: effectiveEnd,
            openingCash: openingCash,
            totalRev: initialData.totalRev,
            cashRev: initialData.cashRev,
            transferRev: initialData.transferRev,
            count: initialData.count
        });

        // 3. Thông báo hoàn tất kết ca và TỰ ĐỘNG ĐĂNG XUẤT LUÔN
        setTimeout(() => {
            Swal.fire({
                icon: 'success',
                title: 'Đã hoàn tất kết ca thành công!',
                html: `
                    <div style="text-align: left; font-size: 14px;">
                        <p>Ca làm việc của thu ngân <b>${escapeHtml(openerName)}</b> đã được kết thúc bởi <b>${escapeHtml(currentCashierName)}</b> và in phiếu bàn giao quỹ.</p>
                        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px; margin:10px 0; color:#166534;">
                            <div style="font-size:14.5px; margin-bottom:4px;">💰 <b>Tổng tiền mặt trong két (A + B): ${(openingCash + initialData.cashRev).toLocaleString('vi-VN')} ₫</b></div>
                            <div style="font-size:12px; color:#14532d; margin-bottom:6px;"><i>(Gồm: Vốn đầu ca ${openingCash.toLocaleString('vi-VN')} ₫ + Thu trong ca ${initialData.cashRev.toLocaleString('vi-VN')} ₫)</i></div>
                            <div style="border-top:1px dashed #bbf7d0; padding-top:6px;">💵 Tiền mặt bàn giao nộp quỹ (B): <b>${initialData.cashRev.toLocaleString('vi-VN')} ₫</b></div>
                            <div>💳 Chuyển khoản / QR: <b>${initialData.transferRev.toLocaleString('vi-VN')} ₫</b></div>
                            <div style="border-top:1px dashed #bbf7d0; margin-top:5px; padding-top:5px; font-weight:bold;">
                                📈 Tổng thực thu ca (B): ${initialData.totalRev.toLocaleString('vi-VN')} ₫
                            </div>
                        </div>
                        <p class="text-danger font-weight-bold" style="font-size:13.5px; text-align:center; margin-bottom:0;">
                            <i class="fa fa-sign-out"></i> Đang tự động đăng xuất... Vui lòng đăng nhập lại để mở ca mới!
                        </p>
                    </div>
                `,
                timer: 2200,
                timerProgressBar: true,
                showConfirmButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: '<i class="fa fa-sign-out"></i> Đăng xuất ngay'
            }).then(() => {
                const authKeys = ['token', 'userRole', 'userRoles', 'role', 'userEmail', 'userId', 'userFullName', 'userName'];
                authKeys.forEach(k => localStorage.removeItem(k));
                window.location.href = '/login';
            });
        }, 600);
    }
};

window.printThermalCashierShiftReceipt = function(data) {
    const printTime = new Date().toLocaleString('vi-VN');
    const startStr = data.shiftStart ? new Date(data.shiftStart).toLocaleString('vi-VN') : '-';
    const endStr = data.shiftEnd ? new Date(data.shiftEnd).toLocaleString('vi-VN') : '-';
    const openerName = data.openerName || data.cashierName || 'Thu ngân';
    const closerName = data.closerName || getCashierDisplayName();
    const isDifferentUser = closerName && openerName && (closerName.trim().toLowerCase() !== openerName.trim().toLowerCase());
    const invoices = (data.invoices || []).slice(0, 20);

    let invoicesHtml = invoices.map(inv => {
        const timeStr = new Date(inv.issuedAt || inv.createdAt || inv.paidAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const tbl = inv.tableName || ('Bàn #' + (inv.tableId || '-'));
        const orderStaff = inv.orderStaffName ? ` (Order: ${escapeHtml(inv.orderStaffName)})` : '';
        return `
            <tr style="border-bottom: 1px dashed #eee; font-size: 11px;">
                <td style="padding: 3px 2px; text-align: left;">
                    #${inv.invoiceCode || inv.id} - ${tbl}<br>
                    <small style="color: #666;">${timeStr}${orderStaff}</small>
                </td>
                <td style="padding: 3px 2px; text-align: right; font-weight: bold; vertical-align: middle;">
                    ${Number(inv.totalAmount || inv.finalAmount || 0).toLocaleString('vi-VN')} ₫
                </td>
            </tr>
        `;
    }).join('');

    const html = `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <title>Báo Cáo Kết Ca - ${escapeHtml(openerName)}</title>
                <style>
                    @page { margin: 0; size: auto; }
                    body {
                        font-family: 'Courier New', Courier, monospace, sans-serif;
                        padding: 15px;
                        width: 320px;
                        margin: 0 auto;
                        color: #000;
                        font-size: 13px;
                        line-height: 1.35;
                        background: #fff;
                    }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .text-left { text-align: left; }
                    .header { text-align: center; margin-bottom: 8px; }
                    .brand-name { font-size: 18px; font-weight: 900; margin: 0; text-transform: uppercase; }
                    .brand-sub { font-size: 11px; margin: 3px 0 6px 0; color: #222; }
                    .title-box {
                        border-top: 1px dashed #000;
                        border-bottom: 1px dashed #000;
                        padding: 6px 0;
                        margin: 6px 0;
                    }
                    .bill-title { font-size: 16px; font-weight: 900; letter-spacing: 0.5px; margin: 0; text-transform: uppercase; }
                    .bill-notice { font-size: 11px; color: #333; margin: 2px 0 0 0; }
                    .meta-info { margin: 8px 0; font-size: 12px; text-align: left; }
                    .meta-info p { margin: 3px 0; }
                    .section-title {
                        font-size: 12px;
                        font-weight: 900;
                        border-top: 1px dashed #000;
                        padding-top: 5px;
                        margin: 8px 0 4px 0;
                        text-transform: uppercase;
                    }
                    table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 12px; }
                    th { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 2px; }
                    td { padding: 3px 2px; }
                    .total-box { margin-top: 6px; border-top: 1px dashed #000; padding-top: 6px; }
                    .total-row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 13px; }
                    .grand-total { font-size: 16px; font-weight: 900; border-top: 1px solid #000; padding-top: 6px; margin-top: 6px; }
                    .footer { text-align: center; margin-top: 12px; border-top: 1px dashed #000; padding-top: 8px; font-size: 11px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="brand-name">🍽️ NHÀ HÀNG THANH HÓA</div>
                    <div class="brand-sub">Đ/c: TP. Thanh Hóa • Hotline: 0988888888</div>
                    <div class="title-box">
                        <div class="bill-title">BÁO CÁO DOANH THU CA</div>
                        <div class="bill-notice">(PHIẾU BÀN GIAO KẾT CA THU NGÂN)</div>
                    </div>
                </div>

                <div class="meta-info">
                    <p><strong>Thu ngân trực ca:</strong> <span style="font-size: 14px; font-weight: 900;">${escapeHtml(openerName)}</span></p>
                    <p><strong>Người xác nhận kết ca:</strong> <span style="font-weight: 700;">${escapeHtml(closerName)}${isDifferentUser ? ' (Thao tác đóng ca)' : ''}</span></p>
                    <p><strong>Giờ vào ca:</strong> ${escapeHtml(startStr)}</p>
                    <p><strong>Giờ kết ca:</strong> ${escapeHtml(endStr)}</p>
                    <p><strong>Giờ in phiếu:</strong> ${escapeHtml(printTime)}</p>
                    <p><strong>Số HĐ đã thanh toán:</strong> ${data.count} hóa đơn</p>
                </div>

                <div class="total-box">
                    <div class="total-row grand-total">
                        <span>TỔNG THỰC THU CA:</span>
                        <span>${Number(data.totalRev).toLocaleString('vi-VN')} ₫</span>
                    </div>
                </div>

                <div class="section-title">1. ĐỐI SOÁT TIỀN KÉT & DOANH THU CA</div>
                <div style="display:flex; justify-content:space-between; margin:3px 0; font-size:12px;">
                    <span>• Tiền mặt trong két lúc mở ca (A):</span>
                    <strong style="color:#0284c7;">${Number(data.openingCash || 0).toLocaleString('vi-VN')} ₫</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin:3px 0; font-size:12px;">
                    <span>• Doanh thu Tiền mặt thu trong ca (B):</span>
                    <strong style="color:#d97706;">${Number(data.cashRev).toLocaleString('vi-VN')} ₫</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin:3px 0; font-size:12px;">
                    <span>• Doanh thu Chuyển khoản / QR:</span>
                    <strong style="color:#2563eb;">${Number(data.transferRev).toLocaleString('vi-VN')} ₫</strong>
                </div>
                <div style="border-top:1px dashed #000; margin: 4px 0;"></div>
                <div style="display:flex; justify-content:space-between; margin:3px 0; font-size:12.5px;">
                    <span>• TỔNG TIỀN MẶT TRONG KÉT (A + B):</span>
                    <strong style="font-weight:900;">${(Number(data.openingCash || 0) + Number(data.cashRev)).toLocaleString('vi-VN')} ₫</strong>
                </div>
                <div style="background: #f8f9fa; border: 1px solid #000; padding: 5px; margin-top: 6px; font-size: 12px;">
                    <strong>💵 TIỀN MẶT BÀN GIAO NỘP QUỸ (B):</strong>
                    <span style="float: right; font-weight: 900; font-size: 14px;">${Number(data.cashRev).toLocaleString('vi-VN')} ₫</span>
                    <div style="clear:both; font-size:10px; color:#555; margin-top:2px;">*(Đã trừ ${Number(data.openingCash || 0).toLocaleString('vi-VN')} ₫ tiền két giữ lại làm vốn ca sau)*</div>
                </div>

                ${invoicesHtml ? `
                <div class="section-title">2. HÓA ĐƠN TRONG CA (${invoices.length} HĐ gần nhất)</div>
                <table>
                    <thead>
                        <tr>
                            <th class="text-left">Mã HĐ / Bàn / Giờ</th>
                            <th class="text-right" style="width: 90px;">Tiền TT</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoicesHtml}
                    </tbody>
                </table>
                ` : ''}

                <div style="margin-top: 18px; border-top: 1px dashed #000; padding-top: 10px; display: flex; justify-content: space-between; text-align: center; font-size: 11px;">
                    <div style="width: 48%;">
                        <strong>THU NGÂN TRỰC CA</strong><br>
                        <em>(Ký & ghi họ tên)</em>
                        <br><br><br>
                        <strong>${escapeHtml(openerName)}</strong>
                    </div>
                    <div style="width: 48%;">
                        <strong>NGƯỜI XÁC NHẬN KẾT CA</strong><br>
                        <em>(Ký & ghi họ tên)</em>
                        <br><br><br>
                        <strong>${escapeHtml(closerName)}</strong>
                    </div>
                </div>

                <div class="footer">
                    <p style="margin: 3px 0; font-weight: bold; font-size: 11px;">*** BÁO CÁO KẾT CA THU NGÂN ***</p>
                    <p style="margin: 2px 0;">Phần mềm Quản lý Nhà hàng Thanh Hóa</p>
                </div>
            </body>
        </html>
    `;

    const printWin = window.open('', '', 'height=680,width=420');
    if (printWin) {
        printWin.document.write(html);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
            printWin.print();
            printWin.close();
        }, 500);
    } else {
        alert("Vui lòng cho phép popup để in phiếu kết ca!");
    }
};

try {
    const shiftBc = new BroadcastChannel('shift_sync_channel');
    shiftBc.onmessage = (event) => {
        if (event && event.data) {
            if (event.data.activeShiftsMap) {
                try {
                    localStorage.setItem('activeCashierShifts_map', JSON.stringify(event.data.activeShiftsMap));
                } catch(e) {}
            }
            if (event.data.type === 'SHIFT_CLOSED') {
                performLocalShiftCloseOrder({
                    c: event.data.cashierName,
                    cb: event.data.closedBy,
                    st: 'CLOSED'
                });
            } else if (event.data.type === 'SHIFT_OPENED') {
                if (typeof syncCurrentCashierDrawerCash === 'function') {
                    syncCurrentCashierDrawerCash();
                }
            }
        }
    };
} catch(e) {}
