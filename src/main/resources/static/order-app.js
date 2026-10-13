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
        
        // Auto-load from URL if coming from pos-tables.html
        const urlParams = new URLSearchParams(window.location.search);
        const urlTableId = parseInt(urlParams.get('tableId'));
        const urlOrderId = parseInt(urlParams.get('orderId'));
        
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

        // Ẩn sạch tham số tableId và orderId trên thanh địa chỉ URL để bảo mật
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

    if (isCashierOrAdmin && currentTable.id) {
        checkTableFutureReservations(currentTable.id);
    }
}

async function checkTableFutureReservations(tableId) {
    try {
        const res = await fetchWithAuth('/reservations/all');
        const allRes = res.data || [];
        const tableResList = allRes.filter(r => r.tableId === tableId && r.status !== 'CANCELLED' && r.status !== 'COMPLETED');
        const btnOrderViewFutureRes = document.getElementById('btnOrderViewFutureRes');
        if (btnOrderViewFutureRes && tableResList.length > 0) {
            btnOrderViewFutureRes.style.display = 'inline-flex';
            
            // Kiểm tra xem có ca nào sắp tới trong vòng 60 phút không
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

async function setupAuthUI() {
    let fullName = localStorage.getItem('userFullName');
    const email = localStorage.getItem('userEmail');
    const userId = localStorage.getItem('userId');

    if (!fullName && userId) {
        try {
            const uRes = await fetchWithAuth(`/users/${userId}`);
            if (uRes && uRes.data && uRes.data.fullName) {
                fullName = uRes.data.fullName;
                localStorage.setItem('userFullName', fullName);
            }
        } catch(e) {}
    }

    const badge = document.getElementById('auth-email-badge');
    if (badge) {
        badge.innerText = `👤 ${fullName || email || 'Nhân viên'}`;
    }
}

window.logout = function(e) {
    if(e) e.preventDefault();
    if(confirm("Bạn có chắc chắn muốn đăng xuất?")) {
        localStorage.clear();
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

        // Kiểm tra số lượng đã chọn trong giỏ hàng hiện tại
        const inCartItem = cartItems.find(it => it.productId === p.id);
        const qtyInCart = inCartItem ? inCartItem.quantity : 0;
        const isCookingOrReady = inCartItem && (inCartItem.status === 'PREPARING' || inCartItem.status === 'READY');

        let actionHtml = '';
        if (qtyInCart > 0) {
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
            // Tăng số lượng
            await changeItemQty(existingItem.id, product.id, 1);
        } else {
            // Popup SweetAlert2 nhập ghi chú to rõ, sang trọng
            const { value: note, isConfirmed } = await Swal.fire({
                title: `<span style="font-size: 24px; color: #222;">📝 Ghi Chú Món Ăn</span>`,
                html: `
                    <div style="text-align: left; margin: 15px 0;">
                        <div style="font-size: 19px; font-weight: bold; color: #d10024; margin-bottom: 6px;">
                            ${escapeHtml(product.name)}
                        </div>
                        <div style="font-size: 14px; color: #666; margin-bottom: 12px;">
                            Nhập yêu cầu chế biến của khách hoặc chọn nhanh bên dưới:
                        </div>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
                            <span class="badge" style="background: #eee; color: #333; font-size: 13px; padding: 7px 12px; cursor: pointer; border-radius: 6px;" onclick="document.querySelector('.swal2-input').value = (document.querySelector('.swal2-input').value + ' Ít cay').trim()">🌶️ Ít cay</span>
                            <span class="badge" style="background: #eee; color: #333; font-size: 13px; padding: 7px 12px; cursor: pointer; border-radius: 6px;" onclick="document.querySelector('.swal2-input').value = (document.querySelector('.swal2-input').value + ' Không hành').trim()">🧅 Không hành</span>
                            <span class="badge" style="background: #eee; color: #333; font-size: 13px; padding: 7px 12px; cursor: pointer; border-radius: 6px;" onclick="document.querySelector('.swal2-input').value = (document.querySelector('.swal2-input').value + ' Mang về').trim()">🥡 Mang về</span>
                            <span class="badge" style="background: #eee; color: #333; font-size: 13px; padding: 7px 12px; cursor: pointer; border-radius: 6px;" onclick="document.querySelector('.swal2-input').value = (document.querySelector('.swal2-input').value + ' Làm nóng').trim()">🔥 Làm nóng</span>
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
        }
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
                    </div>
                    ${item.note ? `<div class="cart-item-note"><i class="fa fa-comment-dots me-1"></i>${escapeHtml(item.note)}</div>` : ''}
                    <div class="cart-item-price">${sub.toLocaleString()} ₫ <span style="color:#888; font-size:11px; font-weight:normal;">(${price.toLocaleString()} ₫/phần)</span></div>
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
    document.getElementById('checkoutUserName').innerText = currentOrder.username || 'Nhân viên';
    
    let html = '';
    let total = 0;
    cartItems.forEach(item => {
        const p = item.product || productsData.find(prod => prod.id === item.productId) || {};
        const price = p.price || item.unitPrice || 0;
        total += price * item.quantity;
        html += `<div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:14px;">
                    <span>${item.quantity}x ${p.name || 'Món ăn'}</span>
                    <span>${(price * item.quantity).toLocaleString()} ₫</span>
                 </div>`;
    });
    
    // Tiền cọc trước
    window.currentDepositAmount = 0;
    if (currentOrder.note && currentOrder.note.includes('Đã cọc:')) {
        const match = currentOrder.note.match(/Đã cọc:\s*(\d+)/);
        if (match && match[1]) {
            window.currentDepositAmount = parseInt(match[1]);
            html += `<hr style="margin:5px 0;">
                     <div style="display:flex; justify-content:space-between; color: #17a2b8; font-weight:bold; font-size:14px;">
                        <span>Tiền đã cọc trước</span>
                        <span>- ${window.currentDepositAmount.toLocaleString()} ₫</span>
                     </div>`;
        }
    }
    
    let finalTotal = total - window.currentDepositAmount;
    if (finalTotal < 0) finalTotal = 0;
    
    document.getElementById('checkoutSummary').innerHTML = html;
    document.getElementById('checkoutTotal').innerText = `THỰC THU: ${finalTotal.toLocaleString()} VNĐ`;
    
    $('#checkoutModal').modal('show');
};

window.confirmCheckout = async function() {
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    try {
        // 1. Tạo Invoice cho Order này
        const invRes = await fetchWithAuth(`/invoices/add`, {
            method: 'POST',
            body: JSON.stringify({
                orderId: currentOrder.id,
                discountPercent: 0,
                discountAmount: window.currentDepositAmount || 0
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
            timer: 2000,
            showConfirmButton: false
        });
        
        printInvoice(inv);
        
    } catch(err) {
        Swal.fire({
            icon: 'error',
            title: 'Lỗi thanh toán',
            text: err.message,
            confirmButtonColor: '#d10024'
        });
    }
};

function printInvoice(inv) {
    let itemsHtml = (inv.items || inv.invoiceItems || []).map((it, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${escapeHtml(it.productName || (it.product ? it.product.name : 'Món'))}</strong></td>
            <td style="text-align: right;">${(it.unitPrice || it.price || 0).toLocaleString()} ₫</td>
            <td style="text-align: center;">${it.quantity || 1}</td>
            <td style="text-align: right;"><strong>${(it.totalPrice || it.subtotal || 0).toLocaleString()} ₫</strong></td>
        </tr>
    `).join('');

    const html = `
        <html>
            <head>
                <title>In Hóa Đơn #${inv.invoiceCode || inv.id}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; color: #333; font-size: 14px; }
                    .invoice-header { text-align: center; margin-bottom: 20px; }
                    .invoice-info { margin-bottom: 20px; }
                    .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    .table th, .table td { border: 1px solid #ddd; padding: 8px; }
                    .text-end { text-align: right; }
                    .text-center { text-align: center; }
                </style>
            </head>
            <body>
                <div class="invoice-header">
                    <h2>🍽️ NHÀ HÀNG THANH HÓA</h2>
                    <p>HÓA ĐƠN THANH TOÁN</p>
                    <hr>
                </div>
                <div class="invoice-info">
                    <p><strong>Mã Hóa đơn:</strong> #${inv.invoiceCode || inv.id}</p>
                    <p><strong>Bàn:</strong> ${inv.tableName || ('Bàn ' + (inv.tableId || '-'))}</p>
                    <p><strong>Khách hàng:</strong> ${inv.customerName || 'Khách vãng lai'}</p>
                    <p><strong>Thời gian:</strong> ${new Date(inv.issuedAt || inv.paidAt || inv.createdAt || Date.now()).toLocaleString('vi-VN')}</p>
                    <p><strong>Phương thức TT:</strong> ${inv.paymentMethod || 'Tiền mặt'}</p>
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Món ăn</th>
                            <th class="text-end">Đơn giá</th>
                            <th class="text-center">SL</th>
                            <th class="text-end">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="4" class="text-end"><strong>TỔNG TIỀN:</strong></td>
                            <td class="text-end"><strong>${(inv.subtotal || 0).toLocaleString()} ₫</strong></td>
                        </tr>
                        ${inv.discountAmount && inv.discountAmount > 0 ? `
                        <tr>
                            <td colspan="4" class="text-end" style="color:#17a2b8;"><strong>ĐÃ CỌC TRƯỚC:</strong></td>
                            <td class="text-end" style="color:#17a2b8;"><strong>- ${(inv.discountAmount).toLocaleString()} ₫</strong></td>
                        </tr>` : ''}
                        <tr>
                            <td colspan="4" class="text-end"><strong>THỰC THU:</strong></td>
                            <td class="text-end" style="color: #D10024; font-size: 16px;"><strong>${(inv.finalAmount || inv.totalAmount || 0).toLocaleString()} ₫</strong></td>
                        </tr>
                    </tfoot>
                </table>
                <br><br>
                <div class="text-center">
                    <p>Cảm ơn quý khách và hẹn gặp lại!</p>
                </div>
            </body>
        </html>
    `;
    const printWindow = window.open('', '', 'height=650,width=800');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
        window.location.href = "/pos-tables.html";
    }, 500);
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
    const cashierName = localStorage.getItem('userFullName') || localStorage.getItem('userName') || localStorage.getItem('userEmail') || currentOrder.username || 'Thu ngân';
    const orderCode = currentOrder.orderCode || currentOrder.id;
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

    let finalTotal = total - depositAmount;
    if (finalTotal < 0) finalTotal = 0;

    const printTimeStr = new Date().toLocaleString('vi-VN');

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
                    <div class="brand-sub">Đ/c: TP. Thanh Hóa • Hotline: 0988.xxx.xxx</div>
                    <div class="title-box">
                        <div class="bill-title">PHIẾU TẠM TÍNH</div>
                        <div class="bill-notice">(Quý khách vui lòng kiểm tra món trước khi thanh toán)</div>
                    </div>
                </div>

                <div class="meta-info">
                    <p><strong>Bàn:</strong> <span style="font-size: 15px; font-weight: 900;">${tblName}</span></p>
                    <p><strong>Mã Order:</strong> #${orderCode}</p>
                    <p><strong>Khách hàng:</strong> ${customerName}</p>
                    <p><strong>Thu ngân:</strong> ${cashierName}</p>
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

document.addEventListener('DOMContentLoaded', () => {
    loadInitialData();
    startOrderRealtimeSync();
});
