/**
 * Admin Restaurant Management System
 * Core Frontend JavaScript for Admin Dashboard
 */

// Helper: Toast / Alert notification
function showAlert(message, type = 'success') {
    const alertBox = document.getElementById('adminAlert');
    if (alertBox) {
        alertBox.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
        alertBox.querySelector('.alert-message').textContent = message;
        alertBox.classList.remove('d-none');
        setTimeout(() => {
            alertBox.classList.add('d-none');
        }, 5000);
    } else {
        alert(message);
    }
}

// Helper: Parse JWT Payload
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// Helper: Currency Formatter
function formatMoney(amount) {
    if (amount === undefined || amount === null) return "0 ₫";
    return Number(amount).toLocaleString('vi-VN') + " ₫";
}

// Helper: Date Formatter
function formatDate(dateStr) {
    if (!dateStr) return "-";
    if (Array.isArray(dateStr)) {
        const y = dateStr[0];
        const m = (dateStr[1] || 1) - 1;
        const d = dateStr[2] || 1;
        const h = dateStr[3] || 0;
        const min = dateStr[4] || 0;
        const s = dateStr[5] || 0;
        const dt = new Date(y, m, d, h, min, s);
        return isNaN(dt.getTime()) ? dateStr.join('-') : dt.toLocaleString('vi-VN');
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString('vi-VN');
}

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

// Helper: HTML Escape
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Helper: Pagination
const paginationState = {
    users: { page: 1, size: 10 },
    categories: { page: 1, size: 10 },
    products: { page: 1, size: 10 },
    tables: { page: 1, size: 10 },
    orders: { page: 1, size: 10 },
    invoices: { page: 1, size: 10 },
    reportsDate: { page: 1, size: 10 },
    reportsStaff: { page: 1, size: 10 },
    reportsPayment: { page: 1, size: 10 },
    reportsItems: { page: 1, size: 10 }
};

function renderPaginationControls(containerId, totalItems, type, renderCallbackName) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const state = paginationState[type];
    const totalPages = Math.ceil(totalItems / state.size);
    if (state.page > totalPages && totalPages > 0) state.page = totalPages;
    if (state.page < 1) state.page = 1;

    if (totalItems === 0) {
        container.innerHTML = '';
        return;
    }

    let html = `<ul class="pagination justify-content-center mt-3">`;
    
    // Prev
    html += `<li class="page-item ${state.page === 1 ? 'disabled' : ''}">
                <a class="page-link" href="javascript:void(0);" onclick="event.preventDefault(); changePage('${type}', ${state.page - 1}, ${renderCallbackName})">Trang trước</a>
             </li>`;
             
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${i === state.page ? 'active' : ''}">
                    <a class="page-link" href="javascript:void(0);" onclick="event.preventDefault(); changePage('${type}', ${i}, ${renderCallbackName})">${i}</a>
                 </li>`;
    }
    
    // Next
    html += `<li class="page-item ${state.page === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="javascript:void(0);" onclick="event.preventDefault(); changePage('${type}', ${state.page + 1}, ${renderCallbackName})">Trang sau</a>
             </li>`;
             
    html += `</ul>`;
    container.innerHTML = html;
}

window.changePage = function(type, newPage, renderCallback) {
    paginationState[type].page = newPage;
    if (typeof renderCallback === 'function') {
        renderCallback();
    }
};

// -------------------------------------------------------------
// 1. JWT AUTHENTICATION & GUARD
// -------------------------------------------------------------
function clearAdminAuthSession() {
    const authKeys = ['token', 'userRole', 'userRoles', 'role', 'userEmail', 'userId', 'userFullName', 'userName'];
    authKeys.forEach(k => localStorage.removeItem(k));
}

function checkAdminAuth() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/login";
        return false;
    }

    const payload = parseJwt(token);
    if (!payload) {
        clearAdminAuthSession();
        window.location.href = "/login";
        return false;
    }

    // Check Token Expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
        clearAdminAuthSession();
        window.location.href = "/login";
        return false;
    }

    // Check ADMIN Role
    const roles = payload.roles || [];
    const isAdmin = roles.includes("ROLE_ADMIN") || roles.includes("ADMIN");

    if (!isAdmin) {
        alert("Bạn không có quyền ADMIN để truy cập trang quản trị!");
        clearAdminAuthSession();
        window.location.href = "/login";
        return false;
    }

    let userNameDisplay = localStorage.getItem("userFullName");
    const userId = localStorage.getItem("userId");
    if (!userNameDisplay && userId) {
        fetchWithAuth(`/api/v1/users/${userId}`).then(res => {
            if (res && res.data && res.data.fullName) {
                localStorage.setItem("userFullName", res.data.fullName);
                const h = document.getElementById("headerUserName");
                const s = document.getElementById("sidebarUserName");
                if (h) h.textContent = res.data.fullName;
                if (s) s.textContent = res.data.fullName;
            }
        }).catch(e => {});
    }

    if (!userNameDisplay) {
        userNameDisplay = payload.sub || localStorage.getItem("userEmail") || "Quản trị viên";
    }

    const headerUserName = document.getElementById("headerUserName");
    const sidebarUserName = document.getElementById("sidebarUserName");

    if (headerUserName) headerUserName.textContent = userNameDisplay;
    if (sidebarUserName) sidebarUserName.textContent = userNameDisplay;

    return true;
}

// Helper: Lấy tên hiển thị thu ngân / nhân viên thực tế (không lấy Role hoặc Administrator)
function getCashierDisplayNameAdmin(name) {
    if (name && !name.toUpperCase().startsWith('ROLE_') && name.toUpperCase() !== 'ADMIN' && name.toUpperCase() !== 'CASHIER' && name.toUpperCase() !== 'ADMINISTRATOR') {
        return name.trim();
    }
    let uName = localStorage.getItem('userFullName');
    if (uName && !uName.toUpperCase().startsWith('ROLE_') && uName.toUpperCase() !== 'ADMIN' && uName.toUpperCase() !== 'CASHIER' && uName.toUpperCase() !== 'ADMINISTRATOR') {
        return uName.trim();
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

// Execute Auth Guard Immediately
checkAdminAuth();

function logout() {
    if (confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống admin?")) {
        // Chỉ xóa token và thông tin phiên đăng nhập, BẢO TỒN toàn bộ lịch sử ca làm việc đã kết thúc và ca đang mở
        clearAdminAuthSession();
        window.location.href = "/login";
    }
}

// -------------------------------------------------------------
// 2. FETCH WITH AUTH INTERCEPTOR
// -------------------------------------------------------------
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/login";
        throw new Error("Chưa đăng nhập");
    }

    options.headers = options.headers || {};
    if (!(options.body instanceof FormData)) {
        options.headers["Content-Type"] = options.headers["Content-Type"] || "application/json";
    }
    options.headers["Authorization"] = `Bearer ${token}`;

    try {
        const response = await fetch(url, options);

        if (response.status === 401 || response.status === 403) {
            alert("Phiên làm việc hết hạn hoặc bạn không có quyền thực hiện thao tác này.");
            const keysToKeep = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && (k.startsWith('activeCashierShift') || k.startsWith('shiftOpening') || k === 'loginTime' || k === 'cashierLoginTime')) {
                    keysToKeep.push({ key: k, val: localStorage.getItem(k) });
                }
            }
            localStorage.clear();
            keysToKeep.forEach(item => localStorage.setItem(item.key, item.val));
            window.location.href = "/login";
            throw new Error("Unauthorized");
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `Lỗi yêu cầu (${response.status})`);
        }
        return data;
    } catch (err) {
        console.error("API Error:", url, err);
        throw err;
    }
}

// -------------------------------------------------------------
// 3. TAB NAVIGATION
// -------------------------------------------------------------
let currentTab = "dashboard";

window.showTab = function(tabName, updateUrl = true, e = null) {
    if (e && e.preventDefault) e.preventDefault();
    if (window.event && window.event.preventDefault) window.event.preventDefault();

    currentTab = tabName;

    document.querySelectorAll('.tab-content-section').forEach(sec => sec.classList.add('d-none'));
    document.querySelectorAll('.sidebar .nav-item').forEach(item => item.classList.remove('active'));

    const targetSec = document.getElementById(`tab-${tabName}`);
    if (targetSec) {
        targetSec.classList.remove('d-none');
    }

    const targetNav = document.getElementById(`nav-${tabName}`);
    if (targetNav) {
        targetNav.classList.add('active');
    }

    if (updateUrl && window.history && window.history.replaceState) {
        const newPath = tabName === 'dashboard' ? '/admin' : `/admin/${tabName}`;
        window.history.replaceState(null, '', newPath);
    }

    switch (tabName) {
        case 'dashboard': loadDashboard(); break;
        case 'users': loadUsers(); break;
        case 'categories': loadCategories(); break;
        case 'products': loadProducts(); break;
        case 'tables': loadTables(); break;
        case 'orders': loadOrders(); break;
        case 'invoices': loadInvoices(); break;
        case 'reports': loadReports(); break;
        default: loadDashboard();
    }
};

// -------------------------------------------------------------
// 4. MODULE 1: DASHBOARD OVERVIEW
// -------------------------------------------------------------
async function loadDashboard() {
    try {
        // Load Revenue Today directly from paid invoices
        try {
            const invRes = await fetchWithAuth('/api/v1/invoices/all');
            const allInvoices = (invRes && invRes.data) ? invRes.data : [];
            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
            
            let todayRev = 0;
            allInvoices.forEach(inv => {
                if (inv.status === 'PAID') {
                    const d = new Date(inv.paidAt || inv.issuedAt || inv.createdAt);
                    if (!isNaN(d.getTime())) {
                        const invDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                        if (invDate === todayStr) {
                            todayRev += Number(inv.totalAmount || inv.finalAmount || 0);
                        }
                    }
                }
            });
            const todayRevEl = document.getElementById('todayRevenue');
            if (todayRevEl) todayRevEl.textContent = formatMoney(todayRev);
        } catch (e) {
            console.warn("Revenue today error:", e.message);
        }

        // Load Orders Today & Recent Orders
        try {
            const orderRes = await fetchWithAuth('/api/v1/orders/all');
            if (orderRes && orderRes.data) {
                const orders = orderRes.data || [];
                document.getElementById('todayOrders').textContent = orders.length;

                const recentList = orders.slice(-5).reverse();
                const tbody = document.getElementById('recentOrders');
                if (tbody) {
                    if (recentList.length === 0) {
                        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Chưa có đơn hàng nào</td></tr>`;
                    } else {
                        tbody.innerHTML = recentList.map(o => `
                            <tr>
                                <td><strong>#${o.orderCode || o.id}</strong></td>
                                <td>${o.tableName || ('Bàn ' + (o.tableId || '-'))}</td>
                                <td>${o.userName || 'Nhân viên'}</td>
                                <td class="text-success font-weight-bold">${formatMoney(o.subtotal)}</td>
                                <td><span class="badge ${getOrderBadgeClass(o.status)}">${translateOrderStatus(o.status)}</span></td>
                                <td>${formatDate(o.createdAt || o.orderDate)}</td>
                            </tr>
                        `).join('');
                    }
                }
            }
        } catch (e) {
            console.warn("Orders dashboard error:", e.message);
        }

        // Load Active Tables Count
        try {
            const tableRes = await fetchWithAuth('/api/v1/tables');
            if (tableRes && tableRes.data) {
                const tables = tableRes.data || [];
                const activeCount = tables.filter(t => t.status === 'OCCUPIED' || t.status === 'BUSY').length;
                document.getElementById('activeTables').textContent = activeCount;
                document.getElementById('totalTablesCount').textContent = `${tables.length} bàn`;
            }
        } catch (e) {
            console.warn("Tables dashboard error:", e.message);
        }

        // Load Products Count
        try {
            const prodRes = await fetchWithAuth('/api/v1/products/all');
            if (prodRes && prodRes.data) {
                const products = prodRes.data || [];
                document.getElementById('totalProductsCount').textContent = `${products.length} món`;
            }
        } catch (e) {
            console.warn("Products dashboard error:", e.message);
        }

        // Load Staff Count
        try {
            const userRes = await fetchWithAuth('/api/v1/users/all');
            if (userRes && userRes.data) {
                document.getElementById('totalStaffCount').textContent = `${userRes.data.length} nhân sự`;
            }
        } catch (e) {
            console.warn("Users count error:", e.message);
        }

    } catch (err) {
        console.error("Dashboard error:", err);
    }
}

// -------------------------------------------------------------
// 5. MODULE 2: USER MANAGEMENT
// -------------------------------------------------------------
let allUsersData = [];

async function loadUsers() {
    try {
        const res = await fetchWithAuth('/api/v1/users/all');
        allUsersData = res.data || [];
        renderUsersTable(allUsersData);
    } catch (err) {
        showAlert("Không thể tải danh sách tài khoản: " + err.message, "error");
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Không tìm thấy tài khoản nào</td></tr>`;
        renderPaginationControls('usersPagination', 0, 'users', 'filterUsersByRole');
        return;
    }

    const state = paginationState.users;
    const paginatedData = users.slice((state.page - 1) * state.size, state.page * state.size);

    tbody.innerHTML = paginatedData.map((u, index) => {
        const roleName = u.roleName || (u.role ? u.role.name : 'ROLE_USER');
        const globalIndex = (state.page - 1) * state.size + index + 1;
        return `
        <tr>
            <td>${globalIndex}</td>
            <td><strong>${u.fullName || u.username || 'Chưa cập nhật'}</strong></td>
            <td>${u.email || '-'}</td>
            <td>${u.phone || '-'}</td>
            <td><span class="badge ${getRoleBadgeClass(roleName)}">${roleName.replace('ROLE_', '')}</span></td>
            <td><span class="badge ${u.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}">${u.status || 'ACTIVE'}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${u.id})">
                    <i class="mdi mdi-delete"></i> Xóa
                </button>
            </td>
        </tr>
        `;
    }).join('');
    
    renderPaginationControls('usersPagination', users.length, 'users', 'filterUsersByRole');
}

window.filterUsersByRole = function(resetPage = false) {
    if (resetPage === true) {
        paginationState.users.page = 1;
    }
    const role = document.getElementById('userRoleFilter').value;
    if (!role) {
        renderUsersTable(allUsersData);
    } else {
        const filtered = allUsersData.filter(u => {
            const r = u.roleName || (u.role ? u.role.name : '');
            return r === role || r === `ROLE_${role}`;
        });
        renderUsersTable(filtered);
    }
}

async function handleCreateUser(e) {
    e.preventDefault();
    const form = e.target;
    const body = {
        fullName: form.fullName.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        password: form.password.value,
        role: form.role.value
    };

    try {
        const res = await fetchWithAuth('/api/v1/auth/create-user', {
            method: 'POST',
            body: JSON.stringify(body)
        });
        showAlert(res.message || "Tạo tài khoản thành công!", "success");
        form.reset();
        $('#createUserModal').modal('hide');
        loadUsers();
    } catch (err) {
        showAlert("Tạo tài khoản thất bại: " + err.message, "error");
    }
}

async function deleteUser(id) {
    if (!confirm("Bạn có chắc muốn xóa tài khoản này?")) return;
    try {
        await fetchWithAuth(`/api/v1/users/${id}`, { method: 'DELETE' });
        showAlert("Xóa tài khoản thành công!", "success");
        loadUsers();
    } catch (err) {
        showAlert("Xóa tài khoản thất bại: " + err.message, "error");
    }
}

// -------------------------------------------------------------
// 6. MODULE 3: CATEGORY MANAGEMENT (FIXED BACKEND CONTRACT)
// -------------------------------------------------------------
let allCategoriesData = [];

async function loadCategories() {
    try {
        const res = await fetchWithAuth('/api/v1/categories/all');
        allCategoriesData = res.data || [];
        renderCategoriesTable(allCategoriesData);
    } catch (err) {
        showAlert("Không thể tải danh sách danh mục: " + err.message, "error");
    }
}

function renderCategoriesTable(categories) {
    const tbody = document.getElementById('categoriesTableBody');
    if (!tbody) return;

    if (categories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Chưa có danh mục nào</td></tr>`;
        renderPaginationControls('categoriesPagination', 0, 'categories', 'renderCategoriesWrapper');
        return;
    }

    const state = paginationState.categories;
    const paginatedData = categories.slice((state.page - 1) * state.size, state.page * state.size);

    tbody.innerHTML = paginatedData.map((c, idx) => `
        <tr>
            <td>${(state.page - 1) * state.size + idx + 1}</td>
            <td><strong>${escapeHtml(c.name)}</strong></td>
            <td>${escapeHtml(c.description || 'Không có mô tả')}</td>
            <td>
                <button class="btn btn-sm btn-outline-warning me-1" onclick="editCategory(${c.id}, '${escapeHtml(c.name)}', '${escapeHtml(c.description || '')}')">
                    <i class="mdi mdi-pencil"></i> Sửa
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${c.id})">
                    <i class="mdi mdi-delete"></i> Xóa
                </button>
            </td>
        </tr>
    `).join('');
    
    renderPaginationControls('categoriesPagination', categories.length, 'categories', 'renderCategoriesWrapper');
}

window.renderCategoriesWrapper = function() {
    renderCategoriesTable(allCategoriesData);
}

function openAddCategoryModal() {
    document.getElementById('categoryId').value = '';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryModalTitle').textContent = 'Thêm danh mục mới';
    $('#categoryModal').modal('show');
}

function editCategory(id, name, description) {
    document.getElementById('categoryId').value = id;
    document.getElementById('categoryName').value = name;
    document.getElementById('categoryDescription').value = description;
    document.getElementById('categoryModalTitle').textContent = 'Chỉnh sửa danh mục';
    $('#categoryModal').modal('show');
}

async function handleSaveCategory(e) {
    e.preventDefault();
    const id = document.getElementById('categoryId').value;
    const nameVal = document.getElementById('categoryName').value.trim();
    const descVal = document.getElementById('categoryDescription').value.trim();

    if (!nameVal) {
        showAlert("Tên danh mục không được để trống!", "error");
        return;
    }

    const body = {
        name: nameVal,
        description: descVal
    };

    const isEdit = !!id;
    const url = isEdit ? `/api/v1/categories/${id}` : '/api/v1/categories';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetchWithAuth(url, {
            method: method,
            body: JSON.stringify(body)
        });
        showAlert(res.message || "Lưu danh mục thành công!", "success");
        $('#categoryModal').modal('hide');
        loadCategories();
    } catch (err) {
        showAlert("Lưu danh mục thất bại: " + err.message, "error");
    }
}

async function deleteCategory(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa danh mục này?")) return;
    try {
        await fetchWithAuth(`/api/v1/categories/${id}`, { method: 'DELETE' });
        showAlert("Xóa danh mục thành công!", "success");
        loadCategories();
    } catch (err) {
        showAlert("Xóa danh mục thất bại: " + err.message, "error");
    }
}

// -------------------------------------------------------------
// 7. MODULE 4: PRODUCT / MENU MANAGEMENT
// -------------------------------------------------------------
let allProductsData = [];

async function loadProducts() {
    try {
        if (allCategoriesData.length === 0) {
            const catRes = await fetchWithAuth('/api/v1/categories/all');
            allCategoriesData = catRes.data || [];
        }
        populateCategorySelects();

        const res = await fetchWithAuth('/api/v1/products/all');
        allProductsData = res.data || [];
        renderProductsTable(allProductsData);
    } catch (err) {
        showAlert("Không thể tải danh sách món ăn: " + err.message, "error");
    }
}

function populateCategorySelects() {
    const filterSelect = document.getElementById('productCategoryFilter');
    const formSelect = document.getElementById('productCategorySelect');

    const optionsHtml = allCategoriesData.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    if (filterSelect) {
        filterSelect.innerHTML = `<option value="">Tất cả danh mục</option>` + optionsHtml;
    }
    if (formSelect) {
        formSelect.innerHTML = `<option value="">-- Chọn danh mục --</option>` + optionsHtml;
    }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Chưa có món ăn nào</td></tr>`;
        renderPaginationControls('productsPagination', 0, 'products', 'filterProducts');
        return;
    }

    const state = paginationState.products;
    const paginatedData = products.slice((state.page - 1) * state.size, state.page * state.size);

    tbody.innerHTML = paginatedData.map((p, idx) => {
        const catName = p.categoryName || (p.category ? p.category.name : '-');
        let imgUrl = p.imageUrl || p.image;
        if (imgUrl) {
            if (!imgUrl.startsWith("http")) {
                imgUrl = imgUrl.startsWith("/uploads") ? imgUrl : "/uploads/" + imgUrl.split("/").pop(); 
            }
        } else {
            imgUrl = "https://via.placeholder.com/50?text=Food";
        }
        return `
        <tr>
            <td>${(state.page - 1) * state.size + idx + 1}</td>
            <td>
                <img src="${imgUrl}" alt="${p.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;" onerror="this.src='https://via.placeholder.com/50?text=Food'">
            </td>
            <td><strong>${p.name}</strong></td>
            <td><span class="badge bg-light text-dark border">${catName}</span></td>
            <td class="text-success font-weight-bold">${formatMoney(p.price)}</td>
            <td><span class="badge ${p.status === 'AVAILABLE' ? 'bg-success' : 'bg-danger'}">${p.status === 'AVAILABLE' ? 'Đang bán' : 'Hết hàng'}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-warning me-1" onclick="editProduct(${p.id})">
                    <i class="mdi mdi-pencil"></i> Sửa
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${p.id})">
                    <i class="mdi mdi-delete"></i> Xóa
                </button>
            </td>
        </tr>
        `;
    }).join('');
    
    renderPaginationControls('productsPagination', products.length, 'products', 'filterProducts');
}

window.filterProducts = function(resetPage = false) {
    if (resetPage === true) {
        paginationState.products.page = 1;
    }
    const catId = document.getElementById('productCategoryFilter').value;
    const keyword = document.getElementById('productSearchInput').value.toLowerCase().trim();

    let filtered = allProductsData;

    if (catId) {
        filtered = filtered.filter(p => (p.categoryId == catId || (p.category && p.category.id == catId)));
    }
    if (keyword) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(keyword));
    }

    renderProductsTable(filtered);
}

function openAddProductModal() {
    document.getElementById('productId').value = '';
    document.getElementById('productForm').reset();
    document.getElementById('productModalTitle').textContent = 'Thêm món ăn mới';
    $('#productModal').modal('show');
}

function editProduct(id) {
    const prod = allProductsData.find(p => p.id == id);
    if (!prod) return;

    document.getElementById('productId').value = prod.id;
    document.getElementById('productName').value = prod.name;
    document.getElementById('productPrice').value = prod.price;
    document.getElementById('productDescription').value = prod.description || '';
    document.getElementById('productCategorySelect').value = prod.categoryId || (prod.category ? prod.category.id : '');
    document.getElementById('productStatusSelect').value = prod.status || 'AVAILABLE';

    document.getElementById('productModalTitle').textContent = 'Chỉnh sửa món ăn';
    $('#productModal').modal('show');
}

async function handleSaveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('productId').value;
    const isEdit = !!id;

    const formData = new FormData();
    formData.append('name', document.getElementById('productName').value.trim());
    formData.append('price', document.getElementById('productPrice').value);
    formData.append('description', document.getElementById('productDescription').value.trim());
    formData.append('categoryId', document.getElementById('productCategorySelect').value);
    formData.append('status', document.getElementById('productStatusSelect').value);

    const imageFile = document.getElementById('productImageInput').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    const url = isEdit ? `/api/v1/products/${id}` : '/api/v1/products/add';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetchWithAuth(url, {
            method: method,
            body: formData
        });
        showAlert(res.message || "Lưu món ăn thành công!", "success");
        $('#productModal').modal('hide');
        loadProducts();
    } catch (err) {
        showAlert("Lưu món ăn thất bại: " + err.message, "error");
    }
}

async function deleteProduct(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa món ăn này?")) return;
    try {
        await fetchWithAuth(`/api/v1/products/${id}`, { method: 'DELETE' });
        showAlert("Xóa món ăn thành công!", "success");
        loadProducts();
    } catch (err) {
        showAlert("Xóa món ăn thất bại: " + err.message, "error");
    }
}

// -------------------------------------------------------------
// 8. MODULE 5: TABLE MANAGEMENT (FIXED TABLE NAME & CAPACITY FIELD CONTRACT)
// -------------------------------------------------------------
let allTablesData = [];
let allReservationsData = [];

async function updateTableStatusSilently(id, newStatus) {
    try {
        await fetchWithAuth(`/api/v1/tables/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
    } catch (e) {
        console.warn('Silent table status update failed:', e);
    }
}

async function loadTables() {
    try {
        const [res, orderRes, resvRes] = await Promise.all([
            fetchWithAuth('/api/v1/tables'),
            fetchWithAuth('/api/v1/orders/all'),
            fetchWithAuth('/api/v1/reservations/all')
        ]);
        allTablesData = res.data || [];
        allOrdersData = orderRes.data || [];
        allReservationsData = resvRes.data || [];

        // Tự động đồng bộ lên DB:
        const todayStr = new Date().toISOString().split('T')[0];
        allTablesData.forEach(t => {
            const hasActiveOrder = (allOrdersData || []).some(o => o.tableId === t.id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
            const hasTodayRes = allReservationsData.some(r => 
                r.tableId === t.id && 
                r.status !== 'CANCELLED' && 
                r.status !== 'COMPLETED' &&
                r.reservationDate === todayStr
            );
            
            if (hasActiveOrder) {
                // Nếu bàn đang có khách ngồi dùng bữa, trạng thái DB bắt buộc phải là OCCUPIED
                if (t.status !== 'OCCUPIED') {
                    updateTableStatusSilently(t.id, 'OCCUPIED');
                    t.status = 'OCCUPIED';
                }
            } else if (hasTodayRes && t.status === 'AVAILABLE') {
                // Bàn trống và có lịch đặt hôm nay -> Chuyển sang RESERVED
                updateTableStatusSilently(t.id, 'RESERVED');
                t.status = 'RESERVED';
            }
        });

        renderTablesGrid(allTablesData);
        renderTablesListTable(allTablesData);
    } catch (err) {
        showAlert("Không thể tải danh sách bàn: " + err.message, "error");
    }
}

function renderTablesGrid(tables) {
    const container = document.getElementById('tablesGridContainer');
    if (!container) return;

    if (tables.length === 0) {
        container.innerHTML = `<div class="col-12 text-center text-muted">Chưa có bàn nào trong hệ thống</div>`;
        return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const currentMin = new Date().getHours() * 60 + new Date().getMinutes();

    let upcomingBannerHtml = '';
    const upcomingList = [];
    tables.forEach(t => {
        const resList = (allReservationsData || []).filter(r => 
            r.tableId === t.id && 
            r.status !== 'CANCELLED' && 
            r.status !== 'COMPLETED' &&
            r.reservationDate === todayStr
        );
        resList.forEach(r => {
            if (r.startTime) {
                const [h, m] = r.startTime.split(':').map(Number);
                const diff = (h * 60 + m) - currentMin;
                if (diff >= -30 && diff <= 60) {
                    const rawName = String(t.tableName || t.name || t.id).trim();
                    const name = rawName.toLowerCase().startsWith('bàn') ? rawName : ('Bàn ' + rawName);
                    upcomingList.push({
                        tableName: name,
                        customerName: r.customerName || 'Khách đặt',
                        time: r.startTime.slice(0, 5),
                        diff: diff
                    });
                }
            }
        });
    });

    if (upcomingList.length > 0) {
        upcomingBannerHtml = `
            <div class="col-12 mb-3">
                <div class="alert alert-warning shadow-sm border-warning" style="background: #fff8e1; border-left: 5px solid #ff9800 !important; color: #856404; padding: 12px 18px; border-radius: 8px;">
                    <div class="d-flex align-items-center justify-content-between flex-wrap">
                        <div>
                            <strong style="color: #d97706; font-size: 15px;"><i class="mdi mdi-bell-ring"></i> CẢNH BÁO BÀN ĐÃ ĐẶT TRƯỚC SẮP ĐẾN GIỜ:</strong>
                            <span class="ms-1">Có <b>${upcomingList.length} bàn</b> đã đặt trước:</span>
                            ${upcomingList.map(u => `<span class="badge bg-warning text-dark me-1 p-2" style="font-size:12px;">${escapeHtml(u.tableName)} lúc ${u.time} (${escapeHtml(u.customerName)})</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    const cardsHtml = tables.map(t => {
        const rawName = String(t.tableName || t.name || t.id).trim();
        const displayName = rawName.toLowerCase().startsWith('bàn') ? rawName : ('Bàn ' + rawName);
        const activeOrder = (allOrdersData || []).find(o => o.tableId === t.id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
        const hasActiveOrder = !!activeOrder;

        // Tìm ca đặt hôm nay của bàn này
        const tableResList = (allReservationsData || []).filter(r => 
            r.tableId === t.id && 
            r.status !== 'CANCELLED' && 
            r.status !== 'COMPLETED' &&
            r.reservationDate === todayStr
        );
        tableResList.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        const activeRes = tableResList[0];

        // Quy tắc giữ bàn 60 phút: Chỉ giữ bàn khi cách giờ hẹn <= 60 phút hoặc đang trong giờ hẹn
        let holdingRes = null;
        for (const r of tableResList) {
            if (r.startTime) {
                const [h, m] = r.startTime.split(':').map(Number);
                const resMin = h * 60 + m;
                const diff = resMin - currentMin;
                let endMin = resMin + 120;
                if (r.endTime) {
                    const [eh, em] = r.endTime.split(':').map(Number);
                    endMin = eh * 60 + em;
                }
                if (diff <= 60 && currentMin <= endMin) {
                    holdingRes = { ...r, diff: diff };
                    break;
                }
            }
        }

        const isHoldingSoon = !hasActiveOrder && !!holdingRes;
        const isReserved = isHoldingSoon;
        const hasReservation = (allReservationsData || []).some(r => r.tableId === t.id && r.status !== 'CANCELLED' && r.status !== 'COMPLETED');
        const isTableReserved = isReserved || (t.status === 'RESERVED') || hasReservation;

        // Tự động đồng bộ trạng thái DB bàn nếu bị lệch quy tắc 60 phút
        if (t.status === 'RESERVED' && !hasActiveOrder && !isHoldingSoon) {
            fetchWithAuth(`/api/v1/tables/${t.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'AVAILABLE' })
            }).catch(e => console.warn(e));
            t.status = 'AVAILABLE';
        } else if (t.status !== 'RESERVED' && !hasActiveOrder && isHoldingSoon) {
            fetchWithAuth(`/api/v1/tables/${t.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'RESERVED' })
            }).catch(e => console.warn(e));
            t.status = 'RESERVED';
        }

        let statusBadge = 'bg-success';
        let statusText = 'Bàn trống';
        let cardBorder = 'border-success';

        if (t.status === 'OCCUPIED' || t.status === 'BUSY' || hasActiveOrder) {
            statusBadge = 'bg-danger';
            statusText = 'Có khách';
            cardBorder = 'border-danger';
        } else if (isReserved) {
            statusBadge = 'bg-warning text-dark';
            statusText = 'Đã đặt trước';
            cardBorder = 'border-warning';
        }

        let diningDetailHtml = '';
        if (hasActiveOrder) {
            const cusName = activeOrder.customerName || 'Khách ăn';
            const cusPhone = (activeOrder.customerPhone && activeOrder.customerPhone !== '0000000000') ? `(${escapeHtml(activeOrder.customerPhone)})` : '';
            const visits = activeOrder.visitCount ? `<span class="badge bg-primary text-white" style="font-size:10px; margin-left:3px;">Ghé ${activeOrder.visitCount} lần</span>` : '';
            diningDetailHtml = `
                <div style="font-size: 12px; color: #1e40af; background: #eff6ff; border: 1px dashed #93c5fd; border-radius: 6px; padding: 4px 6px; margin-bottom: 6px; cursor: pointer; text-align: left;" onclick="openViewEditDiningCustomerModal(${activeOrder.id}, '${escapeHtml(displayName)}')" title="Nhấn để xem và sửa thông tin khách ăn">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span><i class="mdi mdi-account-circle"></i> <b>Khách:</b> ${escapeHtml(cusName)}</span>
                        ${visits}
                    </div>
                    ${cusPhone ? `<div style="font-size:11px; color:#64748b;"><i class="mdi mdi-phone"></i> ${cusPhone}</div>` : ''}
                    <div style="font-size: 10px; color: #0284c7; margin-top: 2px;"><i class="mdi mdi-pencil"></i> Nhấn để xem & sửa khách ăn</div>
                </div>
            `;
        }

        let resDetailHtml = '';
        if (holdingRes) {
            const visits = holdingRes.visitCount ? `<span class="badge bg-warning text-dark" style="font-size:10px; margin-left:3px;">Ghé ${holdingRes.visitCount} lần</span>` : '';
            resDetailHtml = `
                <div style="font-size: 12px; color: #b45309; font-weight: bold; background: #fef3c7; border: 1px dashed #f59e0b; border-radius: 6px; padding: 4px 6px; margin-bottom: 8px; cursor: pointer; text-align: left;" onclick="openViewEditReservationModal(${holdingRes.id}, '${escapeHtml(displayName)}')" title="Nhấn để xem và sửa thông tin khách đặt">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span><i class="mdi mdi-calendar-clock"></i> Lúc ${(holdingRes.startTime || '').slice(0, 5)}: ${escapeHtml(holdingRes.customerName || 'Khách đặt')}</span>
                        ${visits}
                    </div>
                    <div style="font-size:11px; color:#b45309; font-weight:normal;"><i class="mdi mdi-clock-outline"></i> Còn khoảng <b>${Math.max(0, holdingRes.diff)} phút</b></div>
                    ${holdingRes.customerPhone && holdingRes.customerPhone !== '0000000000' ? `<div style="font-size:11px; color:#92400e; font-weight:normal;"><i class="mdi mdi-phone"></i> ${escapeHtml(holdingRes.customerPhone)}</div>` : ''}
                    <div style="font-size: 10px; color: #b45309; font-weight:normal; margin-top: 2px;"><i class="mdi mdi-pencil"></i> Nhấn để xem & sửa ca đặt</div>
                </div>
            `;
        } else if (!hasActiveOrder && activeRes) {
            // Có ca đặt trước nhưng > 60 phút: Bàn vẫn trống, hiển thị ca sau
            resDetailHtml = `
                <div style="font-size: 11px; color: #0284c7; background: #f0f9ff; border: 1px dashed #38bdf8; border-radius: 6px; padding: 4px 6px; margin-bottom: 6px; cursor: pointer; text-align: left;" onclick="openViewEditReservationModal(${activeRes.id}, '${escapeHtml(displayName)}')" title="Nhấn để xem và sửa ca đặt tiếp theo">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span><i class="mdi mdi-calendar"></i> <b>Ca sau:</b> ${(activeRes.startTime || '').slice(0, 5)}</span>
                        <span class="badge bg-info text-white" style="font-size:9px;">${tableResList.length} ca</span>
                    </div>
                    <div style="font-size: 10px; color: #64748b;">Khách: <b>${escapeHtml(activeRes.customerName || 'Khách đặt')}</b></div>
                </div>
            `;
        }

        return `
        <div class="col-md-3 col-sm-6 mb-4">
            <div class="card ${cardBorder} h-100 shadow-sm" style="${isReserved ? 'border-width: 2px;' : ''}">
                <div class="card-body text-center p-3 d-flex flex-column justify-content-between">
                    <div>
                        <div class="display-4 mb-2">${isReserved ? '⏰' : '🍽️'}</div>
                        <h5 class="card-title font-weight-bold mb-1">${escapeHtml(displayName)}</h5>
                        <p class="text-muted text-small mb-2">Sức chứa: ${t.capacity || 4} chỗ</p>
                        <span class="badge ${statusBadge} mb-2 p-2 d-inline-block font-weight-bold">${statusText}</span>
                        ${diningDetailHtml}
                        ${resDetailHtml}
                    </div>

                    <div class="dropdown mt-2">
                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle w-100" type="button" data-bs-toggle="dropdown" data-toggle="dropdown">
                            Trạng thái
                        </button>
                        <ul class="dropdown-menu shadow">
                            ${hasActiveOrder ? `
                                <li><a class="dropdown-item text-primary font-weight-bold" href="javascript:void(0);" onclick="event.preventDefault(); openViewEditDiningCustomerModal(${activeOrder.id}, '${escapeHtml(displayName)}')"><i class="mdi mdi-account-edit"></i> 👤 Xem/sửa thông tin khách ăn</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-muted disabled" href="javascript:void(0);" style="opacity:0.6; cursor:not-allowed;" title="Bàn đang có đơn khách ăn bên POS, không thể chuyển bàn trống"><span style="text-decoration:line-through;">🟩 Đánh dấu TRỐNG</span> <small class="text-danger">(Có đơn ăn)</small></a></li>
                            ` : isHoldingSoon ? `
                                <li><a class="dropdown-item text-muted disabled" href="javascript:void(0);" style="opacity:0.6; cursor:not-allowed;" title="Bàn đang giữ cho khách đặt trước sắp tới giờ, không thể chuyển sang bàn trống"><span style="text-decoration:line-through;">🟩 Đánh dấu TRỐNG</span> <small class="text-warning">(Đang giữ bàn)</small></a></li>
                            ` : `
                                <li><a class="dropdown-item" href="javascript:void(0);" onclick="event.preventDefault(); updateTableStatus(${t.id}, 'AVAILABLE')">🟩 Đánh dấu TRỐNG</a></li>
                            `}
                            ${hasActiveOrder ? `
                                <li><a class="dropdown-item text-muted disabled" href="javascript:void(0);" style="opacity:0.6; cursor:not-allowed;" title="Bàn đang có đơn khách ăn, không cần mở lại"><span style="text-decoration:line-through;">🟥 Đánh dấu CÓ KHÁCH</span> <small class="text-danger">(Đang phục vụ)</small></a></li>
                            ` : `
                                <li><a class="dropdown-item" href="javascript:void(0);" onclick="event.preventDefault(); openAdminOpenTableModal(${t.id})">🟥 Đánh dấu CÓ KHÁCH (Mở đơn)</a></li>
                            `}
                            ${activeRes ? `
                                <li><a class="dropdown-item text-warning font-weight-bold" href="javascript:void(0);" onclick="event.preventDefault(); openViewEditReservationModal(${activeRes.id}, '${escapeHtml(displayName)}')"><i class="mdi mdi-calendar-edit"></i> 📋 Xem/sửa thông tin khách đặt</a></li>
                            ` : ''}
                            ${hasActiveOrder ? `
                                <li><a class="dropdown-item" href="javascript:void(0);" onclick="event.preventDefault(); openFutureReservationModal(${t.id})">🟨 Đặt ca sau (Khách tiếp)</a></li>
                            ` : `
                                <li><a class="dropdown-item" href="javascript:void(0);" onclick="event.preventDefault(); openFutureReservationModal(${t.id})">🟨 Đánh dấu ĐẶT TRƯỚC</a></li>
                            `}
                            <li><hr class="dropdown-divider"></li>
                            ${(hasActiveOrder || t.status === 'OCCUPIED' || t.status === 'BUSY') ? `
                                <li><a class="dropdown-item text-muted disabled" href="javascript:void(0);" style="opacity:0.6; cursor:not-allowed;" title="Bàn đang có khách hoặc có đơn, không thể xóa"><span style="text-decoration:line-through;">🗑️ Xóa bàn</span> <small class="text-danger">(Đang có đơn)</small></a></li>
                            ` : isTableReserved ? `
                                <li><a class="dropdown-item text-muted disabled" href="javascript:void(0);" style="opacity:0.6; cursor:not-allowed;" title="Bàn đang có lịch đặt trước, không thể xóa"><span style="text-decoration:line-through;">🗑️ Xóa bàn</span> <small class="text-danger">(Đã đặt trước)</small></a></li>
                            ` : `
                                <li><a class="dropdown-item text-danger" href="javascript:void(0);" onclick="event.preventDefault(); deleteTable(${t.id})">🗑️ Xóa bàn</a></li>
                            `}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');

    container.innerHTML = upcomingBannerHtml + cardsHtml;
}

function renderTablesListTable(tables) {
    const tbody = document.getElementById('tablesTableBody');
    if (!tbody) return;
    
    if (tables.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Đang tải danh sách bàn...</td></tr>`;
        renderPaginationControls('tablesPagination', 0, 'tables', 'renderTablesWrapper');
        return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const state = paginationState.tables;
    const paginatedData = tables.slice((state.page - 1) * state.size, state.page * state.size);

    tbody.innerHTML = paginatedData.map((t, idx) => {
        const activeOrder = (allOrdersData || []).find(o => o.tableId === t.id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
        const hasActiveOrder = !!activeOrder || t.status === 'OCCUPIED' || t.status === 'BUSY';

        const tableResList = (allReservationsData || []).filter(r => 
            r.tableId === t.id && 
            r.status !== 'CANCELLED' && 
            r.status !== 'COMPLETED' &&
            r.reservationDate === todayStr
        );
        tableResList.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        const activeRes = tableResList[0];

        let holdingRes = null;
        const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
        for (const r of tableResList) {
            if (r.startTime) {
                const [h, m] = r.startTime.split(':').map(Number);
                const resMin = h * 60 + m;
                const diff = resMin - nowMinutes;
                let endMin = resMin + 120;
                if (r.endTime) {
                    const [eh, em] = r.endTime.split(':').map(Number);
                    endMin = eh * 60 + em;
                }
                if (diff <= 60 && nowMinutes <= endMin) {
                    holdingRes = r;
                    break;
                }
            }
        }

        const isReserved = !hasActiveOrder && !!holdingRes;
        const hasReservation = (allReservationsData || []).some(r => r.tableId === t.id && r.status !== 'CANCELLED' && r.status !== 'COMPLETED');
        const isTableReserved = isReserved || (t.status === 'RESERVED') || hasReservation;

        const badgeClass = hasActiveOrder ? 'bg-danger' : (isReserved ? 'bg-warning text-dark' : 'bg-success');
        const badgeText = hasActiveOrder ? 'Có khách' : (isReserved ? 'Đã đặt trước' : 'Bàn trống');

        return `
        <tr>
            <td>${(state.page - 1) * state.size + idx + 1}</td>
            <td><strong>${escapeHtml(t.tableName || t.name || ('Bàn #' + t.id))}</strong></td>
            <td>${t.capacity || 4} chỗ</td>
            <td>
                <span class="badge ${badgeClass}">${badgeText}</span>
                ${holdingRes ? `<br><small class="text-danger font-weight-bold">Giữ bàn lúc ${(holdingRes.startTime || '').slice(0,5)}: ${escapeHtml(holdingRes.customerName || '')}</small>` : activeRes ? `<br><small class="text-muted"><i class="mdi mdi-calendar"></i> Ca sau ${(activeRes.startTime || '').slice(0,5)}: ${escapeHtml(activeRes.customerName || '')}</small>` : ''}
            </td>
            <td>
                ${hasActiveOrder ? `
                    <button class="btn btn-sm btn-outline-secondary" disabled title="Bàn đang có đơn hàng hoặc có khách, không thể xóa" style="opacity: 0.65; cursor: not-allowed;">
                        <i class="mdi mdi-lock"></i> Đang có đơn
                    </button>
                ` : isTableReserved ? `
                    <button class="btn btn-sm btn-outline-secondary" disabled title="Bàn đang có lịch đặt trước, không thể xóa" style="opacity: 0.65; cursor: not-allowed;">
                        <i class="mdi mdi-lock"></i> Đã đặt trước
                    </button>
                ` : `
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteTable(${t.id})">
                        <i class="mdi mdi-delete"></i> Xóa
                    </button>
                `}
            </td>
        </tr>
        `;
    }).join('');
    
    renderPaginationControls('tablesPagination', tables.length, 'tables', 'renderTablesWrapper');
}

window.renderTablesWrapper = function() {
    renderTablesListTable(allTablesData);
}

function openAddTableModal() {
    document.getElementById('tableForm').reset();
    $('#tableModal').modal('show');
}

async function handleCreateTable(e) {
    e.preventDefault();
    const inputVal = document.getElementById('tableNumber').value.trim();
    if (!inputVal) {
        showAlert("Vui lòng nhập tên hoặc số bàn!", "error");
        return;
    }

    const tableNameVal = inputVal.startsWith("Bàn") ? inputVal : ("Bàn " + inputVal);
    const capacityVal = parseInt(document.getElementById('tableCapacity').value || "4");
    const statusVal = document.getElementById('tableStatus').value || "AVAILABLE";

    const body = {
        tableName: tableNameVal,
        capacity: capacityVal,
        status: statusVal
    };

    try {
        const res = await fetchWithAuth('/api/v1/tables', {
            method: 'POST',
            body: JSON.stringify(body)
        });
        showAlert(res.message || "Thêm bàn mới thành công!", "success");
        $('#tableModal').modal('hide');
        loadTables();
    } catch (err) {
        showAlert("Thêm bàn thất bại: " + err.message, "error");
    }
}

async function updateTableStatus(id, newStatus) {
    const table = allTablesData.find(t => t.id === id);
    const hasActiveOrder = (allOrdersData || []).some(o => o.tableId === id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
    if ((newStatus === 'AVAILABLE' || newStatus === 'RESERVED') && hasActiveOrder) {
        Swal.fire({
            icon: 'warning',
            title: 'Bàn đang có khách ngồi ăn!',
            html: `Bàn <b>${table ? (table.tableName || id) : id}</b> hiện đang có khách ngồi dùng bữa và có đơn gọi món chưa thanh toán!<br><br>Không thể đổi trạng thái bàn sang Trống hoặc Đặt trước khi khách đang dùng bữa.`,
            confirmButtonColor: '#d33'
        });
        return;
    }

    try {
        await fetchWithAuth(`/api/v1/tables/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        showAlert("Cập nhật trạng thái bàn thành công!", "success");
        loadTables();
    } catch (err) {
        showAlert("Cập nhật thất bại: " + err.message, "error");
    }
}

// -------------------------------------------------------------
// TRA CỨU & XEM / SỬA THÔNG TIN KHÁCH ĂN & KHÁCH ĐẶT
// -------------------------------------------------------------
window.lookupCustomerByPhone = async function(phone, nameInputId, feedbackElemId) {
    if (!phone || phone.trim().length < 8) {
        const feedback = document.getElementById(feedbackElemId);
        if (feedback) feedback.innerHTML = '';
        return;
    }
    try {
        const res = await fetchWithAuth(`/api/v1/customers/by-phone/${encodeURIComponent(phone.trim())}`);
        if (res.data) {
            const cus = res.data;
            const nameInput = document.getElementById(nameInputId);
            if (nameInput && (!nameInput.value || nameInput.value === 'Khách vãng lai')) {
                nameInput.value = cus.fullName || '';
            }
            const feedback = document.getElementById(feedbackElemId);
            if (feedback) {
                const visits = cus.visitCount || 1;
                feedback.innerHTML = `<span class="badge bg-success text-white p-1" style="font-size:11px;"><i class="mdi mdi-star"></i> 🌟 Khách quen! Đã từng ghé quán <b>${visits}</b> lần</span>`;
            }
        }
    } catch(e) {
        const feedback = document.getElementById(feedbackElemId);
        if (feedback) {
            feedback.innerHTML = `<span class="badge bg-light text-muted border p-1" style="font-size:11px;">✨ Khách mới (chưa có trong hệ thống)</span>`;
        }
    }
};

window.openViewEditDiningCustomerModal = async function(orderId, tableName) {
    try {
        const ordRes = await fetchWithAuth(`/api/v1/orders/${orderId}`);
        const order = ordRes.data;
        if (!order) throw new Error("Không tìm thấy thông tin đơn hàng!");

        let customer = null;
        if (order.customerId) {
            try {
                const cusRes = await fetchWithAuth(`/api/v1/customers/${order.customerId}`);
                customer = cusRes.data;
            } catch(e) {}
        }

        const cusName = (customer ? customer.fullName : order.customerName) || 'Khách vãng lai';
        const cusPhone = (customer ? customer.phone : order.customerPhone) || '';
        const visits = customer && customer.visitCount ? customer.visitCount : (order.visitCount || 1);
        const visitBadge = visits > 1 
            ? `<span class="badge bg-success text-white p-2" style="font-size:12px;"><i class="mdi mdi-star"></i> 🌟 Khách quen! Đã ghé quán <b>${visits}</b> lần</span>`
            : `<span class="badge bg-info text-white p-2" style="font-size:12px;">✨ Khách mới ghé lần đầu</span>`;

        const { value: formValues } = await Swal.fire({
            title: `<div style="font-size:20px; font-weight:bold; color:#0284c7;"><i class="mdi mdi-account-edit"></i> Thông Tin Khách Ăn - ${tableName}</div>`,
            html: `
                <div style="text-align: left; font-size: 14px;">
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px; margin-bottom: 12px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-weight:bold; color:#166534;">Mã đơn: #${order.orderCode}</div>
                            <div style="font-size:12px; color:#4b5563;">Bàn: ${tableName}</div>
                        </div>
                        <div>${visitBadge}</div>
                    </div>

                    <div class="mb-2">
                        <label class="form-label font-weight-bold mb-1">Tên khách hàng <span class="text-danger">*</span></label>
                        <input id="swal-edit-cus-name" class="form-control" value="${escapeHtml(cusName)}" placeholder="Nhập tên khách hàng">
                    </div>
                    <div class="mb-2">
                        <label class="form-label font-weight-bold mb-1">Số điện thoại</label>
                        <input id="swal-edit-cus-phone" class="form-control" value="${escapeHtml(cusPhone === '0000000000' ? '' : cusPhone)}" placeholder="Nhập số điện thoại">
                        <div id="swal-edit-cus-phone-feedback" class="mt-1"></div>
                    </div>
                    <div class="mb-2">
                        <label class="form-label font-weight-bold mb-1">Ghi chú đơn hàng</label>
                        <textarea id="swal-edit-order-note" class="form-control" rows="2" placeholder="Ghi chú món, phục vụ...">${escapeHtml(order.note || '')}</textarea>
                    </div>
                </div>
            `,
            didOpen: () => {
                const phoneInput = document.getElementById('swal-edit-cus-phone');
                if (phoneInput) {
                    phoneInput.addEventListener('input', () => {
                        window.lookupCustomerByPhone(phoneInput.value, 'swal-edit-cus-name', 'swal-edit-cus-phone-feedback');
                    });
                }
            },
            showCancelButton: true,
            confirmButtonText: '<i class="mdi mdi-content-save"></i> Lưu thông tin',
            cancelButtonText: 'Đóng',
            confirmButtonColor: '#0284c7',
            preConfirm: () => {
                const name = (document.getElementById('swal-edit-cus-name').value || '').trim();
                const phone = (document.getElementById('swal-edit-cus-phone').value || '').trim() || '0000000000';
                const note = (document.getElementById('swal-edit-order-note').value || '').trim();
                if (!name) {
                    Swal.showValidationMessage('Tên khách hàng không được để trống!');
                    return false;
                }
                return { name, phone, note };
            }
        });

        if (!formValues) return;

        // Check-in / lưu khách hàng mới hoặc cập nhật
        const cusRes = await fetchWithAuth('/api/v1/customers/check-in', {
            method: 'POST',
            body: JSON.stringify({ fullName: formValues.name, phone: formValues.phone })
        });
        const newCustomer = cusRes.data;
        if (newCustomer && newCustomer.id) {
            await fetchWithAuth(`/api/v1/orders/${orderId}/customer/${newCustomer.id}`, {
                method: 'PUT'
            }).catch(e => console.warn(e));
        }

        // Cập nhật ghi chú order
        await fetchWithAuth(`/api/v1/orders/${orderId}/note`, {
            method: 'PUT',
            body: JSON.stringify({ note: formValues.note })
        });

        Swal.fire({
            icon: 'success',
            title: 'Cập nhật thành công! 🎉',
            text: `Đã lưu thông tin khách ăn cho ${tableName}`,
            timer: 1500,
            showConfirmButton: false
        });

        loadTables();
        if (typeof loadOrders === 'function') loadOrders();

    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Lỗi cập nhật', text: err.message, confirmButtonColor: '#d33' });
    }
};

window.openViewEditReservationModal = async function(reservationId, tableName, tableId) {
    try {
        let res = null;
        const parsedId = parseInt(reservationId);
        try {
            const resvRes = await fetchWithAuth(`/api/v1/reservations/${parsedId}`);
            res = resvRes.data;
        } catch(fetchErr) {
            try {
                const allResRes = await fetchWithAuth('/api/v1/reservations/all');
                allReservationsData = allResRes.data || [];
                const checkTable = tableId ? parseInt(tableId) : parsedId;
                const found = allReservationsData.find(r => (r.id === parsedId || r.tableId === checkTable) && r.status !== 'CANCELLED' && r.status !== 'COMPLETED');
                if (found) {
                    res = found;
                } else {
                    throw fetchErr;
                }
            } catch(e2) {
                throw fetchErr;
            }
        }
        if (!res) throw new Error("Không tìm thấy thông tin ca đặt!");

        let customer = null;
        if (res.customerId) {
            try {
                const cusRes = await fetchWithAuth(`/api/v1/customers/${res.customerId}`);
                customer = cusRes.data;
            } catch(e) {}
        }

        const cusName = (customer ? customer.fullName : res.customerName) || 'Khách đặt';
        const cusPhone = (customer ? customer.phone : res.customerPhone) || '';
        const visits = customer && customer.visitCount ? customer.visitCount : (res.visitCount || 1);
        const visitBadge = visits > 1 
            ? `<span class="badge bg-success text-white p-2" style="font-size:12px;"><i class="mdi mdi-star"></i> 🌟 Khách quen! Đã ghé quán <b>${visits}</b> lần</span>`
            : `<span class="badge bg-info text-white p-2" style="font-size:12px;">✨ Khách mới đặt lần đầu</span>`;

        const { value: formValues } = await Swal.fire({
            title: `<div style="font-size:20px; font-weight:bold; color:#b45309;"><i class="mdi mdi-calendar-edit"></i> Thông Tin Khách Đặt - ${tableName}</div>`,
            html: `
                <div style="text-align: left; font-size: 14px;">
                    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px; margin-bottom: 12px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-weight:bold; color:#92400e;">Mã đặt: #${res.reservationCode}</div>
                            <div style="font-size:12px; color:#6b7280;">Bàn: ${tableName}</div>
                        </div>
                        <div>${visitBadge}</div>
                    </div>

                    <div class="mb-2">
                        <label class="form-label font-weight-bold mb-1">Tên khách hàng <span class="text-danger">*</span></label>
                        <input id="swal-edit-res-name" class="form-control" value="${escapeHtml(cusName)}" placeholder="Nhập tên khách hàng">
                    </div>
                    <div class="mb-2">
                        <label class="form-label font-weight-bold mb-1">Số điện thoại <span class="text-danger">*</span></label>
                        <input id="swal-edit-res-phone" class="form-control" value="${escapeHtml(cusPhone === '0000000000' ? '' : cusPhone)}" placeholder="Nhập số điện thoại">
                        <div id="swal-edit-res-phone-feedback" class="mt-1"></div>
                    </div>
                    <div class="row g-2 mb-2">
                        <div class="col-6">
                            <label class="form-label font-weight-bold mb-1">Ngày đặt <span class="text-danger">*</span></label>
                            <input id="swal-edit-res-date" type="date" class="form-control" value="${res.reservationDate}">
                        </div>
                        <div class="col-6">
                            <label class="form-label font-weight-bold mb-1">Số lượng khách</label>
                            <input id="swal-edit-res-guests" type="number" min="1" class="form-control" value="${res.numberOfGuests || 4}">
                        </div>
                    </div>
                    <div class="row g-2 mb-2">
                        <div class="col-6">
                            <label class="form-label font-weight-bold mb-1">Giờ bắt đầu <span class="text-danger">*</span></label>
                            <input id="swal-edit-res-start" type="time" class="form-control" value="${(res.startTime || '').slice(0,5)}">
                        </div>
                        <div class="col-6">
                            <label class="form-label font-weight-bold mb-1">Giờ kết thúc <span class="text-danger">*</span></label>
                            <input id="swal-edit-res-end" type="time" class="form-control" value="${(res.endTime || '').slice(0,5)}">
                        </div>
                    </div>
                    <div class="mb-2">
                        <label class="form-label font-weight-bold mb-1">Ghi chú / Tiền cọc</label>
                        <input id="swal-edit-res-note" class="form-control" value="${escapeHtml(res.note || '')}" placeholder="Ghi chú yêu cầu riêng của khách...">
                    </div>
                </div>
            `,
            didOpen: () => {
                const phoneInput = document.getElementById('swal-edit-res-phone');
                if (phoneInput) {
                    phoneInput.addEventListener('input', () => {
                        window.lookupCustomerByPhone(phoneInput.value, 'swal-edit-res-name', 'swal-edit-res-phone-feedback');
                    });
                }
            },
            showCancelButton: true,
            confirmButtonText: '<i class="mdi mdi-content-save"></i> Lưu cập nhật',
            cancelButtonText: 'Đóng',
            confirmButtonColor: '#b45309',
            preConfirm: () => {
                const name = (document.getElementById('swal-edit-res-name').value || '').trim();
                const phone = (document.getElementById('swal-edit-res-phone').value || '').trim();
                const date = document.getElementById('swal-edit-res-date').value;
                const start = document.getElementById('swal-edit-res-start').value;
                const end = document.getElementById('swal-edit-res-end').value;
                const guests = parseInt(document.getElementById('swal-edit-res-guests').value) || 4;
                const note = (document.getElementById('swal-edit-res-note').value || '').trim();

                if (!name || !phone) {
                    Swal.showValidationMessage('Vui lòng nhập tên và số điện thoại khách!');
                    return false;
                }
                if (!date || !start || !end) {
                    Swal.showValidationMessage('Vui lòng chọn ngày và giờ đặt!');
                    return false;
                }
                if (start >= end) {
                    Swal.showValidationMessage('Giờ kết thúc phải sau giờ bắt đầu!');
                    return false;
                }
                return { name, phone, date, start: start.length === 5 ? start + ':00' : start, end: end.length === 5 ? end + ':00' : end, guests, note };
            }
        });

        if (!formValues) return;

        // Cập nhật customer
        if (res.customerId) {
            await fetchWithAuth(`/api/v1/customers/${res.customerId}`, {
                method: 'PUT',
                body: JSON.stringify({ fullName: formValues.name, phone: formValues.phone })
            });
        }

        // Cập nhật reservation
        await fetchWithAuth(`/api/v1/reservations/${res.id || reservationId}`, {
            method: 'PUT',
            body: JSON.stringify({
                reservationCode: res.reservationCode,
                customerId: res.customerId,
                tableId: res.tableId,
                reservationDate: formValues.date,
                startTime: formValues.start,
                endTime: formValues.end,
                numberOfGuests: formValues.guests,
                note: formValues.note
            })
        });

        Swal.fire({
            icon: 'success',
            title: 'Cập nhật thành công! 🎉',
            text: `Đã lưu thông tin ca đặt của khách ${formValues.name}`,
            timer: 1500,
            showConfirmButton: false
        });

        loadTables();

    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Lỗi cập nhật', text: err.message, confirmButtonColor: '#d33' });
    }
};

window.openAdminSwitchTableModal = async function(orderId, oldTableId, oldTableName) {
    const emptyTables = allTablesData.filter(t => t.id !== oldTableId && t.status !== 'OCCUPIED');
    if (emptyTables.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Không có bàn trống',
            text: 'Hiện không có bàn nào đang trống để đổi sang!',
            confirmButtonColor: '#ff9800'
        });
        return;
    }

    const inputOptions = {};
    emptyTables.forEach(t => {
        const rawName = String(t.tableName || t.name || t.id).trim();
        const name = rawName.toLowerCase().startsWith('bàn') ? rawName : ('Bàn ' + rawName);
        inputOptions[t.id] = `${name} (${t.capacity || 4} chỗ - ${t.status === 'RESERVED' ? 'Đã đặt' : 'Trống'})`;
    });

    const { value: newTableId } = await Swal.fire({
        title: `🔄 Đổi Bàn Cho ${oldTableName}`,
        text: 'Chọn bàn mới để chuyển toàn bộ khách và món ăn sang:',
        input: 'select',
        inputOptions: inputOptions,
        inputPlaceholder: '-- Chọn bàn chuyển sang --',
        showCancelButton: true,
        confirmButtonText: '<i class="mdi mdi-check"></i> Xác nhận đổi bàn',
        cancelButtonText: 'Hủy bỏ',
        confirmButtonColor: '#0284c7',
        inputValidator: (value) => {
            if (!value) return 'Vui lòng chọn bàn muốn chuyển sang!';
        }
    });

    if (newTableId) {
        try {
            await fetchWithAuth(`/api/v1/orders/${orderId}/switch-table/${newTableId}`, {
                method: 'PUT'
            });
            Swal.fire({
                icon: 'success',
                title: 'Đổi bàn thành công!',
                text: `Đã chuyển toàn bộ đơn của ${oldTableName} sang bàn mới thành công!`,
                confirmButtonColor: '#28a745'
            });
            loadTables();
        } catch(err) {
            Swal.fire({
                icon: 'error',
                title: 'Đổi bàn thất bại',
                text: err.message,
                confirmButtonColor: '#d33'
            });
        }
    }
};

window.openAdminOpenTableModal = async function(tableId, tableName) {
    const table = allTablesData.find(t => t.id === tableId);
    const cleanTableName = String(tableName || (table ? table.tableName : ('Bàn #' + tableId))).trim();
    const displayName = cleanTableName.toLowerCase().startsWith('bàn') ? cleanTableName : ('Bàn ' + cleanTableName);

    // Kiểm tra nếu bàn đang có đơn hàng hoạt động
    const activeOrder = (allOrdersData || []).find(o => o.tableId === tableId && o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
    if (activeOrder) {
        Swal.fire({
            icon: 'info',
            title: `${displayName} đang phục vụ`,
            html: `Bàn hiện đang có đơn hàng hoạt động <b>#${activeOrder.orderCode}</b>.<br>Bạn có muốn mở ngay trang gọi món không?`,
            showCancelButton: true,
            confirmButtonText: '<i class="mdi mdi-food"></i> Vào trang Gọi món (POS)',
            cancelButtonText: 'Đóng',
            confirmButtonColor: '#0284c7'
        }).then((res) => {
            if (res.isConfirmed) {
                window.location.href = `/order?tableId=${tableId}&orderId=${activeOrder.id}`;
            }
        });
        return;
    }

    // Kiểm tra nếu bàn đang có lịch đặt trước hôm nay
    const todayStr = new Date().toISOString().split('T')[0];
    const tableResList = (allReservationsData || []).filter(r => 
        r.tableId === tableId && 
        r.status !== 'CANCELLED' && 
        r.status !== 'COMPLETED' &&
        r.reservationDate === todayStr
    );
    tableResList.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    const activeRes = tableResList[0];

    let defaultName = '';
    let defaultPhone = '';
    let reservationPromptHtml = '';

    if (activeRes) {
        reservationPromptHtml = `
            <div class="alert alert-warning p-2 mb-2" style="font-size: 13px; background: #fff8e1; border: 1px solid #ffe082;">
                <i class="mdi mdi-bell-ring text-warning"></i> <b>Lưu ý:</b> Bàn này đang có ca đặt trước lúc <b>${(activeRes.startTime || '').slice(0,5)}</b> của khách <b>${escapeHtml(activeRes.customerName || 'Khách đặt')}</b>.
                <div class="mt-1">
                    <button type="button" class="btn btn-xs btn-outline-primary" style="font-size: 11px; padding: 2px 6px;" onclick="window.fillReservedGuestInfo('${escapeHtml(activeRes.customerName || '')}', '${escapeHtml(activeRes.customerPhone || '')}')">
                        👉 Dùng thông tin khách đặt này
                    </button>
                </div>
            </div>
        `;
    }

    const { value: formValues } = await Swal.fire({
        title: `<div style="font-size:20px; font-weight:bold; color:#dc3545;"><i class="mdi mdi-silverware-fork-knife"></i> Mở Bàn Đón Khách - ${displayName}</div>`,
        html: `
            <div style="text-align: left; font-size: 14px;">
                ${reservationPromptHtml}
                <p class="text-muted mb-2"><small>Hệ thống sẽ tạo đơn hàng và chuyển trạng thái bàn sang Có khách (đồng bộ sang POS):</small></p>
                <div class="mb-2">
                    <label class="form-label font-weight-bold mb-1">Tên khách hàng</label>
                    <input id="swal-order-name" class="form-control" placeholder="Ví dụ: Khách vãng lai, Anh Nam..." value="${defaultName}">
                </div>
                <div class="mb-2">
                    <label class="form-label font-weight-bold mb-1">Số điện thoại</label>
                    <input id="swal-order-phone" class="form-control" placeholder="Ví dụ: 0912345678 (tùy chọn)" value="${defaultPhone}">
                    <div id="swal-order-phone-feedback" class="mt-1"></div>
                </div>
                <div class="mb-2">
                    <label class="form-label font-weight-bold mb-1">Ghi chú đơn hàng</label>
                    <input id="swal-order-note" class="form-control" placeholder="Ví dụ: Khách ngồi tầng 2, ít cay...">
                </div>
            </div>
        `,
        didOpen: () => {
            window.fillReservedGuestInfo = function(name, phone) {
                const nameInput = document.getElementById('swal-order-name');
                const phoneInput = document.getElementById('swal-order-phone');
                if (nameInput) nameInput.value = name;
                if (phoneInput) {
                    phoneInput.value = phone;
                    window.lookupCustomerByPhone(phone, 'swal-order-name', 'swal-order-phone-feedback');
                }
            };
            const phoneInput = document.getElementById('swal-order-phone');
            if (phoneInput) {
                phoneInput.addEventListener('input', () => {
                    window.lookupCustomerByPhone(phoneInput.value, 'swal-order-name', 'swal-order-phone-feedback');
                });
            }
        },
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '<i class="mdi mdi-check"></i> Xác nhận mở bàn',
        cancelButtonText: 'Hủy bỏ',
        confirmButtonColor: '#dc3545',
        preConfirm: () => {
            const name = (document.getElementById('swal-order-name').value || '').trim() || 'Khách vãng lai';
            const phone = (document.getElementById('swal-order-phone').value || '').trim() || '0000000000';
            const note = (document.getElementById('swal-order-note').value || '').trim();
            return { name, phone, note };
        }
    });

    if (!formValues) return;

    try {
        // 1. Check-in khách hàng
        const cusRes = await fetchWithAuth('/api/v1/customers/check-in', {
            method: 'POST',
            body: JSON.stringify({ fullName: formValues.name, phone: formValues.phone })
        });
        let customerId = cusRes && cusRes.data ? cusRes.data.id : null;
        if (!customerId) {
            try {
                const walkInRes = await fetchWithAuth('/api/v1/customers/by-phone/0000000000');
                if (walkInRes && walkInRes.data) customerId = walkInRes.data.id;
            } catch(e) {}
        }
        if (!customerId) customerId = 1;

        // 2. Chuyển trạng thái bàn sang OCCUPIED
        await fetchWithAuth(`/api/v1/tables/${tableId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'OCCUPIED' })
        });

        // 3. Nếu là khách đặt trước đến ăn thì hoàn thành reservation
        if (activeRes && formValues.name === activeRes.customerName) {
            await fetchWithAuth(`/api/v1/reservations/${activeRes.id}/status?status=COMPLETED`, {
                method: 'PUT'
            }).catch(e => console.warn(e));
        }

        // 4. Tạo Order mới
        const userId = localStorage.getItem('userId') || 1;
        const orderCode = 'ORD' + Date.now().toString().slice(-6);
        let finalNote = formValues.note;
        if (activeRes && formValues.name === activeRes.customerName) {
            finalNote = (finalNote ? finalNote + ' | ' : '') + `Khách đặt trước lúc ${(activeRes.startTime || '').slice(0,5)}`;
        }

        const ordRes = await fetchWithAuth('/api/v1/orders/add', {
            method: 'POST',
            body: JSON.stringify({
                orderCode: orderCode,
                tableId: tableId,
                customerId: customerId,
                userId: parseInt(userId),
                note: finalNote
            })
        });

        const newOrder = ordRes.data;

        await Swal.fire({
            icon: 'success',
            title: 'Mở bàn thành công! 🎉',
            html: `Đã mở <b>${displayName}</b> cho <b>${escapeHtml(formValues.name)}</b>!<br>Mã đơn hàng: <b class="text-primary">#${orderCode}</b>.<br><br>Hệ thống đã đồng bộ trạng thái Có khách sang POS.`,
            showCancelButton: true,
            confirmButtonText: '<i class="mdi mdi-silverware"></i> Chuyển sang Gọi món ngay',
            cancelButtonText: 'Ở lại quản lý bàn',
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = `/order?tableId=${tableId}&orderId=${newOrder ? newOrder.id : ''}`;
            } else {
                loadTables();
                if (typeof loadOrders === 'function') loadOrders();
            }
        });

    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Lỗi mở bàn',
            text: err.message,
            confirmButtonColor: '#d33'
        });
    }
};

window.openFutureReservationModal = async function(tableId, tableName) {
    const table = allTablesData.find(t => t.id === tableId);
    const cleanTableName = String(tableName || (table ? table.tableName : ('Bàn #' + tableId))).trim();
    const displayName = cleanTableName.toLowerCase().startsWith('bàn') ? cleanTableName : ('Bàn ' + cleanTableName);

    const isCurrentlyOccupied = (allOrdersData || []).some(o => o.tableId === tableId && o.status !== 'COMPLETED' && o.status !== 'CANCELLED');

    const today = new Date().toISOString().split('T')[0];
    const nowHour = new Date().getHours();
    const nextStartHour = String(Math.min(nowHour + 1, 23)).padStart(2, '0') + ':00';
    const nextEndHour = String(Math.min(nowHour + 3, 23)).padStart(2, '0') + ':00';

    const modalTitle = isCurrentlyOccupied 
        ? `<div style="font-size:20px; font-weight:bold; color:#17a2b8;"><i class="mdi mdi-calendar-clock"></i> Đặt ${displayName} Giờ Tiếp Theo</div>`
        : `<div style="font-size:20px; font-weight:bold; color:#f59e0b;"><i class="mdi mdi-calendar-check"></i> Đặt Trước ${displayName}</div>`;

    const modalSubtitle = isCurrentlyOccupied
        ? `<small>Bàn hiện đang có khách. Bạn đang đặt trước bàn này cho khách tiếp theo vào khung giờ sau:</small>`
        : `<small>Nhập thông tin khách đặt trước để giữ bàn và đồng bộ hóa sang hệ thống POS:</small>`;

    const { value: formValues } = await Swal.fire({
        title: modalTitle,
        html: `
            <div style="text-align: left; font-size: 14px;">
                <p class="text-muted mb-2">${modalSubtitle}</p>
                <div class="mb-2">
                    <label class="form-label font-weight-bold mb-1">Tên khách hàng *</label>
                    <input id="swal-res-name" class="form-control" placeholder="Nhập tên khách hàng">
                </div>
                <div class="mb-2">
                    <label class="form-label font-weight-bold mb-1">Số điện thoại *</label>
                    <input id="swal-res-phone" class="form-control" placeholder="Nhập số điện thoại">
                    <div id="swal-res-phone-feedback" class="mt-1"></div>
                </div>
                <div class="row g-2 mb-2">
                    <div class="col-6">
                        <label class="form-label font-weight-bold mb-1">Ngày đặt *</label>
                        <input id="swal-res-date" type="date" class="form-control" value="${today}">
                    </div>
                    <div class="col-6">
                        <label class="form-label font-weight-bold mb-1">Số lượng khách</label>
                        <input id="swal-res-guests" type="number" min="1" class="form-control" value="${table ? (table.capacity || 4) : 4}">
                    </div>
                </div>
                <div class="row g-2 mb-2">
                    <div class="col-6">
                        <label class="form-label font-weight-bold mb-1">Giờ bắt đầu *</label>
                        <input id="swal-res-start" type="time" class="form-control" value="${nextStartHour}">
                    </div>
                    <div class="col-6">
                        <label class="form-label font-weight-bold mb-1">Giờ kết thúc *</label>
                        <input id="swal-res-end" type="time" class="form-control" value="${nextEndHour}">
                    </div>
                </div>
                <div class="mb-2">
                    <label class="form-label font-weight-bold mb-1">Tiền cọc trước (VNĐ, nếu có)</label>
                    <input id="swal-res-deposit" type="number" class="form-control" placeholder="Ví dụ: 100000">
                </div>
                <div class="mb-2">
                    <label class="form-label font-weight-bold mb-1">Ghi chú</label>
                    <input id="swal-res-note" class="form-control" placeholder="Yêu cầu riêng của khách...">
                </div>
            </div>
        `,
        didOpen: () => {
            const phoneInput = document.getElementById('swal-res-phone');
            if (phoneInput) {
                phoneInput.addEventListener('input', () => {
                    window.lookupCustomerByPhone(phoneInput.value, 'swal-res-name', 'swal-res-phone-feedback');
                });
            }
        },
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '<i class="mdi mdi-check"></i> Xác nhận đặt bàn',
        cancelButtonText: 'Hủy bỏ',
        confirmButtonColor: '#28a745',
        preConfirm: () => {
            const name = document.getElementById('swal-res-name').value.trim();
            const phone = document.getElementById('swal-res-phone').value.trim();
            const date = document.getElementById('swal-res-date').value;
            const start = document.getElementById('swal-res-start').value;
            const end = document.getElementById('swal-res-end').value;
            const guests = parseInt(document.getElementById('swal-res-guests').value) || 4;
            const deposit = document.getElementById('swal-res-deposit').value.trim();
            const note = document.getElementById('swal-res-note').value.trim();

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
        // 1. Check in khách hàng
        const cusRes = await fetchWithAuth('/api/v1/customers/check-in', {
            method: 'POST',
            body: JSON.stringify({ fullName: formValues.name, phone: formValues.phone })
        });
        const customerId = cusRes.data ? cusRes.data.id : 1;

        let noteText = formValues.note || '';
        if (formValues.deposit && parseInt(formValues.deposit) > 0) {
            noteText += ` | Đã cọc: ${parseInt(formValues.deposit)}`;
        }

        const resCode = 'RES' + Date.now().toString().slice(-8);

        // 2. Tạo Reservation
        await fetchWithAuth('/api/v1/reservations/add', {
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

        // 3. Nếu bàn hiện tại đang trống, chỉ chuyển sang RESERVED nếu trong vòng 60 phút tới giờ hẹn hôm nay
        if (!isCurrentlyOccupied) {
            const todayStr = new Date().toISOString().split('T')[0];
            const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
            const [sh, sm] = formValues.start.split(':').map(Number);
            const startMin = sh * 60 + sm;
            const diffMin = startMin - nowMinutes;
            const isWithin60 = (formValues.date === todayStr) && (diffMin <= 60 && diffMin >= -120);

            const targetStatus = isWithin60 ? 'RESERVED' : 'AVAILABLE';
            await fetchWithAuth(`/api/v1/tables/${tableId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: targetStatus })
            }).catch(e => console.warn(e));
        }

        Swal.fire({
            icon: 'success',
            title: 'Đặt bàn thành công! 🎉',
            html: `Đã đặt trước <b>${displayName}</b> cho khách <b>${escapeHtml(formValues.name)}</b> (SĐT: ${escapeHtml(formValues.phone)}) vào lúc <b>${formValues.start.slice(0,5)} - ${formValues.end.slice(0,5)}</b> ngày <b>${formValues.date}</b>.<br><br><span class="badge bg-success">Đã đồng bộ hóa sang POS</span>`,
            confirmButtonColor: '#28a745'
        });

        loadTables();
    } catch(err) {
        Swal.fire({
            icon: 'error',
            title: 'Đặt bàn thất bại',
            text: err.message,
            confirmButtonColor: '#d33'
        });
    }
};

window.viewFutureReservationsAdmin = async function(tableId, tableName) {
    try {
        const cleanTableName = String(tableName || '').trim().replace(/^Bàn\s+/i, '');
        const displayName = 'Bàn ' + cleanTableName;

        const res = await fetchWithAuth('/api/v1/reservations/all');
        const allRes = res.data || [];
        const tableResList = allRes.filter(r => r.tableId === tableId && r.status !== 'CANCELLED' && r.status !== 'COMPLETED');

        if (tableResList.length === 0) {
            Swal.fire({
                icon: 'info',
                title: `${displayName}`,
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
                    <span class="badge bg-success" style="font-size: 11px;">${r.status || 'CONFIRMED'}</span>
                </div>
                <div style="font-size: 13px; color: #334155; margin-bottom: 3px;">
                    <i class="mdi mdi-calendar text-primary"></i> <b>Ngày:</b> ${r.reservationDate} &nbsp;|&nbsp; 
                    <i class="mdi mdi-clock-outline text-warning"></i> <b>Giờ:</b> ${(r.startTime || '').slice(0,5)} - ${(r.endTime || '').slice(0,5)}
                </div>
                <div style="font-size: 13px; color: #334155; margin-bottom: 3px;">
                    <i class="mdi mdi-phone text-success"></i> SĐT: <b>${escapeHtml(r.customerPhone || r.phone || '0000000000')}</b> &nbsp;|&nbsp; 
                    <i class="mdi mdi-account-multiple"></i> Khách: <b>${r.numberOfGuests || 4} người</b>
                </div>
                ${r.note ? `<div style="font-size: 12px; color: #b45309; background: #fef3c7; padding: 4px 8px; border-radius: 4px; margin-top: 5px;">📝 ${escapeHtml(r.note)}</div>` : ''}
                <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #ddd; display: flex; justify-content: flex-end; gap: 6px;">
                    <button class="btn btn-primary btn-xs" style="font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 4px; background: #0284c7; color: #fff; border: none;" onclick="Swal.close(); openViewEditReservationModal(${r.id}, '${escapeHtml(displayName)}')">
                        <i class="mdi mdi-pencil"></i> Sửa ca đặt
                    </button>
                    <button class="btn btn-warning btn-xs" style="font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 4px; background: #f59e0b; color: #fff; border: none;" onclick="Swal.close(); switchReservationTableAdmin(${r.id}, ${tableId}, '${escapeHtml(displayName)}', '${escapeHtml(r.customerName)}')">
                        <i class="mdi mdi-swap-horizontal"></i> Chuyển sang bàn khác
                    </button>
                    <button class="btn btn-danger btn-xs" style="font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 4px; background: #ef4444; color: #fff; border: none;" onclick="Swal.close(); cancelSingleReservationAdmin(${r.id}, '${escapeHtml(r.customerName)}')">
                        <i class="mdi mdi-close-circle"></i> Hủy ca đặt
                    </button>
                </div>
            </div>
        `).join('');

        Swal.fire({
            title: `<div style="font-size: 18px; font-weight: bold; color: #0284c7;"><i class="mdi mdi-calendar-check"></i> Các Ca Đặt Sau - ${displayName}</div>`,
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

window.cancelSingleReservationAdmin = async function(reservationId, customerName) {
    if (!reservationId) return;
    const result = await Swal.fire({
        title: 'Xác nhận hủy đặt bàn?',
        html: `Bạn có chắc chắn muốn hủy ca đặt của khách <b>${escapeHtml(customerName || 'này')}</b> không?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '<i class="mdi mdi-delete"></i> Hủy ca đặt',
        cancelButtonText: 'Đóng',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6c757d'
    });

    if (!result.isConfirmed) return;

    try {
        await fetchWithAuth(`/api/v1/reservations/${reservationId}`, { method: 'DELETE' });
        await Swal.fire({
            icon: 'success',
            title: 'Đã hủy ca đặt bàn!',
            text: `Lịch hẹn của khách ${customerName || ''} đã được xóa thành công.`,
            confirmButtonColor: '#28a745',
            timer: 2000
        });
        loadTables();
    } catch(err) {
        Swal.fire({
            icon: 'error',
            title: 'Hủy ca đặt thất bại',
            text: err.message,
            confirmButtonColor: '#d33'
        });
    }
};

window.switchReservationTableAdmin = async function(reservationId, currentTableId, currentTableName, customerName) {
    if (!reservationId || reservationId === 'null') {
        Swal.fire({ icon: 'warning', title: 'Không tìm thấy ca đặt', text: 'Không có mã ca đặt để chuyển bàn!' });
        return;
    }

    try {
        const emptyTables = allTablesData.filter(t => t.id !== currentTableId && t.status !== 'OCCUPIED');

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
            inputOptions[t.id] = `${name} (${t.capacity || 4} chỗ - ${t.status === 'RESERVED' ? 'Đã đặt' : 'Trống'})`;
        });

        const { value: newTableId } = await Swal.fire({
            title: `🔄 Chuyển Ca Đặt Sang Bàn Khác`,
            html: `Chuyển ca hẹn của khách <b>${customerName || 'Khách đặt'}</b> từ <b>${currentTableName}</b> sang bàn trống mới:`,
            input: 'select',
            inputOptions: inputOptions,
            inputPlaceholder: '-- Chọn bàn chuyển sang --',
            showCancelButton: true,
            confirmButtonText: '<i class="mdi mdi-check"></i> Xác nhận chuyển bàn',
            cancelButtonText: 'Hủy bỏ',
            confirmButtonColor: '#0284c7',
            inputValidator: (value) => {
                if (!value) return 'Vui lòng chọn bàn muốn chuyển sang!';
            }
        });

        if (newTableId) {
            await fetchWithAuth(`/api/v1/reservations/${reservationId}/switch-table/${newTableId}`, {
                method: 'PUT'
            });

            await Swal.fire({
                icon: 'success',
                title: 'Chuyển bàn thành công! 🎉',
                html: `Đã chuyển ca đặt của <b>${customerName || 'khách'}</b> sang bàn mới!<br>Bàn <b>${currentTableName}</b> đã được giải phóng ca hẹn.`,
                confirmButtonColor: '#28a745',
                timer: 2000
            });

            loadTables();
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

async function deleteTable(id) {
    const table = allTablesData.find(t => t.id === id);
    const tableName = table ? (table.tableName || ('Bàn #' + id)) : ('Bàn #' + id);

    const activeOrder = (allOrdersData || []).find(o => o.tableId === id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
    if (activeOrder || (table && (table.status === 'OCCUPIED' || table.status === 'BUSY'))) {
        Swal.fire({
            icon: 'warning',
            title: 'Không thể xóa bàn!',
            html: `<b>${escapeHtml(tableName)}</b> hiện đang có khách hoặc có đơn hàng chưa hoàn tất!<br><br>Vui lòng hoàn tất hoặc hủy đơn hàng trước khi xóa bàn.`,
            confirmButtonColor: '#d33'
        });
        return;
    }

    const tableRes = (allReservationsData || []).find(r => r.tableId === id && r.status !== 'CANCELLED' && r.status !== 'COMPLETED');
    if (tableRes || (table && table.status === 'RESERVED')) {
        Swal.fire({
            icon: 'warning',
            title: 'Không thể xóa bàn!',
            html: `<b>${escapeHtml(tableName)}</b> hiện đang có lịch khách đặt trước${tableRes ? ` (Lúc ${(tableRes.startTime || '').slice(0,5)}: ${escapeHtml(tableRes.customerName || 'Khách đặt')})` : ''}!<br><br>Vui lòng hủy ca đặt trước hoặc chuyển sang bàn khác trước khi xóa bàn.`,
            confirmButtonColor: '#d33'
        });
        return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa ${tableName}?`)) return;
    try {
        await fetchWithAuth(`/api/v1/tables/${id}`, { method: 'DELETE' });
        showAlert("Xóa bàn thành công!", "success");
        loadTables();
    } catch (err) {
        showAlert("Xóa bàn thất bại: " + err.message, "error");
    }
}

// -------------------------------------------------------------
// 9. MODULE 6: ORDER MANAGEMENT & DETAILED VIEWER
// -------------------------------------------------------------
let allOrdersData = [];

async function loadOrders() {
    try {
        const [res, invRes] = await Promise.all([
            fetchWithAuth('/api/v1/orders/all'),
            fetchWithAuth('/api/v1/invoices/all').catch(() => ({ data: [] }))
        ]);
        allOrdersData = res.data || [];
        if (invRes && invRes.data) {
            allInvoicesData = invRes.data;
        }
        filterOrders();
    } catch (err) {
        showAlert("Không thể tải danh sách đơn hàng: " + err.message, "error");
    }
}

function getOrderEffectiveDates(o) {
    const matchedInv = (allInvoicesData || []).find(inv =>
        (inv.orderId && inv.orderId === o.id) || (o.orderCode && inv.orderCode === o.orderCode)
    );
    const createdStr = o.createdAt || o.orderDate;
    const completedStr = o.completedAt || (matchedInv ? (matchedInv.issuedAt || matchedInv.paidAt || matchedInv.createdAt) : null) || (o.status === 'COMPLETED' ? o.updatedAt : null);
    return {
        createdStr,
        completedStr,
        displayStr: completedStr || createdStr
    };
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Chưa có đơn hàng nào phù hợp</td></tr>`;
        renderPaginationControls('ordersPagination', 0, 'orders', 'filterOrders');
        return;
    }

    const state = paginationState.orders;
    const paginatedData = orders.slice((state.page - 1) * state.size, state.page * state.size);

    tbody.innerHTML = paginatedData.map((o, idx) => {
        const dates = getOrderEffectiveDates(o);
        const createdFormatted = formatDate(dates.createdStr);
        const completedFormatted = dates.completedStr ? formatDate(dates.completedStr) : null;
        const showBothDates = completedFormatted && dates.createdStr &&
            new Date(dates.createdStr).toDateString() !== new Date(dates.completedStr).toDateString();

        return `
        <tr>
            <td>${(state.page - 1) * state.size + idx + 1}</td>
            <td><strong>#${o.orderCode || o.id}</strong></td>
            <td>${o.tableName || ('Bàn ' + (o.tableId || '-'))}</td>
            <td><i class="mdi mdi-account-circle me-1 text-primary"></i>${escapeHtml(o.username || o.userName || 'Nhân viên')}</td>
            <td class="text-success font-weight-bold">${formatMoney(o.subtotal)}</td>
            <td><span class="badge ${getOrderBadgeClass(o.status)}">${translateOrderStatus(o.status)}</span></td>
            <td>
                ${completedFormatted || createdFormatted}
                ${showBothDates ? `<br><small class="text-muted">(Mở đơn: ${createdFormatted})</small>` : ''}
            </td>
            <td>
                <button class="btn btn-sm btn-outline-info" onclick="viewOrderDetails(${o.id})">
                    <i class="mdi mdi-eye"></i> Chi tiết đơn
                </button>
            </td>
        </tr>
        `;
    }).join('');
    
    renderPaginationControls('ordersPagination', orders.length, 'orders', 'filterOrders');
}

function parseLocalDateBoundary(dateStr, isEnd) {
    if (!dateStr) return isEnd ? new Date(2100, 11, 31, 23, 59, 59, 999) : new Date(2000, 0, 1, 0, 0, 0, 0);
    const parts = dateStr.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0])) {
        return isEnd
            ? new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999)
            : new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    }
    const d = new Date(dateStr);
    if (isEnd) d.setHours(23, 59, 59, 999);
    else d.setHours(0, 0, 0, 0);
    return d;
}

window.filterOrders = function(resetPage = false) {
    if (resetPage === true) {
        paginationState.orders.page = 1;
    }
    const status = document.getElementById('orderStatusFilter').value;
    const fromStr = document.getElementById('orderDateFrom').value;
    const toStr = document.getElementById('orderDateTo').value;

    let filtered = [...allOrdersData];

    if (status) {
        filtered = filtered.filter(o => o.status === status);
    }

    if (fromStr || toStr) {
        const fromDate = parseLocalDateBoundary(fromStr, false);
        const toDate = parseLocalDateBoundary(toStr, true);

        filtered = filtered.filter(o => {
            const dates = getOrderEffectiveDates(o);
            const cDate = dates.createdStr ? new Date(dates.createdStr) : null;
            const compDate = dates.completedStr ? new Date(dates.completedStr) : null;
            const matchCreated = cDate && !isNaN(cDate) && cDate >= fromDate && cDate <= toDate;
            const matchCompleted = compDate && !isNaN(compDate) && compDate >= fromDate && compDate <= toDate;
            return matchCreated || matchCompleted;
        });
    }

    // Sắp xếp trên xuống dưới (mới nhất lên đầu)
    filtered.sort((a, b) => {
        const da = new Date(getOrderEffectiveDates(a).displayStr || 0);
        const db = new Date(getOrderEffectiveDates(b).displayStr || 0);
        return db - da;
    });
    
    // Cập nhật thông số thống kê tổng tiền đơn hàng
    const orderBadge = document.getElementById('ordersSummaryBadge');
    if (orderBadge) {
        const activeOrders = filtered.filter(o => o.status !== 'CANCELLED');
        const totalMoney = activeOrders.reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0);
        orderBadge.innerHTML = `
            <span>Đang hiển thị <b>${filtered.length}</b> đơn hàng (trong đó có <b>${activeOrders.length}</b> đơn hợp lệ)</span>
            <span>Tổng tiền đơn hàng: <strong class="text-success font-weight-bold" style="font-size: 15px;">${formatMoney(totalMoney)}</strong></span>
        `;
    }

    renderOrdersTable(filtered);
};

async function viewOrderDetails(id) {
    try {
        const res = await fetchWithAuth(`/api/v1/orders/${id}`);
        const order = res.data;
        if (!order) return;

        document.getElementById('modalOrderCode').textContent = order.orderCode || order.id;
        document.getElementById('modalOrderTable').textContent = order.tableName || ('Bàn ' + (order.tableId || '-'));
        document.getElementById('modalOrderUser').textContent = order.userName || order.customerName || 'Nhân viên';
        document.getElementById('modalOrderStatus').textContent = translateOrderStatus(order.status);
        document.getElementById('modalOrderTotal').textContent = formatMoney(order.subtotal);
        document.getElementById('modalOrderDate').textContent = formatDate(order.createdAt || order.orderDate);

        const itemsBody = document.getElementById('modalOrderItemsBody');
        
        // Lấy danh sách món ăn từ API riêng
        let items = [];
        try {
            const itemsRes = await fetchWithAuth(`/api/v1/order-items/order/${id}`);
            items = itemsRes.data || [];
        } catch (e) {
            console.warn("Không tải được chi tiết món ăn:", e);
        }

        if (items.length === 0) {
            itemsBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Không có chi tiết món ăn nào trong đơn này</td></tr>`;
        } else {
            itemsBody.innerHTML = items.map((it, i) => {
                const prodName = it.productName || (it.product ? it.product.name : 'Món ăn');
                const price = it.unitPrice || it.price || 0;
                const qty = it.quantity || 1;
                const itemTotal = it.subtotal || (price * qty);
                return `
                <tr>
                    <td>${i + 1}</td>
                    <td><strong>${escapeHtml(prodName)}</strong></td>
                    <td class="text-end">${formatMoney(price)}</td>
                    <td class="text-center"><strong>${qty}</strong></td>
                    <td class="text-end text-success font-weight-bold">${formatMoney(itemTotal)}</td>
                </tr>
                `;
            }).join('');
        }

        window.currentViewingOrder = order;
        window.currentViewingOrderItems = items;

        const printBtn = document.getElementById('printOrderReceiptBtn');
        if (printBtn) {
            if (order.status === 'COMPLETED') {
                printBtn.innerHTML = '<i class="mdi mdi-printer me-1"></i> In lại hóa đơn';
                printBtn.className = 'btn btn-primary';
            } else {
                printBtn.innerHTML = '<i class="mdi mdi-printer me-1"></i> In phiếu tạm tính';
                printBtn.className = 'btn btn-outline-primary';
            }
        }

        $('#orderDetailsModal').modal('show');
    } catch (err) {
        showAlert("Không thể tải chi tiết đơn hàng: " + err.message, "error");
    }
}

async function updateOrderStatus(id, newStatus) {
    try {
        await fetchWithAuth(`/api/v1/orders/${id}/status?status=${newStatus}`, { method: 'PUT' });
        showAlert("Cập nhật trạng thái đơn hàng thành công!", "success");
        loadOrders();
    } catch (err) {
        showAlert("Cập nhật trạng thái thất bại: " + err.message, "error");
    }
}

// -------------------------------------------------------------
// 10. MODULE 7: INVOICE & PAYMENT MANAGEMENT & INVOICE DETAILS
// -------------------------------------------------------------
let allInvoicesData = [];

async function loadInvoices() {
    try {
        const res = await fetchWithAuth('/api/v1/invoices/all');
        allInvoicesData = res.data || [];
        filterInvoices();
    } catch (err) {
        showAlert("Không thể tải danh sách hóa đơn: " + err.message, "error");
    }
}

function renderInvoicesTable(invoices) {
    const tbody = document.getElementById('invoicesTableBody');
    if (!tbody) return;

    if (invoices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Chưa có hóa đơn nào phù hợp</td></tr>`;
        renderPaginationControls('invoicesPagination', 0, 'invoices', 'filterInvoices');
        return;
    }

    const state = paginationState.invoices;
    const paginatedData = invoices.slice((state.page - 1) * state.size, state.page * state.size);

    tbody.innerHTML = paginatedData.map((inv, idx) => `
        <tr>
            <td>${(state.page - 1) * state.size + idx + 1}</td>
            <td><strong>#${inv.invoiceCode || inv.id}</strong></td>
            <td>#${inv.orderCode || inv.orderId || '-'}</td>
            <td>${formatMoney(inv.subtotal || inv.totalAmount)}</td>
            <td class="text-danger">-${formatMoney(inv.discountAmount || 0)}</td>
            <td class="text-success font-weight-bold">${formatMoney(inv.totalAmount || inv.finalAmount)}</td>
            <td><span class="badge ${inv.status === 'PAID' ? 'bg-success' : 'bg-warning text-dark'}">${inv.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-info" onclick="viewInvoiceDetails(${inv.id})">
                    <i class="mdi mdi-eye"></i> Chi tiết
                </button>
                ${inv.status !== 'PAID' ? `
                    <button class="btn btn-sm btn-success ms-1" onclick="updateInvoiceStatus(${inv.id}, 'PAID')">
                        <i class="mdi mdi-cash-register"></i> Thanh toán
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
    
    renderPaginationControls('invoicesPagination', invoices.length, 'invoices', 'filterInvoices');
}

window.filterInvoices = function(resetPage = false) {
    if (resetPage === true) {
        paginationState.invoices.page = 1;
    }
    const status = document.getElementById('invoiceStatusFilter') ? document.getElementById('invoiceStatusFilter').value : '';
    const fromStr = document.getElementById('invoiceDateFrom') ? document.getElementById('invoiceDateFrom').value : '';
    const toStr = document.getElementById('invoiceDateTo') ? document.getElementById('invoiceDateTo').value : '';

    let filtered = [...allInvoicesData];

    if (status) {
        filtered = filtered.filter(inv => inv.status === status);
    }

    if (fromStr || toStr) {
        const fromDate = parseLocalDateBoundary(fromStr, false);
        const toDate = parseLocalDateBoundary(toStr, true);

        filtered = filtered.filter(inv => {
            const d = new Date(inv.issuedAt || inv.createdAt || inv.paidAt);
            return d >= fromDate && d <= toDate;
        });
    }

    // Sắp xếp trên xuống dưới (mới nhất lên đầu)
    filtered.sort((a, b) => new Date(b.issuedAt || b.createdAt || b.paidAt) - new Date(a.issuedAt || a.createdAt || a.paidAt));
    
    // Cập nhật thông số thống kê tổng tiền hóa đơn
    const invoiceBadge = document.getElementById('invoicesSummaryBadge');
    if (invoiceBadge) {
        const paidInvoices = filtered.filter(inv => inv.status === 'PAID');
        const totalActualRevenue = paidInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount || inv.finalAmount) || 0), 0);
        const totalInitialSubtotal = paidInvoices.reduce((sum, inv) => sum + (Number(inv.subtotal) || 0), 0);
        const totalDiscount = paidInvoices.reduce((sum, inv) => sum + (Number(inv.discountAmount) || 0), 0);
        invoiceBadge.innerHTML = `
            <span>Đang hiển thị <b>${filtered.length}</b> hóa đơn (<b>${paidInvoices.length}</b> đã thanh toán)</span>
            <span>Thực thu: <strong class="text-success font-weight-bold" style="font-size: 15px;">${formatMoney(totalActualRevenue)}</strong> <small class="text-muted">(Gốc: ${formatMoney(totalInitialSubtotal)}${totalDiscount > 0 ? `, Giảm: -${formatMoney(totalDiscount)}` : ''})</small></span>
        `;
    }

    renderInvoicesTable(filtered);
};

async function viewInvoiceDetails(id) {
    try {
        const res = await fetchWithAuth(`/api/v1/invoices/${id}`);
        const inv = res.data;
        if (!inv) return;

        document.getElementById('modalInvoiceCode').textContent = inv.invoiceCode || inv.id;
        document.getElementById('modalInvoiceOrderCode').textContent = inv.orderCode || inv.orderId || '-';
        document.getElementById('modalInvoiceCustomer').textContent = inv.customerName ? `${inv.customerName} (${inv.customerPhone || ''})` : 'Khách lẻ / Trực tiếp';
        
        // Lấy tên nhân viên order
        let orderStaff = inv.orderStaffName;
        if (!orderStaff && inv.orderId) {
            const matchedOrder = allOrdersData.find(o => o.id === inv.orderId);
            if (matchedOrder && matchedOrder.username) {
                orderStaff = matchedOrder.username;
            }
        }
        const staffEl = document.getElementById('modalInvoiceStaff');
        if (staffEl) staffEl.textContent = orderStaff || 'Nhân viên order';

        // Lấy tên thu ngân
        const cashierEl = document.getElementById('modalInvoiceCashier');
        if (cashierEl) cashierEl.textContent = getCashierDisplayNameAdmin(inv.cashierName);

        document.getElementById('modalInvoiceTable').textContent = inv.tableName || ('Bàn ' + (inv.tableId || '-'));
        document.getElementById('modalInvoiceDate').textContent = formatDate(inv.issuedAt || inv.paidAt);
        document.getElementById('modalInvoicePaymentMethod').textContent = inv.paymentMethod || 'Tiền mặt';
        document.getElementById('modalInvoiceStatus').textContent = inv.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán';
        document.getElementById('modalInvoiceStatus').className = `badge ${inv.status === 'PAID' ? 'bg-success' : 'bg-warning text-dark'}`;

        document.getElementById('modalInvoiceSubtotal').textContent = formatMoney(inv.subtotal || inv.totalAmount);
        document.getElementById('modalInvoiceDiscount').textContent = `-${formatMoney(inv.discountAmount || 0)} (${inv.discountPercent || 0}%)`;
        document.getElementById('modalInvoiceFinalTotal').textContent = formatMoney(inv.totalAmount || inv.finalAmount);

        const itemsBody = document.getElementById('modalInvoiceItemsBody');
        const items = inv.items || inv.invoiceItems || [];

        if (items.length === 0) {
            itemsBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Không có chi tiết món ăn</td></tr>`;
        } else {
            itemsBody.innerHTML = items.map((it, i) => {
                const pName = it.productName || (it.product ? it.product.name : 'Món ăn');
                const price = it.unitPrice || it.price || 0;
                const qty = it.quantity || 1;
                const total = it.totalPrice || (price * qty);
                return `
                <tr>
                    <td>${i + 1}</td>
                    <td><strong>${escapeHtml(pName)}</strong></td>
                    <td class="text-end">${formatMoney(price)}</td>
                    <td class="text-center"><strong>${qty}</strong></td>
                    <td class="text-end text-success font-weight-bold">${formatMoney(total)}</td>
                </tr>
                `;
            }).join('');
        }

        document.getElementById('printInvoiceBtn').onclick = () => printInvoiceWindow(inv);

        $('#invoiceDetailsModal').modal('show');
    } catch (err) {
        showAlert("Không thể tải chi tiết hóa đơn: " + err.message, "error");
    }
}

// =============================================================
// THERMAL RECEIPT PRINTER (PHIẾU IN NHIỆT CHUẨN POS 80MM)
// =============================================================
function generateThermalReceiptHtml(data) {
    const isPaid = data.status === 'PAID' || data.isPaid === true;
    const isReprint = data.isReprint === true || data.title === 'HÓA ĐƠN IN LẠI';
    const title = data.title || (isReprint ? 'HÓA ĐƠN IN LẠI' : (isPaid ? 'HÓA ĐƠN THANH TOÁN' : 'PHIẾU TẠM TÍNH'));
    const notice = data.notice || (isReprint ? '(Bản in lại)' : (isPaid ? '(Quý khách vui lòng kiểm tra lại hóa đơn)' : '(Quý khách vui lòng kiểm tra món trước khi thanh toán)'));
    const statusText = data.statusText || (isReprint ? '*** HÓA ĐƠN IN LẠI (ĐÃ THANH TOÁN) ***' : (isPaid ? '*** ĐÃ THANH TOÁN ***' : '*** CHƯA THANH TOÁN ***'));
    const timeLabel = data.timeLabel || (isReprint ? 'Giờ in lại' : (isPaid ? 'Giờ thanh toán' : 'Giờ in tạm tính'));
    const timeValue = data.timeValue || new Date().toLocaleString('vi-VN');

    let itemsHtml = (data.items || []).map((it, i) => {
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
                <td style="padding: 6px 2px; text-align: right;">${Number(price).toLocaleString('vi-VN')}</td>
                <td style="padding: 6px 2px; text-align: right; font-weight: bold;">${Number(total).toLocaleString('vi-VN')}</td>
            </tr>
        `;
    }).join('');

    if (!itemsHtml) {
        itemsHtml = `<tr><td colspan="4" style="text-align:center; padding:10px; color:#888;">(Không có món ăn)</td></tr>`;
    }

    const subtotal = Number(data.subtotal) || 0;
    const discountAmount = Number(data.discountAmount) || 0;
    const discountPercent = Number(data.discountPercent) || 0;
    const depositAmount = Number(data.depositAmount) || 0;
    const totalAmount = Number(data.totalAmount) || (subtotal - discountAmount - depositAmount);

    let discountLabel = 'Giảm giá';
    if (discountPercent > 0) discountLabel += ` (${discountPercent}%)`;
    discountLabel += ':';

    const displayInvCode = data.invoiceCode ? (String(data.invoiceCode).startsWith('#') ? escapeHtml(data.invoiceCode) : ('#' + escapeHtml(data.invoiceCode))) : '';
    const displayOrdCode = (data.orderCode && data.orderCode !== '-') ? (String(data.orderCode).startsWith('#') ? escapeHtml(data.orderCode) : ('#' + escapeHtml(data.orderCode))) : '';

    return `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <title>${escapeHtml(title)} - ${escapeHtml(data.tableName || '')}</title>
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
                        <div class="bill-title">${escapeHtml(title)}</div>
                        <div class="bill-notice">${escapeHtml(notice)}</div>
                    </div>
                </div>

                <div class="meta-info">
                    <p><strong>Bàn:</strong> <span style="font-size: 14px; font-weight: 900;">${escapeHtml(data.tableName || '-')}</span></p>
                    ${displayInvCode ? `<p style="margin: 2px 0; font-weight: bold;">${displayInvCode}</p>` : ''}
                    ${displayOrdCode ? `<p style="margin: 2px 0; font-weight: bold;">${displayOrdCode}</p>` : ''}
                    <p><strong>Khách hàng:</strong> ${escapeHtml(data.customerName || 'Khách vãng lai')}</p>
                    <p><strong>Nhân viên order:</strong> ${escapeHtml(data.orderStaffName || 'Nhân viên order')}</p>
                    <p><strong>Thu ngân:</strong> ${escapeHtml(data.cashierName || getCashierDisplayNameAdmin())}</p>
                    <p><strong>Thời gian vào:</strong> ${escapeHtml(data.timeIn || 'Chưa ghi nhận')}</p>
                    <p><strong>${isPaid ? 'Thời gian ra' : (data.timeOut ? 'Thời gian ra' : escapeHtml(timeLabel))}:</strong> ${escapeHtml(data.timeOut || timeValue)}</p>
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
                        <span>${subtotal.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    ${discountAmount > 0 ? `
                    <div class="total-row">
                        <span>${escapeHtml(discountLabel)}</span>
                        <span>- ${discountAmount.toLocaleString('vi-VN')} ₫</span>
                    </div>` : ''}
                    ${depositAmount > 0 ? `
                    <div class="total-row">
                        <span>Đã cọc trước:</span>
                        <span>- ${depositAmount.toLocaleString('vi-VN')} ₫</span>
                    </div>` : ''}
                    <div class="total-row grand-total">
                        <span>${isPaid ? 'THỰC THU:' : 'TỔNG TẠM TÍNH:'}</span>
                        <span>${totalAmount.toLocaleString('vi-VN')} ₫</span>
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
                        <img src="https://img.vietqr.io/image/MB-0329170061-compact2.png?amount=${totalAmount}&addInfo=${encodeURIComponent('TT ' + (data.tableName || '') + ' ' + (data.invoiceCode ? ('HD' + data.invoiceCode) : ('ORD' + (data.orderCode || ''))))}&accountName=BUI%20DINH%20TRUONG" 
                             alt="QR Thanh Toán Chủ Quán" 
                             style="width: 140px; height: 140px; display: block; margin: 0 auto;"
                             onerror="this.onerror=null; this.src='https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=https%3A%2F%2Fimg.vietqr.io%2Fimage%2FMB-0329170061-compact2.png%3Famount%3D${totalAmount}%26accountName%3DBUI%2520DINH%2520TRUONG';" />
                    </div>
                    <div style="font-size: 10px; color: #555; margin-top: 3px; font-style: italic;">
                        (Hỗ trợ mọi App Ngân hàng & Ví MoMo, ZaloPay)
                    </div>
                </div>

                <div class="footer">
                    <p style="margin: 3px 0; font-weight: bold; font-size: 12px;">${statusText}</p>
                    ${data.paymentMethod ? `<p style="margin: 2px 0;">Phương thức TT: <strong>${escapeHtml(data.paymentMethod)}</strong></p>` : ''}
                    <p style="margin: 3px 0;">Xin Quý khách kiểm tra kỹ danh sách món ăn & số tiền.</p>
                    <p style="margin: 2px 0; font-weight: bold;">Cảm ơn Quý khách & Hẹn gặp lại!</p>
                </div>
            </body>
        </html>
    `;
}

function printThermalReceiptWindow(html) {
    const printWindow = window.open('', '', 'height=680,width=420');
    if (!printWindow) {
        alert("Vui lòng cho phép popup trình duyệt để in hóa đơn!");
        return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 450);
}

async function printInvoiceWindow(inv) {
    let items = inv.items || inv.invoiceItems || [];
    if ((!items || items.length === 0) && inv.orderId) {
        try {
            const itemRes = await fetchWithAuth(`/api/v1/order-items/order/${inv.orderId}`);
            items = itemRes.data || [];
        } catch(e) {}
    }

    let matchedOrder = (allOrdersData || []).find(o => o.id === inv.orderId || o.orderCode === inv.orderCode);
    if (!matchedOrder && inv.orderId) {
        try {
            const ordRes = await fetchWithAuth(`/api/v1/orders/${inv.orderId}`);
            if (ordRes && ordRes.data) matchedOrder = ordRes.data;
        } catch(e) {}
    }

    const orderStaffName = inv.orderStaffName || (matchedOrder ? (matchedOrder.username || matchedOrder.userName) : '') || 'Nhân viên phục vụ';
    const cashierName = getCashierDisplayNameAdmin(inv.cashierName);
    const tableName = inv.tableName || (matchedOrder ? matchedOrder.tableName : '') || ('Bàn #' + (inv.tableId || '-'));
    const customerName = inv.customerName || (matchedOrder ? matchedOrder.customerName : '') || 'Khách vãng lai';
    const orderCode = inv.orderCode || (matchedOrder ? matchedOrder.orderCode : '') || ('ORD' + (inv.orderId || ''));
    const isPaid = inv.status === 'PAID';

    const timeInRaw = (matchedOrder && (matchedOrder.createdAt || matchedOrder.orderDate)) || inv.createdAt || inv.issuedAt;
    const timeIn = formatReceiptDateTime(timeInRaw, inv.issuedAt || new Date());
    const timeOut = formatReceiptDateTime(inv.paidAt || inv.issuedAt, new Date());

    const html = generateThermalReceiptHtml({
        title: isPaid ? 'HÓA ĐƠN IN LẠI' : 'PHIẾU TẠM TÍNH',
        notice: isPaid ? '(Bản in lại)' : '(Quý khách vui lòng kiểm tra món trước khi thanh toán)',
        tableName: tableName,
        orderCode: orderCode,
        invoiceCode: inv.invoiceCode || inv.id,
        customerName: customerName,
        orderStaffName: orderStaffName,
        cashierName: cashierName,
        timeIn: timeIn,
        timeOut: isPaid ? timeOut : null,
        timeLabel: isPaid ? 'Giờ in lại' : 'Giờ xuất phiếu',
        timeValue: isPaid ? timeOut : formatDate(new Date()),
        items: items,
        subtotal: inv.subtotal || inv.totalAmount || 0,
        discountPercent: inv.discountPercent || 0,
        discountAmount: inv.discountAmount || 0,
        totalAmount: inv.totalAmount || inv.finalAmount || 0,
        status: inv.status,
        statusText: isPaid ? '*** HÓA ĐƠN IN LẠI (ĐÃ THANH TOÁN) ***' : '*** CHƯA THANH TOÁN ***',
        isReprint: isPaid,
        paymentMethod: inv.paymentMethod || (isPaid ? 'Tiền mặt' : '')
    });

    printThermalReceiptWindow(html);
}

window.quickPrintInvoiceAdmin = async function(invId) {
    try {
        const res = await fetchWithAuth(`/api/v1/invoices/${invId}`);
        if (res && res.data) {
            printInvoiceWindow(res.data);
        }
    } catch (e) {
        showAlert("Không thể in hóa đơn: " + e.message, "error");
    }
};

window.printCurrentOrderReceiptAdmin = async function() {
    if (!window.currentViewingOrder) {
        showAlert("Không tìm thấy thông tin đơn hàng đang xem!", "error");
        return;
    }
    const order = window.currentViewingOrder;
    const items = window.currentViewingOrderItems || [];

    // Tìm hóa đơn liên kết nếu có
    let matchedInv = (allInvoicesData || []).find(inv => inv.orderId === order.id || inv.orderCode === order.orderCode);
    if (!matchedInv) {
        try {
            const invRes = await fetchWithAuth(`/api/v1/invoices/all`);
            if (invRes && invRes.data) {
                matchedInv = invRes.data.find(inv => inv.orderId === order.id || inv.orderCode === order.orderCode);
            }
        } catch(e) {}
    }

    if (matchedInv) {
        printInvoiceWindow(matchedInv);
    } else {
        const cashierName = getCashierDisplayNameAdmin();
        const orderStaffName = order.username || order.userName || 'Nhân viên order';
        const tableName = order.tableName || ('Bàn ' + (order.tableId || '-'));
        const customerName = order.customerName || 'Khách vãng lai';

        let depositAmount = 0;
        if (order.note && order.note.includes('Đã cọc:')) {
            const match = order.note.match(/Đã cọc:\s*(\d+)/);
            if (match && match[1]) {
                depositAmount = parseInt(match[1]);
            }
        }

        const isCompleted = order.status === 'COMPLETED';
        const timeIn = formatReceiptDateTime(order.createdAt || order.orderDate, new Date());
        const timeOut = isCompleted ? formatReceiptDateTime(order.completedAt || order.updatedAt, new Date()) : new Date().toLocaleString('vi-VN');

        const html = generateThermalReceiptHtml({
            title: isCompleted ? 'HÓA ĐƠN IN LẠI' : 'PHIẾU TẠM TÍNH',
            notice: isCompleted ? '(Bản in lại)' : '(Quý khách vui lòng kiểm tra món trước khi thanh toán)',
            tableName: tableName,
            orderCode: order.orderCode || order.id,
            invoiceCode: null,
            customerName: customerName,
            orderStaffName: orderStaffName,
            cashierName: cashierName,
            timeIn: timeIn,
            timeOut: isCompleted ? timeOut : null,
            timeLabel: isCompleted ? 'Giờ in lại' : 'Giờ in tạm tính',
            timeValue: timeOut,
            items: items,
            subtotal: order.subtotal || 0,
            discountAmount: 0,
            depositAmount: depositAmount,
            totalAmount: (order.subtotal || 0) - depositAmount,
            status: isCompleted ? 'PAID' : 'PENDING',
            statusText: isCompleted ? '*** HÓA ĐƠN IN LẠI (ĐÃ THANH TOÁN) ***' : '*** CHƯA THANH TOÁN ***',
            isReprint: isCompleted,
            paymentMethod: isCompleted ? 'Tiền mặt' : ''
        });

        printThermalReceiptWindow(html);
    }
};

async function updateInvoiceStatus(id, newStatus) {
    try {
        await fetchWithAuth(`/api/v1/invoices/${id}/status?status=${newStatus}`, { method: 'PUT' });
        showAlert("Cập nhật trạng thái hóa đơn thành công!", "success");
        loadInvoices();
    } catch (err) {
        showAlert("Cập nhật thất bại: " + err.message, "error");
    }
}

// -------------------------------------------------------------
// 11. MODULE 8: REVENUE & REPORTS (ROBUST DEFAULT DATES & DTO SUPPORT)
// -------------------------------------------------------------
function getCashierLoginTimeAdmin() {
    const saved = localStorage.getItem('shiftOpeningTime') || localStorage.getItem('shiftLoginTime') || localStorage.getItem('loginTime') || localStorage.getItem('cashierLoginTime');
    if (saved) {
        const d = new Date(saved);
        if (!isNaN(d.getTime())) return d;
    }
    try {
        const token = localStorage.getItem('token');
        if (token) {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            const payload = JSON.parse(jsonPayload);
            if (payload && payload.iat) {
                const tokenDate = new Date(payload.iat * 1000);
                if (!isNaN(tokenDate.getTime())) {
                    localStorage.setItem('loginTime', tokenDate.toISOString());
                    return tokenDate;
                }
            }
        }
    } catch(e) {}
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return startOfToday;
}

async function loadReports() {
    await populateReportCashiers();
    await loadTodayCashierShifts();
    
    // Khởi tạo thời gian hôm nay theo THỜI GIAN THỰC TẾ
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const formatDtLocal = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    const startInput = document.getElementById('reportShiftStart');
    const endInput = document.getElementById('reportShiftEnd');

    if (startInput && !startInput.value) {
        // Tìm giờ mở ca thực tế đầu tiên hôm nay (hoặc 06:00 sáng)
        let earliestStart = null;
        try {
            const shiftOpTime = localStorage.getItem('shiftOpeningTime');
            if (shiftOpTime && shiftOpTime.startsWith(todayStr)) {
                earliestStart = new Date(shiftOpTime);
            }
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('activeCashierShift')) {
                    const act = JSON.parse(localStorage.getItem(k));
                    if (act && act.shiftStartTime && act.shiftStartTime.startsWith(todayStr)) {
                        const d = new Date(act.shiftStartTime);
                        if (!earliestStart || d < earliestStart) earliestStart = d;
                    }
                }
            }
        } catch(e) {}
        if (!earliestStart) {
            earliestStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0);
        }
        startInput.value = formatDtLocal(earliestStart);
    }

    // Giờ kết ca mặc định: thời gian THỰC TẾ hiện tại, TUYỆT ĐỐI không để tới 23:59 (00h đêm)
    if (endInput && !endInput.value) {
        endInput.value = formatDtLocal(now);
    }

    handleFetchReport();
}

function isCashierShiftClosedToday(cashierName) {
    try {
        const pad = n => String(n).padStart(2, '0');
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const cLower = (cashierName || '').trim().toLowerCase();

        const closedList = JSON.parse(localStorage.getItem('closedCashierShifts_' + todayStr) || '[]');
        const closedMatches = closedList.filter(s => (s.cashierName || '').trim().toLowerCase() === cLower);

        // Kiểm tra xem có ca mở active nào thực sự chưa kết thúc hay không
        let hasActiveShift = false;
        const checkActive = (val) => {
            if (val && val.status === 'OPEN' && (val.cashierName || '').trim().toLowerCase() === cLower) {
                const alreadyClosed = closedMatches.some(cs => 
                    cs.shiftStartTime === val.shiftStartTime
                );
                if (!alreadyClosed) {
                    hasActiveShift = true;
                }
            }
        };

        const activeRaw = localStorage.getItem('activeCashierShift');
        if (activeRaw) {
            try { checkActive(JSON.parse(activeRaw)); } catch(e) {}
        }
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('activeCashierShift_')) {
                try { checkActive(JSON.parse(localStorage.getItem(k))); } catch(e) {}
            }
        }

        if (hasActiveShift) {
            return null; // Đang trong ca mở thực tế
        }

        return closedMatches.length > 0 ? closedMatches[closedMatches.length - 1] : null;
    } catch(e) {
        return null;
    }
}

window.closeCashierShiftAdmin = async function(cashierName, startStr) {
    const result = await Swal.fire({
        title: `Xác nhận chốt kết ca?`,
        html: `Bạn có chắc muốn chốt kết ca làm việc cho thu ngân <b>${escapeHtml(cashierName)}</b> vào thời điểm hiện tại?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '<i class="mdi mdi-check"></i> Chốt kết ca',
        cancelButtonText: 'Đóng',
        confirmButtonColor: '#28a745'
    });
    if (result.isConfirmed) {
        try {
            const pad = n => String(n).padStart(2, '0');
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
            const formatDtLocal = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            const nowLocal = formatDtLocal(now);
            const nowIso = now.toISOString();
            const key = 'closedCashierShifts_' + todayStr;
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            
            const adminCloser = getCashierDisplayNameAdmin();
            const cKey = (cashierName || '').trim().toLowerCase();
            const startMs = startStr ? new Date(startStr).getTime() : 0;

            // Kiểm tra và cập nhật bản ghi trong closedList
            const existingIdx = list.findIndex(s => {
                const sName = getCashierDisplayNameAdmin(s.cashierName).toLowerCase();
                const rawName = (s.cashierName || '').trim().toLowerCase();
                const nameMatch = (sName === cKey || rawName === cKey);
                if (!nameMatch) return false;
                if (s.shiftStartTime === startStr) return true;
                const sMs = new Date(s.shiftStartTime).getTime();
                return !isNaN(sMs) && !isNaN(startMs) && Math.abs(sMs - startMs) < 10 * 60 * 1000;
            });

            if (existingIdx >= 0) {
                list[existingIdx].shiftEndTime = nowLocal;
                list[existingIdx].closedAt = nowIso;
                list[existingIdx].status = 'CLOSED';
                list[existingIdx].openedBy = list[existingIdx].openedBy || cashierName;
                list[existingIdx].closedBy = adminCloser;
            } else {
                list.push({
                    id: 'shift_' + Date.now(),
                    cashierName: cashierName,
                    openedBy: cashierName,
                    closedBy: adminCloser,
                    shiftStartTime: startStr || nowLocal,
                    shiftEndTime: nowLocal,
                    closedAt: nowIso,
                    status: 'CLOSED'
                });
            }
            // Đảm bảo tất cả ca của thu ngân này trong closedList hôm nay đều ở trạng thái CLOSED
            list.forEach(s => {
                const sName = getCashierDisplayNameAdmin(s.cashierName).toLowerCase();
                const rawName = (s.cashierName || '').trim().toLowerCase();
                if (sName === cKey || rawName === cKey) {
                    s.status = 'CLOSED';
                    if (!s.shiftEndTime) s.shiftEndTime = nowLocal;
                    if (!s.closedBy) s.closedBy = adminCloser;
                }
            });
            localStorage.setItem(key, JSON.stringify(list));

            // Xóa khỏi registry đa ca activeCashierShifts_map
            let map = {};
            try { map = JSON.parse(localStorage.getItem('activeCashierShifts_map') || '{}') || {}; } catch(e) {}
            Object.keys(map).forEach(k => {
                const val = map[k];
                const vName = val ? getCashierDisplayNameAdmin(val.cashierName).toLowerCase() : '';
                const rawK = (k || '').trim().toLowerCase();
                if (rawK === cKey || vName === cKey) {
                    delete map[k];
                }
            });
            localStorage.setItem('activeCashierShifts_map', JSON.stringify(map));

            // Dọn dẹp an toàn CHỌN LỌC ca của thu ngân này trong localStorage
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (!k) continue;
                if (k === 'activeCashierShift' || k.startsWith('activeCashierShift_') || k.startsWith('activeShift_')) {
                    try {
                        const act = JSON.parse(localStorage.getItem(k));
                        if (act) {
                            const actName = getCashierDisplayNameAdmin(act.cashierName).toLowerCase();
                            const rawName = (act.cashierName || '').trim().toLowerCase();
                            if (actName === cKey || rawName === cKey || Object.keys(map).length === 0) {
                                localStorage.removeItem(k);
                            }
                        } else {
                            localStorage.removeItem(k);
                        }
                    } catch(e) {
                        localStorage.removeItem(k);
                    }
                }
            }

            // Dọn dẹp shiftOpening*
            const opCashier = (localStorage.getItem('shiftOpeningCashier') || '').trim().toLowerCase();
            const opDisp = getCashierDisplayNameAdmin(opCashier).toLowerCase();
            if (opCashier === cKey || opDisp === cKey || Object.keys(map).length === 0) {
                localStorage.removeItem('shiftOpeningCash');
                localStorage.removeItem('shiftOpeningCashier');
                localStorage.removeItem('shiftOpeningTime');
                localStorage.removeItem('shiftLoginTime');
                localStorage.removeItem('cashierLoginTime');
                localStorage.removeItem('activeCashierShift');
            } else {
                const remaining = Object.values(map);
                if (remaining.length > 0) {
                    localStorage.setItem('activeCashierShift', JSON.stringify(remaining[0]));
                    localStorage.setItem('shiftOpeningCash', remaining[0].openingCash || 0);
                    localStorage.setItem('shiftOpeningCashier', remaining[0].cashierName || '');
                    localStorage.setItem('shiftOpeningTime', remaining[0].shiftStartTime || '');
                }
            }

            // BroadcastChannel báo tin tới Order và POS lập tức
            try {
                const shiftBc = new BroadcastChannel('shift_sync_channel');
                shiftBc.postMessage({
                    type: 'SHIFT_CLOSED',
                    cashierName: cashierName,
                    cKey: cKey,
                    closedBy: adminCloser,
                    shiftStartTime: startStr,
                    shiftEndTime: nowLocal,
                    activeShiftsMap: map
                });
            } catch(e) {}

            // Đồng bộ trạng thái CLOSED lên Server DB (/api/v1/customers)
            try {
                const slug = (cashierName || 'cashier')
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
                    .toLowerCase().replace(/[^a-z0-9]/g, '');
                const custRes = await fetchWithAuth('/api/v1/customers');
                const custList = (custRes && custRes.data) || [];
                const targetPhones = new Set();
                targetPhones.add(('SH_' + (slug || 'c')).slice(0, 20));

                for (const c of custList) {
                    if (c.phone && c.phone.startsWith('SH_') && c.fullName && c.fullName.startsWith('{')) {
                        try {
                            const sData = JSON.parse(c.fullName);
                            const sName = getCashierDisplayNameAdmin(sData.c).toLowerCase();
                            const rawS = (sData.c || '').trim().toLowerCase();
                            if (sName === cKey || rawS === cKey || sData.st === 'OPEN') {
                                targetPhones.add(c.phone);
                            }
                        } catch(e) {}
                    }
                }

                for (const tPhone of targetPhones) {
                    await fetchWithAuth('/api/v1/customers/check-in', {
                        method: 'POST',
                        body: JSON.stringify({
                            phone: tPhone,
                            fullName: JSON.stringify({
                                c: cashierName,
                                b: cashierName,
                                cb: adminCloser,
                                s: startStr || nowLocal,
                                e: nowLocal,
                                st: 'CLOSED',
                                d: todayStr
                            })
                        })
                    }).catch(e => console.warn(e));
                }
            } catch(e) {
                console.warn("Lỗi sync server customer:", e);
            }

            Swal.fire({
                icon: 'success',
                title: 'Đã chốt kết ca thành công!',
                text: `Ca làm việc của thu ngân ${cashierName} đã được ghi nhận kết thúc.`,
                timer: 1600,
                showConfirmButton: false
            });
        } catch(err) {
            console.error("Lỗi khi chốt kết ca admin:", err);
        }
        await loadTodayCashierShifts();
        handleFetchReport(true);
    }
};

window.cleanUpCashierShiftsAdmin = async function() {
    const pad = n => String(n).padStart(2, '0');
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const filterInput = document.getElementById('shiftsFilterDate');
    const dateStr = (filterInput && filterInput.value) ? filterInput.value : todayStr;
    const closedKey = 'closedCashierShifts_' + dateStr;
    
    let closedList = JSON.parse(localStorage.getItem(closedKey) || '[]');
    if (!Array.isArray(closedList) || closedList.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Danh sách ca sạch sẽ',
            text: 'Hiện không có ca làm việc nào cần dọn dẹp trong ngày ' + dateStr,
            timer: 1600,
            showConfirmButton: false
        });
        return;
    }

    try {
        const res = await fetchWithAuth('/api/v1/invoices/all');
        const allInvoices = res.data || [];

        // Tìm các ca trống hoàn toàn không có đơn hàng nào (0 HĐ)
        const emptyShifts = [];
        closedList.forEach((s) => {
            const fromT = new Date(s.shiftStartTime).getTime() - 60000;
            const toT = new Date(s.shiftEndTime || s.closedAt).getTime() + 60000;
            const cLower = getCashierDisplayNameAdmin(s.cashierName).toLowerCase();
            const hasInv = allInvoices.some(inv => {
                if (inv.status !== 'PAID') return false;
                const pt = new Date(inv.paidAt || inv.issuedAt || inv.createdAt).getTime();
                return pt >= fromT && pt <= toT && getCashierDisplayNameAdmin(inv.cashierName).toLowerCase() === cLower;
            });
            if (!hasInv) {
                emptyShifts.push(s);
            }
        });

        const result = await Swal.fire({
            title: 'Dọn dẹp ca làm việc',
            html: `
                <div style="text-align: left; font-size: 14px;">
                    <p>Hiện có <b>${closedList.length} ca đã lưu</b> trong ngày <b>${dateStr}</b>.</p>
                    <p class="text-warning">👉 Tìm thấy <b>${emptyShifts.length} ca trống (0 đơn hàng)</b> do kiểm thử hoặc đóng mở nhiều lần.</p>
                    <p>Bạn có muốn dọn dẹp để bảng ca gọn gàng và số liệu chuẩn xác nhất không?</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: '<i class="mdi mdi-broom"></i> Xóa các ca 0 đơn hàng',
            denyButtonText: '<i class="mdi mdi-refresh"></i> Đặt lại chuẩn theo hóa đơn',
            cancelButtonText: 'Đóng',
            confirmButtonColor: '#28a745',
            denyButtonColor: '#0284c7'
        });

        if (result.isConfirmed) {
            const keepList = closedList.filter(s => !emptyShifts.includes(s));
            localStorage.setItem(closedKey, JSON.stringify(keepList));
            Swal.fire({
                icon: 'success',
                title: 'Đã dọn dẹp thành công!',
                text: `Đã dọn dẹp ${emptyShifts.length} ca trống không có giao dịch.`,
                timer: 1600,
                showConfirmButton: false
            });
            loadTodayCashierShifts(dateStr);
        } else if (result.isDenied) {
            localStorage.removeItem(closedKey);
            Swal.fire({
                icon: 'success',
                title: 'Đã hoàn tất làm mới!',
                text: 'Hệ thống đã tự động phân cụm ca chuẩn xác theo toàn bộ hóa đơn phát sinh.',
                timer: 1600,
                showConfirmButton: false
            });
            loadTodayCashierShifts(dateStr);
        }
    } catch(err) {
        Swal.fire({ icon: 'error', title: 'Lỗi', text: err.message });
    }
};

window.loadTodayCashierShifts = async function(selectedDateStr = null) {
    const body = document.getElementById('todayCashierShiftsBody');
    if (!body) return;

    const pad = n => String(n).padStart(2, '0');
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const formatDtLocal = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const formatTimeOnly = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

    let dateStr = selectedDateStr;
    const filterInput = document.getElementById('shiftsFilterDate');
    if (!dateStr) {
        dateStr = (filterInput && filterInput.value) ? filterInput.value : todayStr;
    }
    if (filterInput && filterInput.value !== dateStr) {
        filterInput.value = dateStr;
    }
    const isToday = (dateStr === todayStr);

    const dateLabel = document.getElementById('todayShiftsDateText');
    if (dateLabel) {
        const parts = dateStr.split('-');
        dateLabel.textContent = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
    }

    try {
        const res = await fetchWithAuth('/api/v1/invoices/all');
        const allInvoices = res.data || [];

        // 1. Lấy tất cả ca ĐÃ KẾT THÚC của ngày được chọn và CHUẨN HÓA DỮ LIỆU
        const closedKey = 'closedCashierShifts_' + dateStr;
        let closedList = JSON.parse(localStorage.getItem(closedKey) || '[]');

        // Dọn dẹp ca trùng lặp & loại bỏ ca giả lập synthetic 'recovered_' khỏi closedList
        if (Array.isArray(closedList) && closedList.length > 0) {
            closedList = closedList.filter(s => s && s.status === 'CLOSED' && !String(s.id).startsWith('recovered_'));

            // Sắp xếp theo shiftStartTime tăng dần
            closedList.sort((a, b) => new Date(a.shiftStartTime).getTime() - new Date(b.shiftStartTime).getTime());

            // Loại bỏ ca trùng shiftStartTime của cùng 1 thu ngân
            const cleanedList = [];
            const seenKeys = new Set();
            closedList.forEach(s => {
                const cName = getCashierDisplayNameAdmin(s.cashierName).toLowerCase();
                const startK = s.shiftStartTime || '';
                const dedupKey = `${cName}_${startK}`;
                if (!seenKeys.has(dedupKey)) {
                    seenKeys.add(dedupKey);
                    cleanedList.push(s);
                }
            });

            // Chuẩn hóa khung giờ để không bao giờ bị đè lấn (overlap) sang ca tiếp theo
            for (let i = 0; i < cleanedList.length - 1; i++) {
                const cur = cleanedList[i];
                const next = cleanedList[i + 1];
                if (getCashierDisplayNameAdmin(cur.cashierName).toLowerCase() === getCashierDisplayNameAdmin(next.cashierName).toLowerCase()) {
                    const curStartMs = new Date(cur.shiftStartTime).getTime();
                    const curEndMs = new Date(cur.shiftEndTime || cur.closedAt).getTime();
                    const nextStartMs = new Date(next.shiftStartTime).getTime();

                    // Nếu ca trước kết thúc sau khi ca sau đã bắt đầu -> điều chỉnh ca trước kết thúc tại lúc ca sau bắt đầu
                    if (curEndMs > nextStartMs && nextStartMs > curStartMs) {
                        cur.shiftEndTime = next.shiftStartTime;
                        cur.closedAt = new Date(nextStartMs).toISOString();
                    }
                }
            }

            closedList = cleanedList;
            try {
                localStorage.setItem(closedKey, JSON.stringify(closedList));
            } catch(e) {}
        }

        // 2. Lấy tất cả ca ĐANG MỞ (Active) nếu xem ngày hôm nay
        const activeList = [];
        if (isToday) {
            const seenActive = new Set();
            const addActiveShift = (val) => {
                if (!val || val.status !== 'OPEN' || !val.shiftStartTime) return;
                const cName = getCashierDisplayNameAdmin(val.cashierName);
                if (!cName) return;
                const uniqueKey = cName.toLowerCase();
                const rawKey = (val.cashierName || '').trim().toLowerCase();
                const valStartMs = new Date(val.shiftStartTime).getTime();

                // Kiểm tra xem ca này đã đóng chưa
                const alreadyClosed = closedList.some(cs => {
                    const csName = getCashierDisplayNameAdmin(cs.cashierName).toLowerCase();
                    const csRaw = (cs.cashierName || '').trim().toLowerCase();
                    const matchName = (csName === uniqueKey || csName === rawKey || csRaw === uniqueKey || csRaw === rawKey);
                    if (!matchName) return false;

                    // Khớp trực tiếp string
                    if (cs.shiftStartTime === val.shiftStartTime) return true;

                    const csStartMs = new Date(cs.shiftStartTime).getTime();
                    // Nếu thời gian bắt đầu chênh lệch dưới 10 phút -> cùng một ca
                    if (!isNaN(csStartMs) && !isNaN(valStartMs) && Math.abs(csStartMs - valStartMs) < 10 * 60 * 1000) return true;

                    // Nếu ca đóng có thời gian kết thúc hoặc đóng sau khi ca này bắt đầu -> ca này đã được chốt kết ca!
                    const csEndMs = new Date(cs.shiftEndTime || cs.closedAt).getTime();
                    if (!isNaN(csEndMs) && !isNaN(valStartMs) && csEndMs >= valStartMs - 60000) return true;

                    return false;
                });
                if (alreadyClosed) return;

                if (!seenActive.has(uniqueKey)) {
                    seenActive.add(uniqueKey);
                    activeList.push({
                        id: val.id || ('active_' + (val.shiftStartTime || Date.now())),
                        cashierName: cName,
                        openedBy: val.openedBy || cName,
                        closedBy: '',
                        shiftStartTime: val.shiftStartTime,
                        shiftEndTime: formatDtLocal(now),
                        openingCash: Number(val.openingCash || localStorage.getItem('shiftOpeningCash') || 0),
                        status: 'OPEN',
                        isClosed: false
                    });
                }
            };

            // a. Đồng bộ ca từ Server DB (/api/v1/customers) - bảo đảm thấy ca ngay lập tức dù mở hay kết ca ở trình duyệt khác / tab ẩn danh (Incognito)
            try {
                const custRes = await fetchWithAuth('/api/v1/customers');
                const custList = (custRes && custRes.data) || [];
                let closedUpdated = false;
                custList.forEach(c => {
                    if (c.phone && c.phone.startsWith('SH_') && c.fullName && c.fullName.startsWith('{')) {
                        try {
                            const shiftData = JSON.parse(c.fullName);
                            if (shiftData.st === 'CLOSED' && (!shiftData.d || shiftData.d === dateStr || (shiftData.s && shiftData.s.startsWith(dateStr)))) {
                                const cName = getCashierDisplayNameAdmin(shiftData.c);
                                const startK = shiftData.s || '';
                                const alreadyClosed = closedList.some(item => {
                                    const itemName = getCashierDisplayNameAdmin(item.cashierName).toLowerCase();
                                    const itemRaw = (item.cashierName || '').trim().toLowerCase();
                                    const matchName = (itemName === cName.toLowerCase() || itemRaw === cName.toLowerCase());
                                    if (!matchName) return false;
                                    if (item.shiftStartTime === startK) return true;
                                    const itStartMs = new Date(item.shiftStartTime).getTime();
                                    const sStartMs = new Date(startK).getTime();
                                    return !isNaN(itStartMs) && !isNaN(sStartMs) && Math.abs(itStartMs - sStartMs) < 10 * 60 * 1000;
                                });
                                if (!alreadyClosed) {
                                    closedList.push({
                                        id: 'server_closed_' + (shiftData.s || c.phone),
                                        cashierName: cName,
                                        openedBy: shiftData.b || cName,
                                        closedBy: shiftData.cb || 'Thu ngân',
                                        shiftStartTime: shiftData.s,
                                        shiftEndTime: shiftData.e || shiftData.s,
                                        closedAt: shiftData.e || new Date().toISOString(),
                                        openingCash: Number(shiftData.o) || 0,
                                        status: 'CLOSED'
                                    });
                                    closedUpdated = true;
                                }
                            } else if (shiftData.st === 'OPEN' && (!shiftData.d || shiftData.d === dateStr)) {
                                addActiveShift({
                                    id: 'server_' + (shiftData.s || c.phone),
                                    status: 'OPEN',
                                    shiftStartTime: shiftData.s,
                                    openingCash: Number(shiftData.o) || 0,
                                    cashierName: shiftData.c,
                                    openedBy: shiftData.b || shiftData.c
                                });
                            }
                        } catch(e) {}
                    }
                });
                if (closedUpdated) {
                    try { localStorage.setItem(closedKey, JSON.stringify(closedList)); } catch(e) {}
                }
            } catch(e) {}

            // b. Quét từ registry đa ca activeCashierShifts_map
            try {
                const mapRaw = localStorage.getItem('activeCashierShifts_map');
                if (mapRaw) {
                    const map = JSON.parse(mapRaw);
                    if (map && typeof map === 'object') {
                        Object.values(map).forEach(val => addActiveShift(val));
                    }
                }
            } catch(e) {}

            // b. Quét activeCashierShift
            try {
                const actRaw = localStorage.getItem('activeCashierShift');
                if (actRaw) addActiveShift(JSON.parse(actRaw));
            } catch(e) {}

            // c. Quét tất cả activeCashierShift_*
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('activeCashierShift_') && k !== 'activeCashierShifts_map') {
                    try {
                        addActiveShift(JSON.parse(localStorage.getItem(k)));
                    } catch(e) {}
                }
            }

            // d. Quét thêm nếu có shiftOpeningTime / shiftOpeningCashier
            const opTime = localStorage.getItem('shiftOpeningTime');
            const opCash = localStorage.getItem('shiftOpeningCash');
            const opCashier = localStorage.getItem('shiftOpeningCashier');
            if (opTime && opCash !== null && opCash !== undefined && opCashier) {
                addActiveShift({
                    status: 'OPEN',
                    shiftStartTime: opTime,
                    openingCash: Number(opCash) || 0,
                    cashierName: opCashier,
                    openedBy: opCashier
                });
            }
        }

        // 3. Lọc hóa đơn trong ngày được chọn
        const startOfDay = new Date(`${dateStr}T00:00:00`).getTime();
        const endOfDay = new Date(`${dateStr}T23:59:59.999`).getTime();
        const dayInvoices = allInvoices.filter(inv => {
            if (inv.status !== 'PAID') return false;
            const pt = new Date(inv.paidAt || inv.issuedAt || inv.createdAt).getTime();
            return !isNaN(pt) && pt >= startOfDay && pt <= endOfDay;
        });

        // 4. Nếu có ca đang mở (activeList) của thu ngân, tự động mở rộng shiftStartTime nếu có hóa đơn phát sinh trước mốc mở ca
        if (isToday && activeList.length > 0) {
            activeList.forEach(act => {
                const cNameLower = act.cashierName.toLowerCase();
                let latestClosedTime = startOfDay;
                closedList.forEach(cs => {
                    if (getCashierDisplayNameAdmin(cs.cashierName).toLowerCase() === cNameLower) {
                        const ct = new Date(cs.shiftEndTime || cs.closedAt || cs.shiftStartTime).getTime();
                        if (ct > latestClosedTime) latestClosedTime = ct;
                    }
                });

                dayInvoices.forEach(inv => {
                    if (getCashierDisplayNameAdmin(inv.cashierName).toLowerCase() === cNameLower) {
                        const pt = new Date(inv.paidAt || inv.issuedAt || inv.createdAt).getTime();
                        if (pt >= latestClosedTime) {
                            const curStart = new Date(act.shiftStartTime).getTime();
                            if (pt < curStart) {
                                act.shiftStartTime = formatDtLocal(new Date(pt));
                            }
                        }
                    }
                });
            });
        }

        // 5. Gom toàn bộ ca làm việc (ca đóng + ca mở)
        let allShifts = [];
        closedList.forEach((s, idx) => {
            allShifts.push({
                id: s.id || ('closed_' + idx + '_' + (s.shiftStartTime || '')),
                cashierName: getCashierDisplayNameAdmin(s.cashierName),
                openedBy: s.openedBy || s.cashierName,
                closedBy: s.closedBy || '',
                shiftStartTime: s.shiftStartTime,
                shiftEndTime: s.shiftEndTime || s.closedAt || formatDtLocal(now),
                openingCash: s.openingCash || 0,
                status: 'CLOSED',
                isClosed: true
            });
        });
        activeList.forEach(s => {
            allShifts.push({
                ...s,
                openedBy: s.openedBy || s.cashierName,
                closedBy: s.closedBy || ''
            });
        });

        // 6. Kiểm tra hóa đơn nào chưa thuộc vào ca nào đã ghi nhận
        const isInvoiceCovered = (inv) => {
            const pt = new Date(inv.paidAt || inv.issuedAt || inv.createdAt).getTime();
            const cName = getCashierDisplayNameAdmin(inv.cashierName).toLowerCase();
            return allShifts.some(s => {
                if (s.cashierName.toLowerCase() !== cName) return false;
                const fromT = new Date(s.shiftStartTime).getTime() - 60000;
                let toT = new Date(s.shiftEndTime).getTime();
                if (!s.isClosed) toT = Math.max(toT, Date.now() + 60000);
                else {
                    const tEnd = new Date(s.shiftEndTime);
                    tEnd.setSeconds(59, 999);
                    toT = tEnd.getTime() + 60000;
                }
                return pt >= fromT && pt <= toT;
            });
        };

        const orphanInvoicesByCashier = {};
        dayInvoices.forEach(inv => {
            if (!isInvoiceCovered(inv)) {
                const cName = getCashierDisplayNameAdmin(inv.cashierName);
                if (!orphanInvoicesByCashier[cName]) orphanInvoicesByCashier[cName] = [];
                orphanInvoicesByCashier[cName].push(inv);
            }
        });

        // 7. Khôi phục ca cho các hóa đơn chưa thuộc ca
        Object.keys(orphanInvoicesByCashier).forEach(cName => {
            const invList = orphanInvoicesByCashier[cName];
            invList.sort((a, b) => new Date(a.paidAt || a.issuedAt || a.createdAt) - new Date(b.paidAt || b.issuedAt || b.createdAt));

            const clusters = [];
            let currentCluster = [];

            invList.forEach(inv => {
                if (currentCluster.length === 0) {
                    currentCluster.push(inv);
                } else {
                    const prevInv = currentCluster[currentCluster.length - 1];
                    const prevTime = new Date(prevInv.paidAt || prevInv.issuedAt || prevInv.createdAt).getTime();
                    const curTime = new Date(inv.paidAt || inv.issuedAt || inv.createdAt).getTime();

                    // Nếu cách nhau >= 4 tiếng trong ngày, nhận diện là 1 ca làm việc khác trong ngày (ví dụ ca trưa và ca tối)
                    if (curTime - prevTime >= 4 * 60 * 60 * 1000) {
                        clusters.push(currentCluster);
                        currentCluster = [inv];
                    } else {
                        currentCluster.push(inv);
                    }
                }
            });
            if (currentCluster.length > 0) {
                clusters.push(currentCluster);
            }

            clusters.forEach((cluster, cIdx) => {
                const isLastClusterOfCashier = (cIdx === clusters.length - 1);
                const firstTime = new Date(cluster[0].paidAt || cluster[0].issuedAt || cluster[0].createdAt);
                const lastTime = new Date(cluster[cluster.length - 1].paidAt || cluster[cluster.length - 1].issuedAt || cluster[cluster.length - 1].createdAt);
                // Kiểm tra xem thu ngân này đã có ca kết ca hôm nay hoặc có ca mở hay chưa
                const hasExplicitClosedShift = closedList.some(cs => {
                    const csName = getCashierDisplayNameAdmin(cs.cashierName).toLowerCase();
                    const csRaw = (cs.cashierName || '').trim().toLowerCase();
                    return csName === cName.toLowerCase() || csRaw === cName.toLowerCase();
                });
                const hasActiveShift = activeList.some(s => {
                    const sName = getCashierDisplayNameAdmin(s.cashierName).toLowerCase();
                    const sRaw = (s.cashierName || '').trim().toLowerCase();
                    return sName === cName.toLowerCase() || sRaw === cName.toLowerCase();
                });

                // NẾU LÀ NGÀY HÔM NAY (isToday), VÀ LÀ CỤM CUỐI CÙNG CỦA THU NGÂN, VÀ CHƯA TỪNG BẤM KẾT CA VÀ ĐANG CÓ CA MỞ THỰC SỰ:
                if (isToday && isLastClusterOfCashier && !hasExplicitClosedShift && hasActiveShift) {
                    const openingCash = Number(localStorage.getItem('shiftOpeningCash')) || 0;
                    allShifts.push({
                        id: 'active_recovered_' + cName + '_' + firstTime.getTime(),
                        cashierName: cName,
                        openedBy: cName,
                        closedBy: '',
                        shiftStartTime: formatDtLocal(firstTime),
                        shiftEndTime: formatDtLocal(now),
                        openingCash: openingCash,
                        status: 'OPEN',
                        isClosed: false
                    });
                } else {
                    // Cụm hóa đơn trong quá khứ hoặc đã kết ca -> Luôn là CLOSED
                    allShifts.push({
                        id: 'recovered_' + cName + '_' + firstTime.getTime() + '_' + cIdx,
                        cashierName: cName,
                        openedBy: cName,
                        closedBy: '',
                        shiftStartTime: formatDtLocal(firstTime),
                        shiftEndTime: formatDtLocal(lastTime),
                        openingCash: 0,
                        status: 'CLOSED',
                        isClosed: true
                    });
                }
            });
        });

        if (allShifts.length === 0) {
            body.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-3"><i class="mdi mdi-information-outline me-1"></i>Ngày <b>${dateLabel ? dateLabel.textContent : dateStr}</b> chưa có thu ngân nào mở ca hoặc chưa có giao dịch thanh toán nào.</td></tr>`;
            return;
        }

        // Sắp xếp tất cả ca theo giờ vào ca tăng dần
        allShifts.sort((a, b) => new Date(a.shiftStartTime) - new Date(b.shiftStartTime));

        // Gom ca theo từng thu ngân để tính chặn biên không bao giờ đè lấn hóa đơn
        const shiftsByCashier = {};
        allShifts.forEach(s => {
            const key = (s.cashierName || '').trim().toLowerCase();
            if (!shiftsByCashier[key]) shiftsByCashier[key] = [];
            shiftsByCashier[key].push(s);
        });

        // Đánh số ca làm việc tăng dần theo giờ trong ngày (Ca 1, Ca 2, Ca 3, Ca 4...) CHUNG CHO TOÀN BỘ NHÀ HÀNG
        allShifts.forEach((s, idx) => {
            s.shiftIndex = idx + 1;
            s.shiftLabel = `Ca ${idx + 1}`;
            s.displayName = s.cashierName;
        });

        const currentTimeStr = formatTimeOnly(now);

        // Render từng ca làm việc thành 1 dòng riêng biệt với phân chia hóa đơn nghiêm ngặt (DISJOINT PARTITION)
        const rowsHtml = allShifts.map(shift => {
            const cashierKey = (shift.cashierName || '').trim().toLowerCase();
            const cashierShifts = shiftsByCashier[cashierKey] || [];
            const myPos = cashierShifts.indexOf(shift);
            const nextShift = (myPos >= 0 && myPos < cashierShifts.length - 1) ? cashierShifts[myPos + 1] : null;

            const fromTime = new Date(shift.shiftStartTime).getTime() - 60000;
            let toTime = new Date(shift.shiftEndTime).getTime();
            if (!shift.isClosed) {
                toTime = Math.max(toTime, Date.now() + 60000);
            } else {
                const tEnd = new Date(shift.shiftEndTime);
                tEnd.setSeconds(59, 999);
                toTime = tEnd.getTime() + 60000;
            }

            // Nếu có ca tiếp theo của thu ngân này, chặn biên trên không được vượt quá giờ bắt đầu ca tiếp theo
            if (nextShift) {
                const nextStart = new Date(nextShift.shiftStartTime).getTime();
                if (nextStart > fromTime) {
                    toTime = Math.min(toTime, nextStart);
                    // Đồng thời cập nhật shiftEndTime của ca này để hiển thị chuẩn xác
                    if (shift.isClosed && new Date(shift.shiftEndTime).getTime() > nextStart) {
                        shift.shiftEndTime = formatDtLocal(new Date(nextStart));
                    }
                }
            }

            // Lọc chính xác các hóa đơn thuộc khung giờ của ca này (tuyệt đối không trùng sang ca khác)
            const shiftInvoices = allInvoices.filter(inv => {
                if (inv.status !== 'PAID') return false;
                const pt = new Date(inv.paidAt || inv.issuedAt || inv.createdAt).getTime();
                if (isNaN(pt) || pt < fromTime) return false;
                if (nextShift ? (pt >= toTime) : (pt > toTime)) return false;
                const cName = getCashierDisplayNameAdmin(inv.cashierName).toLowerCase();
                return cName === cashierKey;
            });

            let cashRev = 0;
            let transferRev = 0;
            let totalRev = 0;
            shiftInvoices.forEach(inv => {
                const amt = Number(inv.finalAmount || inv.totalAmount || 0);
                totalRev += amt;
                const pm = (inv.paymentMethod || '').toUpperCase();
                if (pm.includes('TRANSFER') || pm.includes('CHUYỂN KHOẢN') || pm.includes('VIETQR') || pm.includes('QR') || pm.includes('CARD') || pm.includes('ATM')) {
                    transferRev += amt;
                } else {
                    cashRev += amt;
                }
            });

            const startDt = new Date(shift.shiftStartTime);
            const startDtLocal = formatDtLocal(startDt);
            const firstTimeStr = formatTimeOnly(startDt);

            let endDtLocal = '';
            let endTimeDisplay = '';
            let statusBadge = '';

            if (shift.isClosed) {
                const endDt = new Date(shift.shiftEndTime);
                endDtLocal = formatDtLocal(endDt);
                const closedTimeStr = formatTimeOnly(endDt);
                endTimeDisplay = `<span class="badge bg-secondary text-white py-1 px-2" style="font-size: 12.5px;"><i class="mdi mdi-clock-out me-1"></i>${closedTimeStr}</span>`;
                statusBadge = `<span class="badge bg-secondary"><i class="mdi mdi-check-circle me-1"></i>Đã kết ca</span>`;
            } else {
                endDtLocal = formatDtLocal(now);
                endTimeDisplay = `<span class="badge bg-success text-white py-1 px-2 shadow-sm" style="font-size: 12.5px;" title="Ca đang diễn ra đến thời điểm hiện tại"><i class="mdi mdi-clock-fast me-1"></i>Tới bây giờ (${currentTimeStr})</span>`;
                statusBadge = `<span class="badge bg-warning text-dark"><i class="mdi mdi-progress-clock me-1"></i>Đang trong ca</span>`;
            }

            const shiftOpening = Number(shift.openingCash || 0);
            const totalDrawerCash = shiftOpening + cashRev;

            return `
                <tr>
                    <td>
                        <span class="badge bg-primary text-white me-1" style="font-size: 11.5px; font-weight: 700;">${escapeHtml(shift.shiftLabel)}</span>
                        <strong><i class="mdi mdi-account-circle text-primary me-1"></i>${escapeHtml(shift.cashierName)}</strong>
                    </td>
                    <td><span class="badge bg-light text-dark border"><i class="mdi mdi-clock-in text-success me-1"></i>${firstTimeStr}</span></td>
                    <td>${endTimeDisplay}</td>
                    <td class="text-center">${statusBadge}</td>
                    <td class="text-center"><b>${shiftInvoices.length} HĐ</b></td>
                    <td class="text-end text-warning font-weight-bold">
                        ${formatMoney(totalDrawerCash)}
                        ${shiftOpening > 0 ? `<br><small class="text-muted" style="font-size:11px; font-weight:normal;">(Vốn: ${formatMoney(shiftOpening)} + Thu: ${formatMoney(cashRev)})</small>` : ''}
                    </td>
                    <td class="text-end text-info font-weight-bold">${formatMoney(transferRev)}</td>
                    <td class="text-end text-success font-weight-bold" style="font-size: 15px;">${formatMoney(totalRev)}</td>
                    <td class="text-center">
                        <div class="btn-group btn-group-sm">
                            <button type="button" class="btn btn-primary btn-sm px-2" onclick="viewCashierShiftOrdersModal('${escapeHtml(shift.cashierName)}', '${startDtLocal}', ${shift.isClosed ? `'${endDtLocal}'` : 'null'}, ${shift.isClosed}, '${escapeHtml(shift.shiftLabel)}', ${shiftOpening}, '${escapeHtml(shift.openedBy || shift.cashierName)}', '${escapeHtml(shift.closedBy || '')}')" title="Xem ${shiftInvoices.length} đơn hàng của ca này & tổng tiền">
                                <i class="mdi mdi-receipt-text-check me-1"></i> Xem đơn hàng
                            </button>
                            <button type="button" class="btn btn-outline-info btn-sm px-2" onclick="quickPrintCashierShiftAdmin('${escapeHtml(shift.cashierName)}', '${startDtLocal}', '${endDtLocal}', ${!shift.isClosed}, '${escapeHtml(shift.shiftLabel)}', ${shiftOpening}, '${escapeHtml(shift.openedBy || shift.cashierName)}', '${escapeHtml(shift.closedBy || '')}')" title="In phiếu kết ca POS K80">
                                <i class="mdi mdi-printer"></i> In K80
                            </button>
                            ${!shift.isClosed ? `
                            <button type="button" class="btn btn-outline-danger btn-sm px-2" onclick="closeCashierShiftAdmin('${escapeHtml(shift.cashierName)}', '${startDtLocal}')" title="Chốt kết ca làm việc này">
                                <i class="mdi mdi-stop-circle-outline"></i> Kết ca
                            </button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        body.innerHTML = rowsHtml;
    } catch(e) {
        console.warn("Lỗi tải danh sách ca thu ngân:", e);
        body.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-3">Lỗi tải danh sách ca thu ngân: ${escapeHtml(e.message)}</td></tr>`;
    }
};

window.viewCashierShiftOrdersModal = async function(cashierName, startStr, endStr = null, isClosed = false, shiftLabel = '', openingCash = 0, openedBy = '', closedBy = '') {
    const pad = n => String(n).padStart(2, '0');
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    let effectiveEndStr = endStr;
    if (!effectiveEndStr) {
        effectiveEndStr = `${todayStr}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }

    // Đồng bộ vào bộ lọc của trang báo cáo chung với thời gian thực tế
    window.selectCashierShift(cashierName, startStr, effectiveEndStr, isClosed);

    // Điền thông tin vào Modal #cashierShiftOrdersModal
    const modalEl = document.getElementById('cashierShiftOrdersModal');
    if (!modalEl) return;

    const modalTitleCashier = shiftLabel ? `${shiftLabel} - ${cashierName}` : cashierName;
    document.getElementById('shiftModalCashierName').textContent = modalTitleCashier;
    let cashierInfoText = cashierName + (shiftLabel ? ` (${shiftLabel})` : '');
    if (openedBy && closedBy && openedBy.toLowerCase() !== closedBy.toLowerCase()) {
        cashierInfoText += ` (Mở ca: ${openedBy} • Đóng ca: ${closedBy})`;
    } else if (closedBy) {
        cashierInfoText += ` (Đóng ca: ${closedBy})`;
    }
    document.getElementById('shiftModalCashierText').textContent = cashierInfoText;
    document.getElementById('shiftModalStartTime').innerHTML = `<i class="mdi mdi-clock-in text-success me-1"></i>${formatDate(startStr)}`;
    
    const endBadge = document.getElementById('shiftModalEndTime');
    const statusBadge = document.getElementById('shiftModalStatusBadge');
    if (isClosed) {
        endBadge.className = 'badge bg-secondary text-white';
        endBadge.innerHTML = `<i class="mdi mdi-clock-out me-1"></i>${formatDate(effectiveEndStr)} (Đã kết ca)`;
        statusBadge.className = 'badge bg-secondary';
        statusBadge.innerHTML = `<i class="mdi mdi-check-circle me-1"></i>Đã kết ca`;
    } else {
        const curTimeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        endBadge.className = 'badge bg-success text-white';
        endBadge.innerHTML = `<i class="mdi mdi-clock-fast me-1"></i>Tới bây giờ (${curTimeStr}) - Đang trong ca`;
        statusBadge.className = 'badge bg-warning text-dark';
        statusBadge.innerHTML = `<i class="mdi mdi-progress-clock me-1"></i>Đang trong ca (Chưa kết ca)`;
    }
    document.getElementById('shiftModalLookupTime').textContent = `Lúc: ${new Date().toLocaleTimeString('vi-VN')}`;

    // Lọc hóa đơn của ca này
    const fromTime = new Date(startStr).getTime() - 60000;
    let toTime = new Date(effectiveEndStr).getTime();
    if (!isClosed) {
        toTime = Math.max(toTime, Date.now() + 60000);
    } else {
        const tEnd = new Date(effectiveEndStr);
        tEnd.setSeconds(59, 999);
        toTime = tEnd.getTime() + 60000;
    }

    try {
        const res = await fetchWithAuth('/api/v1/invoices/all');
        const allInvoices = res.data || [];

        const shiftInvoices = allInvoices.filter(inv => {
            if (inv.status !== 'PAID') return false;
            const payTime = new Date(inv.paidAt || inv.issuedAt || inv.createdAt).getTime();
            if (isNaN(payTime) || payTime < fromTime || payTime > toTime) return false;
            const cName = getCashierDisplayNameAdmin(inv.cashierName).toLowerCase();
            return cName === cashierName.trim().toLowerCase();
        });

        // Sắp xếp mới nhất lên đầu
        shiftInvoices.sort((a,b) => {
            const ta = new Date(a.paidAt || a.issuedAt || a.createdAt).getTime();
            const tb = new Date(b.paidAt || b.issuedAt || b.createdAt).getTime();
            return tb - ta;
        });

        let totalRev = 0;
        let totalCash = 0;
        let totalTransfer = 0;
        let totalDiscount = 0;
        let cashCount = 0;
        let transferCount = 0;

        shiftInvoices.forEach(inv => {
            const amt = Number(inv.finalAmount || inv.totalAmount || 0);
            const disc = Number(inv.discountAmount || 0);
            totalRev += amt;
            totalDiscount += disc;

            const pm = (inv.paymentMethod || '').toUpperCase();
            if (pm.includes('TRANSFER') || pm.includes('CHUYỂN KHOẢN') || pm.includes('VIETQR') || pm.includes('QR')) {
                totalTransfer += amt;
                transferCount++;
            } else {
                totalCash += amt;
                cashCount++;
            }
        });

        const opCashNum = Number(openingCash || 0);
        const totalDrawerCash = opCashNum + totalCash;

        document.getElementById('shiftModalTotalRevenue').textContent = formatMoney(totalRev);
        document.getElementById('shiftModalTotalCash').textContent = formatMoney(totalDrawerCash);
        document.getElementById('shiftModalCashCount').innerHTML = opCashNum > 0
            ? `<span class="text-white-50">(Vốn: ${formatMoney(opCashNum)} + Thu: ${formatMoney(totalCash)})</span>`
            : `${cashCount} lượt thanh toán`;
        document.getElementById('shiftModalTotalTransfer').textContent = formatMoney(totalTransfer);
        document.getElementById('shiftModalTransferCount').textContent = `${transferCount} lượt`;
        document.getElementById('shiftModalTotalDiscount').textContent = formatMoney(totalDiscount);
        document.getElementById('shiftModalInvoicesCount').textContent = `${shiftInvoices.length} đơn hàng`;

        // Render table
        const tbody = document.getElementById('shiftModalOrdersBody');
        if (shiftInvoices.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4"><i class="mdi mdi-information-outline me-1"></i>Ca làm việc này chưa có đơn hàng thanh toán nào.</td></tr>`;
        } else {
            tbody.innerHTML = shiftInvoices.map((inv, idx) => {
                const timeStr = formatDate(inv.paidAt || inv.issuedAt || inv.createdAt);
                const tbl = inv.tableName || ('Bàn #' + (inv.tableId || '-'));
                const sub = Number(inv.subtotal || inv.totalAmount || 0);
                const disc = Number(inv.discountAmount || 0);
                const tot = Number(inv.finalAmount || inv.totalAmount || 0);
                const orderStaff = inv.orderStaffName || 'Nhân viên order';
                const method = inv.paymentMethod || 'Tiền mặt';

                let mBadge = 'badge bg-success text-white';
                const mLower = method.toLowerCase();
                if (mLower.includes('chuyển') || mLower.includes('transfer') || mLower.includes('qr')) mBadge = 'badge bg-primary text-white';

                return `
                    <tr>
                        <td>${idx + 1}</td>
                        <td><strong class="text-primary">${escapeHtml(inv.invoiceCode || '#' + inv.id)}</strong></td>
                        <td><span class="badge bg-secondary text-white">${escapeHtml(tbl)}</span></td>
                        <td><small>${escapeHtml(timeStr)}</small></td>
                        <td><small class="text-muted"><i class="mdi mdi-account me-1"></i>${escapeHtml(orderStaff)}</small></td>
                        <td><span class="${mBadge}">${escapeHtml(method)}</span></td>
                        <td class="text-end text-muted">${formatMoney(sub)}</td>
                        <td class="text-end text-danger">${disc > 0 ? ('-' + formatMoney(disc)) : '0 ₫'}</td>
                        <td class="text-end text-success font-weight-bold">${formatMoney(tot)}</td>
                        <td class="text-center">
                            <div class="btn-group btn-group-sm">
                                <button type="button" class="btn btn-outline-primary py-1 px-2" onclick="viewInvoiceDetails(${inv.id})" title="Xem món trong đơn">
                                    <i class="mdi mdi-eye"></i> Món
                                </button>
                                <button type="button" class="btn btn-outline-info py-1 px-2" onclick="quickPrintInvoiceAdmin(${inv.id})" title="In lại HĐ">
                                    <i class="mdi mdi-printer"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Gán sự kiện cho 2 nút in trong Modal
        document.getElementById('shiftModalPrintK80Btn').onclick = () => {
            quickPrintCashierShiftAdmin(cashierName, startStr, isClosed ? endStr : formatDtLocal(now), !isClosed, shiftLabel, opCashNum);
        };
        document.getElementById('shiftModalPrintA4Btn').onclick = () => {
            printA4RevenueReport();
        };

        $('#cashierShiftOrdersModal').modal('show');
    } catch(err) {
        showAlert("Lỗi tải danh sách đơn hàng ca: " + err.message, "error");
    }
};

window.onReportCashierChange = function(cashierName) {
    const pad = n => String(n).padStart(2, '0');
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const formatDtLocal = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    const startInput = document.getElementById('reportShiftStart');
    const endInput = document.getElementById('reportShiftEnd');

    if (cashierName) {
        const cClean = cashierName.trim().toLowerCase();
        let cashierStart = null;

        // 1. Tìm trong active shifts
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('activeCashierShift')) {
                    const act = JSON.parse(localStorage.getItem(k));
                    if (act && (act.cashierName || '').trim().toLowerCase() === cClean && act.shiftStartTime) {
                        const actDt = new Date(act.shiftStartTime);
                        if (!cashierStart || actDt < cashierStart) cashierStart = actDt;
                    }
                }
            }
            const shiftOpTime = localStorage.getItem('shiftOpeningTime');
            const shiftOpCashier = localStorage.getItem('shiftOpeningCashier');
            if (shiftOpTime && shiftOpCashier && shiftOpCashier.trim().toLowerCase() === cClean) {
                const sDt = new Date(shiftOpTime);
                if (!cashierStart || sDt < cashierStart) cashierStart = sDt;
            }
        } catch(e) {}

        // 2. Tìm trong hóa đơn hôm nay của thu ngân này
        if (!cashierStart && allInvoicesData && allInvoicesData.length > 0) {
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
            const myInvoices = allInvoicesData.filter(inv => {
                if (inv.status !== 'PAID') return false;
                const c = getCashierDisplayNameAdmin(inv.cashierName).toLowerCase();
                if (c !== cClean) return false;
                const t = new Date(inv.paidAt || inv.issuedAt || inv.createdAt).getTime();
                return !isNaN(t) && t >= startOfToday;
            });
            if (myInvoices.length > 0) {
                myInvoices.sort((a,b) => new Date(a.paidAt || a.issuedAt || a.createdAt) - new Date(b.paidAt || b.issuedAt || b.createdAt));
                cashierStart = new Date(myInvoices[0].paidAt || myInvoices[0].issuedAt || myInvoices[0].createdAt);
            }
        }

        if (!cashierStart) {
            cashierStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0);
        }

        if (startInput) startInput.value = formatDtLocal(cashierStart);

        // Kiểm tra ca đã kết thúc hay chưa
        const closedRecord = isCashierShiftClosedToday(cashierName);
        if (closedRecord) {
            const closedDt = new Date(closedRecord.shiftEndTime || closedRecord.closedAt || now);
            if (endInput) endInput.value = formatDtLocal(closedDt);
            window.isCurrentShiftOngoing = false;
        } else {
            // Ca đang diễn ra -> Đến thời gian THỰC TẾ hiện tại
            if (endInput) endInput.value = formatDtLocal(now);
            window.isCurrentShiftOngoing = true;
        }
    } else {
        // Tất cả thu ngân: 06:00 đến thời gian thực tế hiện tại
        if (startInput && !startInput.value) startInput.value = `${todayStr}T06:00`;
        if (endInput) endInput.value = formatDtLocal(now);
        window.isCurrentShiftOngoing = true;
    }

    handleFetchReport(true);
};

window.selectCashierShift = function(cashierName, startStr, endStr, isClosed = false) {
    const select = document.getElementById('reportCashierSelect');
    if (select) {
        let matched = false;
        for (let opt of select.options) {
            if (opt.value && opt.value.toLowerCase() === (cashierName || '').toLowerCase()) {
                select.value = opt.value;
                matched = true;
                break;
            }
        }
        if (!matched && cashierName) {
            const newOpt = document.createElement('option');
            newOpt.value = cashierName;
            newOpt.textContent = cashierName;
            select.appendChild(newOpt);
            select.value = cashierName;
        }
    }
    const startInput = document.getElementById('reportShiftStart');
    const endInput = document.getElementById('reportShiftEnd');
    if (startInput) startInput.value = startStr;
    
    const pad = n => String(n).padStart(2, '0');
    const now = new Date();
    const formatDtLocal = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    window.isCurrentShiftOngoing = !isClosed;

    if (endInput) {
        if (!isClosed) {
            // Chưa kết ca: gán thời gian thực tế hiện tại của ca, TUYỆT ĐỐI không để tới 23:59 (00h đêm)
            endInput.value = formatDtLocal(now);
        } else {
            endInput.value = endStr;
        }
    }

    handleFetchReport(true);

    const banner = document.getElementById('reportShiftBanner');
    if (banner) banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.quickPrintCashierShiftAdmin = async function(cashierName, startStr, endStr, isOngoing = false, shiftLabel = '', openingCash = 0, openedBy = '', closedBy = '') {
    window.selectCashierShift(cashierName, startStr, endStr, !isOngoing);
    await handleFetchReport(false);
    if (window.currentReportSummary) {
        window.currentReportSummary.isOngoing = isOngoing;
        if (shiftLabel) {
            window.currentReportSummary.shiftLabel = shiftLabel;
        }
        if (Number(openingCash) > 0) {
            window.currentReportSummary.openingCash = Number(openingCash);
        }
        if (openedBy) window.currentReportSummary.openedBy = openedBy;
        if (closedBy) window.currentReportSummary.closedBy = closedBy;
    }
    printReport();
};

async function populateReportCashiers() {
    const select = document.getElementById('reportCashierSelect');
    if (!select) return;

    try {
        let cashiers = new Set();

        const addValidCashier = (name) => {
            if (!name) return;
            const clean = name.trim();
            const upper = clean.toUpperCase();
            if (upper.startsWith('ROLE_') || upper === 'ADMIN' || upper === 'CASHIER' || upper === 'ADMINISTRATOR') {
                return;
            }
            cashiers.add(clean);
        };

        // 1. Lấy từ danh sách users
        if (allUsersData && allUsersData.length > 0) {
            allUsersData.forEach(u => {
                const r = u.roleName || (u.role ? u.role.name : '');
                if (r.includes('CASHIER') || r.includes('ADMIN')) {
                    if (u.fullName) addValidCashier(u.fullName);
                    else if (u.username) addValidCashier(u.username);
                }
            });
        } else {
            try {
                const uRes = await fetchWithAuth('/api/v1/users');
                if (uRes && uRes.data) {
                    uRes.data.forEach(u => {
                        const r = u.roleName || (u.role ? u.role.name : '');
                        if (r.includes('CASHIER') || r.includes('ADMIN')) {
                            if (u.fullName) addValidCashier(u.fullName);
                            else if (u.username) addValidCashier(u.username);
                        }
                    });
                }
            } catch(e) {}
        }

        // 2. Lấy thêm từ danh sách hóa đơn thực tế
        if (allInvoicesData && allInvoicesData.length > 0) {
            allInvoicesData.forEach(inv => {
                if (inv.cashierName) {
                    addValidCashier(inv.cashierName);
                }
            });
        } else {
            try {
                const invRes = await fetchWithAuth('/api/v1/invoices/all');
                if (invRes && invRes.data) {
                    invRes.data.forEach(inv => {
                        if (inv.cashierName) {
                            addValidCashier(inv.cashierName);
                        }
                    });
                }
            } catch(e) {}
        }

        let html = '<option value="">-- Tất cả thu ngân (Toàn nhà hàng) --</option>';
        cashiers.forEach(name => {
            html += `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
        });
        select.innerHTML = html;
    } catch (e) {
        console.warn("Lỗi tải danh sách thu ngân:", e);
    }
}

window.setQuickShift = function(type, triggerFetch = true) {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const startInput = document.getElementById('reportShiftStart');
    const endInput = document.getElementById('reportShiftEnd');

    if (type === 'today') {
        // Hôm nay: Từ 06:00 sáng đến thời gian thực tế hiện tại (không để 23:59 / 00h đêm)
        const formatDtLocal = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        if (startInput) startInput.value = `${todayStr}T06:00`;
        if (endInput) endInput.value = formatDtLocal(now);
        window.isCurrentShiftOngoing = true;
    } else if (type === 'yesterday') {
        // Hôm qua: 00:00 -> 23:59
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        const yestStr = `${yest.getFullYear()}-${pad(yest.getMonth() + 1)}-${pad(yest.getDate())}`;
        if (startInput) startInput.value = `${yestStr}T00:00`;
        if (endInput) endInput.value = `${yestStr}T23:59`;
    } else if (type === 'week') {
        // 7 ngày qua: từ 7 ngày trước 00:00 -> 23:59 hôm nay
        const past7 = new Date();
        past7.setDate(past7.getDate() - 7);
        const past7Str = `${past7.getFullYear()}-${pad(past7.getMonth() + 1)}-${pad(past7.getDate())}`;
        if (startInput) startInput.value = `${past7Str}T00:00`;
        if (endInput) endInput.value = `${todayStr}T23:59`;
    } else if (type === 'thisMonth') {
        // Tháng này: từ ngày 1 đến 23:59 hôm nay
        const firstDayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
        if (startInput) startInput.value = `${firstDayStr}T00:00`;
        if (endInput) endInput.value = `${todayStr}T23:59`;
    } else if (type === 'lastMonth') {
        // Tháng trước: ngày 1 đến ngày cuối tháng trước
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        const fStr = `${firstDayLastMonth.getFullYear()}-${pad(firstDayLastMonth.getMonth() + 1)}-01`;
        const lStr = `${lastDayLastMonth.getFullYear()}-${pad(lastDayLastMonth.getMonth() + 1)}-${pad(lastDayLastMonth.getDate())}`;
        if (startInput) startInput.value = `${fStr}T00:00`;
        if (endInput) endInput.value = `${lStr}T23:59`;
    }

    // Cập nhật trạng thái nút bấm nhanh
    try {
        const group = document.getElementById('reportQuickFilterGroup');
        if (group) {
            group.querySelectorAll('button').forEach(btn => {
                btn.classList.remove('btn-gradient-primary', 'active');
                btn.classList.add('btn-outline-primary');
            });
            const activeBtn = document.getElementById(`btn-quick-${type}`);
            if (activeBtn) {
                activeBtn.classList.remove('btn-outline-primary');
                activeBtn.classList.add('btn-gradient-primary', 'active');
            }
        }
    } catch(e) {}

    if (triggerFetch) {
        handleFetchReport(true);
    }
};

function generateThermalRevenueReportHtml(data) {
    const adminName = getCashierDisplayNameAdmin();
    const printTime = new Date().toLocaleString('vi-VN');
    const isOngoing = data.isOngoing === true;
    const shiftLabelPrefix = data.shiftLabel ? `[${data.shiftLabel}] ` : '';
    const openerName = data.openedBy || data.cashierName || 'Thu ngân';
    const closerName = data.closedBy || data.closerName || adminName;
    const isDifferentUser = closerName && openerName && (closerName.trim().toLowerCase() !== openerName.trim().toLowerCase());
    const cashierName = shiftLabelPrefix + getCashierDisplayNameAdmin(openerName);
    const shiftStart = data.shiftStart ? formatDate(data.shiftStart) : '-';
    const shiftEnd = isOngoing ? `Tới bây giờ (${printTime}) [Ca đang mở]` : (data.shiftEnd ? formatDate(data.shiftEnd) : '-');
    const totalRev = Number(data.totalRevenue) || 0;
    const totalInv = Number(data.totalInvoices) || 0;
    const avgInv = totalInv > 0 ? Math.round(totalRev / totalInv) : 0;
    const totalItems = Number(data.totalItemsSold) || 0;

    // Methods
    const methods = data.methods || [];
    let cashAmount = 0;
    let transferAmount = 0;
    let methodsHtml = methods.map(m => {
        const mLower = (m.method || '').toLowerCase();
        if (mLower.includes('tiền mặt') || mLower.includes('cash')) cashAmount += Number(m.revenue);
        else transferAmount += Number(m.revenue);
        return `
            <div class="row-item">
                <span>• ${escapeHtml(m.method)} (${m.count} đơn):</span>
                <span style="font-weight: bold;">${Number(m.revenue).toLocaleString('vi-VN')} ₫</span>
            </div>
        `;
    }).join('');
    if (!methodsHtml) methodsHtml = `<div style="font-size:11px; color:#666;">(Chưa có dữ liệu)</div>`;

    // Staffs
    const staffs = data.staffs || [];
    let staffsHtml = staffs.map(s => `
        <div class="row-item">
            <span>• ${escapeHtml(s.staff)} (${s.count} HĐ):</span>
            <span style="font-weight: bold;">${Number(s.revenue).toLocaleString('vi-VN')} ₫</span>
        </div>
    `).join('');
    if (!staffsHtml) staffsHtml = `<div style="font-size:11px; color:#666;">(Chưa có dữ liệu)</div>`;

    // Top items
    const items = (data.items || []).slice(0, 10);
    let itemsHtml = items.map((it, idx) => `
        <tr style="border-bottom: 1px dashed #ccc;">
            <td style="padding: 4px 2px; text-align: left;">
                <strong>${idx + 1}. ${escapeHtml(it.name)}</strong>
            </td>
            <td style="padding: 4px 2px; text-align: center; font-weight: bold;">${it.quantity}</td>
            <td style="padding: 4px 2px; text-align: right; font-weight: bold;">${Number(it.revenue).toLocaleString('vi-VN')}</td>
        </tr>
    `).join('');
    if (!itemsHtml) {
        itemsHtml = `<tr><td colspan="3" style="text-align:center; padding:6px; color:#888;">(Chưa có dữ liệu món)</td></tr>`;
    }

    // Invoices list in shift
    const invoices = (data.invoices || []).slice(0, 20);
    let invoicesHtml = invoices.map((inv, idx) => {
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

    return `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <title>Báo Cáo Doanh Thu Ca - ${escapeHtml(cashierName)}</title>
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
                    .row-item {
                        display: flex;
                        justify-content: space-between;
                        margin: 3px 0;
                        font-size: 12px;
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
                        <div class="bill-title">${isOngoing ? 'BÁO CÁO DOANH THU CA' : 'BÁO CÁO KẾT CA'}</div>
                        <div class="bill-notice">${isOngoing ? '(DOANH THU CA HIỆN TẠI - CHƯA KẾT CA)' : '(PHIẾU BÀN GIAO KẾT CA THU NGÂN)'}</div>
                    </div>
                </div>

                <div class="meta-info">
                    <p><strong>Thu ngân trực ca:</strong> <span style="font-size: 14px; font-weight: 900;">${escapeHtml(cashierName)}</span></p>
                    ${!isOngoing ? `<p><strong>Người xác nhận kết ca:</strong> <span style="font-weight: 700;">${escapeHtml(closerName)}${isDifferentUser ? ' (Thao tác đóng ca)' : ''}</span></p>` : ''}
                    <p><strong>Giờ vào ca:</strong> ${escapeHtml(shiftStart)}</p>
                    <p><strong>Giờ kết ca:</strong> ${escapeHtml(shiftEnd)}</p>
                    <p><strong>Giờ in phiếu:</strong> ${escapeHtml(printTime)}</p>
                    <p><strong>Số HĐ đã thanh toán:</strong> ${totalInv} hóa đơn</p>
                    <p><strong>Số lượng món đã phục vụ:</strong> ${totalItems} phần</p>
                </div>

                <div class="total-box">
                    <div class="total-row grand-total">
                        <span>TỔNG THỰC THU CA:</span>
                        <span>${totalRev.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    <div class="total-row">
                        <span>TB / Hóa đơn:</span>
                        <span>${avgInv.toLocaleString('vi-VN')} ₫</span>
                    </div>
                </div>

                <div class="section-title">1. TIỀN MẶT & CHUYỂN KHOẢN TRONG CA</div>
                ${data.openingCash ? `
                <div class="row-item">
                    <span>• Tiền két lúc mở ca (A):</span>
                    <span style="font-weight: bold; color: #0284c7;">${Number(data.openingCash).toLocaleString('vi-VN')} ₫</span>
                </div>` : ''}
                ${methodsHtml}
                ${data.openingCash ? `
                <div class="row-item" style="border-top: 1px dashed #666; padding-top: 3px; font-weight: bold;">
                    <span>• TỔNG TIỀN MẶT TRONG KÉT:</span>
                    <span>${(Number(data.openingCash) + cashAmount).toLocaleString('vi-VN')} ₫</span>
                </div>` : ''}
                <div style="background: #f8f9fa; border: 1px solid #000; padding: 4px; margin-top: 4px; font-size: 12px;">
                    <strong>💵 TIỀN MẶT BÀN GIAO:</strong>
                    <span style="float: right; font-weight: 900; font-size: 13px;">${cashAmount.toLocaleString('vi-VN')} ₫</span>
                    ${data.openingCash ? `<div style="font-size:10px; color:#555; clear:both; margin-top:2px;">*(Đã trừ ${Number(data.openingCash).toLocaleString('vi-VN')} ₫ tiền két giữ lại làm vốn ca sau)*</div>` : ''}
                </div>

                <div class="section-title">2. TOP MÓN BÁN TRONG CA</div>
                <table>
                    <thead>
                        <tr>
                            <th class="text-left">Tên món</th>
                            <th class="text-center" style="width: 32px;">SL</th>
                            <th class="text-right" style="width: 75px;">T.Tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                ${invoicesHtml ? `
                <div class="section-title">3. HÓA ĐƠN TRONG CA (${invoices.length} HĐ gần nhất)</div>
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
}

async function printReport() {
    const summary = window.currentReportSummary;
    if (!summary) {
        await handleFetchReport();
    }

    const cur = window.currentReportSummary || {};
    const openingCash = Number(localStorage.getItem('shiftOpeningCash')) || 0;
    const html = generateThermalRevenueReportHtml({
        cashierName: cur.cashierName,
        openedBy: cur.openedBy,
        closedBy: cur.closedBy,
        shiftLabel: cur.shiftLabel,
        isOngoing: cur.isOngoing,
        shiftStart: cur.shiftStart,
        shiftEnd: cur.shiftEnd,
        openingCash: openingCash,
        totalRevenue: cur.totalRevenue || 0,
        totalInvoices: cur.totalInvoices || 0,
        averageInvoice: cur.averageInvoice || 0,
        totalItemsSold: cur.totalItemsSold || 0,
        methods: window.currentReportMethods || [],
        staffs: window.currentReportStaffs || [],
        items: window.currentReportItems || [],
        invoices: cur.invoices || []
    });

    printThermalReceiptWindow(html);
}

async function handleFetchReport(resetPage = false) {
    if (resetPage === true) {
        paginationState.reportsDate.page = 1;
        paginationState.reportsPayment.page = 1;
        paginationState.reportsItems.page = 1;
    }

    const startInput = document.getElementById('reportShiftStart');
    const endInput = document.getElementById('reportShiftEnd');
    const cashierSelect = document.getElementById('reportCashierSelect');

    let shiftStartStr = startInput ? startInput.value : '';
    let shiftEndStr = endInput ? endInput.value : '';
    const selectedCashier = cashierSelect ? cashierSelect.value.trim() : '';

    if (!shiftStartStr) {
        const fromLegacy = document.getElementById('reportFromDate')?.value;
        if (fromLegacy) shiftStartStr = `${fromLegacy}T00:00`;
    }
    if (!shiftEndStr) {
        const toLegacy = document.getElementById('reportToDate')?.value;
        if (toLegacy) shiftEndStr = `${toLegacy}T23:59`;
    }

    if (!shiftStartStr || !shiftEndStr) {
        showAlert("Vui lòng chọn thời gian bắt đầu và kết thúc ca!", "error");
        return;
    }

    const fromDate = new Date(shiftStartStr);
    const toDate = new Date(shiftEndStr);
    toDate.setSeconds(59, 999);
    const fromTime = fromDate.getTime();
    // Đảm bảo không ghi đè mốc thời gian quá khứ bằng Date.now()
    const toTime = toDate.getTime();

    try {
        const res = await fetchWithAuth('/api/v1/invoices/all');
        const allInvoices = res.data || [];

        // Lấy danh sách orders để map tên nhân viên order
        let ordersMap = {};
        try {
            const ordRes = await fetchWithAuth('/api/v1/orders/all');
            (ordRes.data || []).forEach(o => {
                ordersMap[o.id] = o.username || o.userName || 'Nhân viên';
            });
        } catch(e) {}

        // Lọc hóa đơn theo khoảng thời gian và thu ngân
        const filteredInvoices = allInvoices.filter(inv => {
            if (inv.status !== 'PAID') return false;
            const d = new Date(inv.paidAt || inv.issuedAt || inv.createdAt);
            if (isNaN(d.getTime())) return false;
            const t = d.getTime();
            if (t < fromTime || t > toTime) return false;

            if (selectedCashier) {
                const cName = (inv.cashierName || '').trim().toLowerCase();
                const target = selectedCashier.trim().toLowerCase();
                if (cName !== target) return false;
            }

            return true;
        });

        // 1. Tính toán KPIs
        let totalRevenue = 0;
        let totalSubtotal = 0;
        let totalDiscount = 0;
        let totalCash = 0;
        let totalTransfer = 0;
        let cashCount = 0;
        let transferCount = 0;
        let totalItemsSold = 0;
        const itemSales = {};
        const revenueByDateMap = {};
        const revenueByStaffMap = {};
        const revenueByPaymentMap = {};

        for (const inv of filteredInvoices) {
            const invAmount = Number(inv.finalAmount || inv.totalAmount || 0);
            const subtotal = Number(inv.subtotal || inv.totalAmount || invAmount);
            const discount = Number(inv.discountAmount || 0);

            totalRevenue += invAmount;
            totalSubtotal += subtotal;
            totalDiscount += discount;

            // Theo ngày
            const dObj = new Date(inv.paidAt || inv.issuedAt || inv.createdAt);
            const pad = n => String(n).padStart(2, '0');
            const dateStr = `${dObj.getFullYear()}-${pad(dObj.getMonth() + 1)}-${pad(dObj.getDate())}`;
            if (!revenueByDateMap[dateStr]) revenueByDateMap[dateStr] = { invoices: 0, revenue: 0 };
            revenueByDateMap[dateStr].invoices += 1;
            revenueByDateMap[dateStr].revenue += invAmount;

            // Theo Thu ngân quản lý ca
            const staffName = getCashierDisplayNameAdmin(inv.cashierName);
            if (!revenueByStaffMap[staffName]) revenueByStaffMap[staffName] = { count: 0, revenue: 0 };
            revenueByStaffMap[staffName].count += 1;
            revenueByStaffMap[staffName].revenue += invAmount;

            // Theo phương thức thanh toán
            let rawMethod = inv.paymentMethod || 'Tiền mặt';
            let method = 'Tiền mặt';
            const mUpper = rawMethod.toUpperCase();
            if (mUpper.includes('TRANSFER') || mUpper.includes('CHUYỂN KHOẢN') || mUpper.includes('VIETQR') || mUpper.includes('QR')) {
                method = 'Chuyển khoản';
                totalTransfer += invAmount;
                transferCount++;
            } else if (mUpper.includes('CARD') || mUpper.includes('THẺ') || mUpper.includes('ATM')) {
                method = 'Thẻ POS/ATM';
                totalTransfer += invAmount;
                transferCount++;
            } else {
                method = 'Tiền mặt';
                totalCash += invAmount;
                cashCount++;
            }

            if (!revenueByPaymentMap[method]) revenueByPaymentMap[method] = { count: 0, revenue: 0 };
            revenueByPaymentMap[method].count += 1;
            revenueByPaymentMap[method].revenue += invAmount;

            // Items (lấy trực tiếp từ InvoiceDto có sẵn)
            let items = inv.items || inv.invoiceItems || [];

            for (const it of items) {
                const qty = Number(it.quantity || 1);
                const price = Number(it.unitPrice || it.price || 0);
                const itemTot = Number(it.subtotal || it.totalPrice || (price * qty));
                const pName = it.productName || (it.product ? it.product.name : 'Món ăn');

                totalItemsSold += qty;
                if (!itemSales[pName]) itemSales[pName] = { quantity: 0, revenue: 0 };
                itemSales[pName].quantity += qty;
                itemSales[pName].revenue += itemTot;
            }
        }

        const totalInvoices = filteredInvoices.length;
        const averageInvoice = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

        let bestSeller = null;
        const itemsArr = [];
        for (const [name, stats] of Object.entries(itemSales)) {
            itemsArr.push({ name, quantity: stats.quantity, revenue: stats.revenue });
            if (!bestSeller || stats.quantity > bestSeller.quantity) {
                bestSeller = { name, quantity: stats.quantity, revenue: stats.revenue };
            }
        }
        itemsArr.sort((a,b) => b.quantity - a.quantity);

        // Fill Summary Cards (1. Dòng tiền & Tài chính)
        const elRev = document.getElementById('reportTotalRevenue');
        if (elRev) elRev.textContent = formatMoney(totalRevenue);

        const elSub = document.getElementById('reportSubtotalText');
        if (elSub) elSub.textContent = `Gốc: ${formatMoney(totalSubtotal)}`;

        const elCash = document.getElementById('reportTotalCash');
        if (elCash) elCash.textContent = formatMoney(totalCash);

        const elCashCnt = document.getElementById('reportCashCountText');
        if (elCashCnt) elCashCnt.textContent = `${cashCount} lượt thanh toán`;

        const elTransfer = document.getElementById('reportTotalTransfer');
        if (elTransfer) elTransfer.textContent = formatMoney(totalTransfer);

        const elTransferCnt = document.getElementById('reportTransferCountText');
        if (elTransferCnt) elTransferCnt.textContent = `${transferCount} lượt thanh toán`;

        const elDiscount = document.getElementById('reportTotalDiscount');
        if (elDiscount) elDiscount.textContent = formatMoney(totalDiscount);

        // Fill Summary Cards (2. Hoạt động & Món ăn)
        const elInv = document.getElementById('reportTotalInvoices');
        if (elInv) elInv.textContent = `${totalInvoices} HĐ`;

        const elAvg = document.getElementById('reportAverageInvoice');
        if (elAvg) elAvg.textContent = formatMoney(averageInvoice);

        const elItems = document.getElementById('reportTotalItemsSold');
        if (elItems) elItems.textContent = `${totalItemsSold} phần`;

        if (bestSeller) {
            document.getElementById('reportBestSellerName').textContent = bestSeller.name;
            document.getElementById('reportBestSellerStats').textContent = `Đã bán: ${bestSeller.quantity} suất (${formatMoney(bestSeller.revenue)})`;
        } else {
            document.getElementById('reportBestSellerName').textContent = 'Chưa có dữ liệu';
            document.getElementById('reportBestSellerStats').textContent = '0 suất';
        }

        // Cập nhật Banner Ca Làm Việc
        const shiftBanner = document.getElementById('reportShiftBanner');
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const curTimeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

        const isTodayReport = shiftStartStr && shiftStartStr.startsWith(todayStr);
        const isEndLateOrFuture = shiftEndStr && (shiftEndStr.includes('23:59') || shiftEndStr.includes('00:00') || new Date(shiftEndStr).getTime() >= now.getTime());

        const isOngoingShift = (window.isCurrentShiftOngoing === true) || 
            (Boolean(selectedCashier) && !isCashierShiftClosedToday(selectedCashier) && isTodayReport) ||
            (isTodayReport && isEndLateOrFuture);

        if (shiftBanner) {
            shiftBanner.classList.remove('d-none');
            const cashierText = selectedCashier ? `Thu ngân: <b>${escapeHtml(selectedCashier)}</b>` : `Tất cả thu ngân (Toàn nhà hàng)`;
            const startText = formatDate(shiftStartStr);

            let endTextHtml = '';
            if (isOngoingShift) {
                endTextHtml = `<b class="text-success"><i class="mdi mdi-clock-fast"></i> Tới bây giờ (${curTimeStr})</b> <span class="badge bg-success text-white ms-1 shadow-sm"><i class="mdi mdi-progress-clock"></i> ${selectedCashier ? 'Đang trong ca' : 'Thời gian thực'}</span>`;
            } else {
                endTextHtml = `<b>${formatDate(shiftEndStr)}</b>`;
            }

            shiftBanner.innerHTML = `
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                        <span class="badge bg-primary text-white me-2" style="font-size: 13.5px;"><i class="mdi mdi-account-tie"></i> ${cashierText}</span>
                        <span><i class="mdi mdi-clock-in text-success"></i> Từ: <b>${startText}</b> ➔ <i class="mdi mdi-clock-out text-danger"></i> Đến: ${endTextHtml}</span>
                    </div>
                    <div style="font-size: 14.5px;">
                        <span>Thực thu: <strong class="text-success font-weight-bold" style="font-size: 16.5px;">${formatMoney(totalRevenue)}</strong></span>
                        <span class="text-muted ms-2">(${totalInvoices} HĐ thanh toán)</span>
                    </div>
                </div>
            `;
        }

        const updateText = document.getElementById('reportLastUpdatedText');
        if (updateText) {
            updateText.innerHTML = `<i class="mdi mdi-check-circle text-success me-1"></i>Cập nhật lúc: <b>${new Date().toLocaleTimeString('vi-VN')}</b>`;
        }

        // Sort & Prepare Data for Tables
        const sortedDates = Object.keys(revenueByDateMap).sort((a,b) => b.localeCompare(a));
        const sortedStaffs = Object.keys(revenueByStaffMap).sort((a,b) => revenueByStaffMap[b].revenue - revenueByStaffMap[a].revenue);
        const sortedMethods = Object.keys(revenueByPaymentMap);

        // Global report summary object
        window.currentReportSummary = {
            cashierName: selectedCashier || 'Tất cả thu ngân (Toàn nhà hàng)',
            shiftStart: shiftStartStr,
            shiftEnd: isOngoingShift ? `${todayStr}T${curTimeStr}` : shiftEndStr,
            isOngoing: isOngoingShift,
            totalRevenue: totalRevenue,
            totalSubtotal: totalSubtotal,
            totalDiscount: totalDiscount,
            totalCash: totalCash,
            totalTransfer: totalTransfer,
            cashCount: cashCount,
            transferCount: transferCount,
            totalInvoices: totalInvoices,
            averageInvoice: averageInvoice,
            totalItemsSold: totalItemsSold,
            bestSeller: bestSeller,
            invoices: filteredInvoices
        };

        window.currentReportDates = sortedDates.map(d => ({ date: d, invoices: revenueByDateMap[d].invoices, revenue: revenueByDateMap[d].revenue }));
        window.currentReportStaffs = sortedStaffs.map(s => ({ staff: s, count: revenueByStaffMap[s].count, revenue: revenueByStaffMap[s].revenue }));
        window.currentReportMethods = sortedMethods.map(m => ({ method: m, count: revenueByPaymentMap[m].count, revenue: revenueByPaymentMap[m].revenue }));
        window.currentReportItems = itemsArr;

        renderReportDatesTable();
        renderReportStaffsTable();
        renderReportMethodsTable();
        renderReportItemsTable();
        renderReportInvoicesTable();

    } catch (err) {
        console.error("Lỗi báo cáo doanh thu:", err);
        showAlert("Không thể lấy dữ liệu báo cáo doanh thu: " + err.message, "error");
    }
}

window.renderReportDatesTable = function() {
    const revDateBody = document.getElementById('reportRevenueByDateBody');
    if (!revDateBody) return;
    if (window.currentReportDates.length === 0) {
        revDateBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Không có dữ liệu doanh thu</td></tr>`;
        return;
    }

    revDateBody.innerHTML = window.currentReportDates.map((item, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${item.date}</strong></td>
            <td class="text-center">${item.invoices}</td>
            <td class="text-end text-success font-weight-bold">${formatMoney(item.revenue)}</td>
        </tr>
    `).join('');
};

window.renderReportStaffsTable = function() {
    const revStaffBody = document.getElementById('reportRevenueByStaffBody');
    if (!revStaffBody) return;
    if (!window.currentReportStaffs || window.currentReportStaffs.length === 0) {
        revStaffBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Không có dữ liệu nhân viên</td></tr>`;
        return;
    }

    revStaffBody.innerHTML = window.currentReportStaffs.map((item, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong><i class="mdi mdi-account-circle text-info me-1"></i>${escapeHtml(item.staff)}</strong></td>
            <td class="text-center">${item.count} đơn</td>
            <td class="text-end text-success font-weight-bold">${formatMoney(item.revenue)}</td>
        </tr>
    `).join('');
};

window.renderReportMethodsTable = function() {
    const revPayBody = document.getElementById('reportRevenueByPaymentBody');
    if (!revPayBody) return;
    if (window.currentReportMethods.length === 0) {
        revPayBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Chưa ghi nhận phương thức thanh toán</td></tr>`;
        return;
    }

    revPayBody.innerHTML = window.currentReportMethods.map((item, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong><i class="mdi mdi-credit-card-outline me-1"></i>${escapeHtml(item.method)}</strong></td>
            <td class="text-center">${item.count} lượt</td>
            <td class="text-end text-success font-weight-bold">${formatMoney(item.revenue)}</td>
        </tr>
    `).join('');
};

window.renderReportItemsTable = function() {
    const itemsBody = document.getElementById('reportItemsBreakdownBody');
    if (!itemsBody) return;
    if (window.currentReportItems.length === 0) {
        itemsBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Chưa có chi tiết bán món</td></tr>`;
        return;
    }

    itemsBody.innerHTML = window.currentReportItems.map((it, i) => {
        const estPrice = it.revenue > 0 ? (it.revenue / it.quantity) : 0;
        return `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${escapeHtml(it.name)}</strong></td>
            <td class="text-center"><span class="badge bg-info text-dark">${it.quantity} suất</span></td>
            <td class="text-end">${formatMoney(estPrice)}</td>
            <td class="text-end text-success font-weight-bold">${formatMoney(it.revenue)}</td>
        </tr>
        `;
    }).join('');
};

window.renderReportInvoicesTable = function(customList = null) {
    const listBody = document.getElementById('reportInvoicesListBody');
    const badge = document.getElementById('reportInvoicesListBadge');
    if (!listBody) return;

    const invoices = customList !== null ? customList : ((window.currentReportSummary && window.currentReportSummary.invoices) ? window.currentReportSummary.invoices : []);
    if (badge) badge.textContent = `${invoices.length} hóa đơn`;

    if (invoices.length === 0) {
        listBody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4"><i class="mdi mdi-information-outline me-1"></i>Không có hóa đơn thanh toán nào trong khoảng thời gian đã chọn</td></tr>`;
        return;
    }

    listBody.innerHTML = invoices.map((inv, idx) => {
        const timeStr = formatDate(inv.paidAt || inv.issuedAt || inv.createdAt);
        const tbl = inv.tableName || ('Bàn #' + (inv.tableId || '-'));
        const subtotal = Number(inv.subtotal || inv.totalAmount || 0);
        const discountAmt = Number(inv.discountAmount || 0);
        const total = Number(inv.totalAmount || inv.finalAmount || 0);
        const cashier = getCashierDisplayNameAdmin(inv.cashierName);
        const method = inv.paymentMethod || 'Tiền mặt';

        let methodBadge = 'badge bg-success text-white';
        const mLower = method.toLowerCase();
        if (mLower.includes('chuyển') || mLower.includes('transfer') || mLower.includes('qr')) methodBadge = 'badge bg-primary text-white';
        else if (mLower.includes('thẻ') || mLower.includes('card')) methodBadge = 'badge bg-info text-dark';

        return `
            <tr>
                <td>${idx + 1}</td>
                <td><strong class="text-primary">${escapeHtml(inv.invoiceCode || '#' + inv.id)}</strong></td>
                <td><span class="badge bg-secondary text-white">${escapeHtml(tbl)}</span></td>
                <td><small>${escapeHtml(timeStr)}</small></td>
                <td><i class="mdi mdi-account-circle text-muted me-1"></i>${escapeHtml(cashier)}</td>
                <td><span class="${methodBadge}">${escapeHtml(method)}</span></td>
                <td class="text-end text-muted">${formatMoney(subtotal)}</td>
                <td class="text-end text-danger">${discountAmt > 0 ? ('-' + formatMoney(discountAmt)) : '0 ₫'}</td>
                <td class="text-end text-success font-weight-bold">${formatMoney(total)}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary py-1 px-2 me-1" onclick="viewInvoiceDetails(${inv.id})" title="Xem chi tiết hóa đơn">
                        <i class="mdi mdi-eye"></i> Chi tiết
                    </button>
                    <button class="btn btn-sm btn-outline-info py-1 px-2" onclick="quickPrintInvoiceAdmin(${inv.id})" title="In lại hóa đơn POS">
                        <i class="mdi mdi-printer"></i> In
                    </button>
                </td>
            </tr>
        `;
    }).join('');
};

window.filterReportInvoicesTable = function(query) {
    if (!window.currentReportSummary || !window.currentReportSummary.invoices) return;
    const q = (query || '').trim().toLowerCase();
    if (!q) {
        window.renderReportInvoicesTable();
        return;
    }
    const filtered = window.currentReportSummary.invoices.filter(inv => {
        const code = String(inv.invoiceCode || inv.id || '').toLowerCase();
        const tbl = String(inv.tableName || inv.tableId || '').toLowerCase();
        const cashier = String(inv.cashierName || '').toLowerCase();
        const method = String(inv.paymentMethod || '').toLowerCase();
        return code.includes(q) || tbl.includes(q) || cashier.includes(q) || method.includes(q);
    });
    window.renderReportInvoicesTable(filtered);
};

window.exportRevenueExcel = function() {
    const summary = window.currentReportSummary;
    if (!summary || !summary.invoices) {
        showAlert("Chưa có dữ liệu để xuất Excel!", "warning");
        return;
    }

    let csv = "\uFEFF"; // UTF-8 BOM
    csv += "BÁO CÁO DOANH THU NHÀ HÀNG THANH HÓA\n";
    csv += `Thời gian xuất báo cáo:,${new Date().toLocaleString('vi-VN')}\n`;
    csv += `Kỳ báo cáo:,"${summary.shiftStart} đến ${summary.shiftEnd}"\n`;
    csv += `Thu ngân / Quản lý:,"${summary.cashierName}"\n`;
    csv += `Tổng thực thu (VNĐ):,${summary.totalRevenue}\n`;
    csv += `Doanh thu gốc (VNĐ):,${summary.totalSubtotal || summary.totalRevenue}\n`;
    csv += `Tổng tiền giảm giá (VNĐ):,${summary.totalDiscount || 0}\n`;
    csv += `Tiền mặt thu trong kỳ (VNĐ):,${summary.totalCash || 0}\n`;
    csv += `Chuyển khoản / QR (VNĐ):,${summary.totalTransfer || 0}\n`;
    csv += `Tổng số hóa đơn:,${summary.totalInvoices}\n`;
    csv += `Giá trị TB/HĐ (VNĐ):,${Math.round(summary.averageInvoice)}\n`;
    csv += `Tổng số món bán:,${summary.totalItemsSold}\n\n`;

    // 1. Theo PTTT
    csv += "1. PHƯƠNG THỨC THANH TOÁN\n";
    csv += "STT,Hình thức,Số lượt,Tổng tiền (VNĐ)\n";
    (window.currentReportMethods || []).forEach((m, idx) => {
        csv += `${idx + 1},"${m.method}",${m.count},${m.revenue}\n`;
    });
    csv += "\n";

    // 2. Món bán
    csv += "2. CHI TIẾT MÓN ĂN ĐÃ BÁN\n";
    csv += "STT,Tên món ăn,Số lượng bán,Tổng doanh thu món (VNĐ)\n";
    (window.currentReportItems || []).forEach((it, idx) => {
        csv += `${idx + 1},"${it.name.replace(/"/g, '""')}",${it.quantity},${it.revenue}\n`;
    });
    csv += "\n";

    // 3. Danh sách hóa đơn
    csv += "3. DANH SÁCH HÓA ĐƠN CHI TIẾT\n";
    csv += "STT,Mã HĐ,Bàn,Thời gian TT,Thu ngân,PTTT,Tiền gốc (VNĐ),Giảm giá (VNĐ),Thực thu (VNĐ)\n";
    summary.invoices.forEach((inv, idx) => {
        const timeStr = formatDate(inv.paidAt || inv.issuedAt || inv.createdAt);
        const tbl = inv.tableName || ('Bàn #' + (inv.tableId || '-'));
        const sub = Number(inv.subtotal || inv.totalAmount || 0);
        const disc = Number(inv.discountAmount || 0);
        const tot = Number(inv.totalAmount || inv.finalAmount || 0);
        const cName = getCashierDisplayNameAdmin(inv.cashierName);
        const method = inv.paymentMethod || 'Tiền mặt';
        csv += `${idx + 1},"${inv.invoiceCode || inv.id}","${tbl}","${timeStr}","${cName}","${method}",${sub},${disc},${tot}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `BaoCaoDoanhThu_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

function printA4ReportWindow(html) {
    const printWindow = window.open('', '', 'height=850,width=1000');
    if (!printWindow) {
        alert("Vui lòng cho phép popup trình duyệt để in báo cáo A4!");
        return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 600);
}

window.printA4RevenueReport = function() {
    const summary = window.currentReportSummary;
    if (!summary) {
        showAlert("Chưa có dữ liệu để in báo cáo!", "warning");
        return;
    }

    const printTime = new Date().toLocaleString('vi-VN');
    const startStr = summary.shiftStart ? formatDate(summary.shiftStart) : '-';
    const endStr = summary.isOngoing ? `Tới bây giờ (${printTime}) [Ca đang mở]` : (summary.shiftEnd ? formatDate(summary.shiftEnd) : '-');

    const methodsRows = (window.currentReportMethods || []).map(m => `
        <tr>
            <td><strong>${escapeHtml(m.method)}</strong></td>
            <td style="text-align:center;">${m.count}</td>
            <td style="text-align:right; font-weight:bold;">${formatMoney(m.revenue)}</td>
        </tr>
    `).join('');

    const itemsRows = (window.currentReportItems || []).slice(0, 30).map((it, idx) => `
        <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td>${escapeHtml(it.name)}</td>
            <td style="text-align:center; font-weight:bold;">${it.quantity}</td>
            <td style="text-align:right;">${formatMoney(it.revenue > 0 ? it.revenue / it.quantity : 0)}</td>
            <td style="text-align:right; font-weight:bold;">${formatMoney(it.revenue)}</td>
        </tr>
    `).join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Báo Cáo Doanh Thu Nhà Hàng - A4</title>
            <style>
                @page { size: A4; margin: 15mm; }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 13px; color: #1e293b; margin: 0; padding: 20px; line-height: 1.5; background: #fff; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 15px; }
                .restaurant-name { font-size: 20px; font-weight: 800; color: #0369a1; text-transform: uppercase; }
                .report-title { text-align: center; font-size: 20px; font-weight: 800; color: #0f172a; margin: 15px 0 5px 0; text-transform: uppercase; }
                .report-subtitle { text-align: center; font-size: 13px; color: #64748b; margin-bottom: 15px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 15px; font-size: 13px; }
                .kpi-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; }
                .kpi-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; background: #fff; }
                .kpi-val { font-size: 16px; font-weight: 800; color: #0284c7; margin-top: 4px; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 15px; font-size: 12.5px; }
                th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
                td { border: 1px solid #e2e8f0; padding: 6px 8px; }
                .section-header { font-size: 14px; font-weight: 700; color: #0369a1; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 15px; margin-bottom: 6px; }
                .signature-section { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; }
                .sig-box { width: 30%; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <div class="restaurant-name">NHÀ HÀNG THANH HÓA</div>
                    <div>Địa chỉ: TP. Thanh Hóa • Hotline: 0988888888</div>
                </div>
                <div style="text-align: right; font-size: 12px; color: #64748b;">
                    <div>Ngày in: ${escapeHtml(printTime)}</div>
                    <div>Mẫu: BC-DT-01</div>
                </div>
            </div>

            <div class="report-title">BÁO CÁO TỔNG HỢP DOANH THU</div>
            <div class="report-subtitle">Từ thời điểm: <b>${escapeHtml(startStr)}</b> ➔ Đến: <b>${escapeHtml(endStr)}</b></div>

            <div class="info-grid">
                <div>Thu ngân / Quản lý phụ trách: <b>${summary.shiftLabel ? `[${summary.shiftLabel}] ` : ''}${escapeHtml(summary.cashierName)}</b></div>
                <div>Tổng số hóa đơn phát sinh: <b>${summary.totalInvoices} HĐ</b></div>
                <div>Món bán chạy nhất: <b>${summary.bestSeller ? escapeHtml(summary.bestSeller.name) : '-'}</b></div>
                <div>Tổng số món / phần ăn: <b>${summary.totalItemsSold} món</b></div>
            </div>

            <!-- Financial KPIs -->
            <div class="kpi-cards">
                <div class="kpi-box">
                    <div>TỔNG THỰC THU</div>
                    <div class="kpi-val" style="color: #16a34a;">${formatMoney(summary.totalRevenue)}</div>
                    <small style="color: #64748b;">Gốc: ${formatMoney(summary.totalSubtotal || summary.totalRevenue)}</small>
                </div>
                <div class="kpi-box">
                    <div>TIỀN MẶT (KÉT)</div>
                    <div class="kpi-val" style="color: #d97706;">${formatMoney(summary.totalCash || 0)}</div>
                    <small style="color: #64748b;">${summary.cashCount || 0} lượt TT</small>
                </div>
                <div class="kpi-box">
                    <div>CHUYỂN KHOẢN / QR</div>
                    <div class="kpi-val" style="color: #0284c7;">${formatMoney(summary.totalTransfer || 0)}</div>
                    <small style="color: #64748b;">${summary.transferCount || 0} lượt TT</small>
                </div>
                <div class="kpi-box">
                    <div>TỔNG GIẢM GIÁ</div>
                    <div class="kpi-val" style="color: #dc2626;">${formatMoney(summary.totalDiscount || 0)}</div>
                    <small style="color: #64748b;">Chiết khấu/KM</small>
                </div>
            </div>

            <div class="section-header">1. DOANH THU THEO PHƯƠNG THỨC THANH TOÁN</div>
            <table>
                <thead>
                    <tr>
                        <th>Phương thức thanh toán</th>
                        <th style="text-align:center; width: 100px;">Số lượt</th>
                        <th style="text-align:right; width: 180px;">Tổng tiền thực thu</th>
                    </tr>
                </thead>
                <tbody>
                    ${methodsRows || '<tr><td colspan="3" style="text-align:center;">Chưa có dữ liệu</td></tr>'}
                </tbody>
            </table>

            <div class="section-header">2. TOP MÓN BÁN CHẠY NHẤT TRONG KỲ</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 35px; text-align: center;">#</th>
                        <th>Tên món ăn</th>
                        <th style="text-align:center; width: 90px;">SL bán</th>
                        <th style="text-align:right; width: 120px;">Đơn giá TB</th>
                        <th style="text-align:right; width: 150px;">Tổng doanh thu món</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows || '<tr><td colspan="5" style="text-align:center;">Chưa có dữ liệu món</td></tr>'}
                </tbody>
            </table>

            <div class="signature-section">
                <div class="sig-box">
                    <strong>NGƯỜI LẬP BÁO CÁO</strong><br>
                    <em>(Ký, ghi rõ họ tên)</em>
                    <br><br><br><br>
                    <span>${escapeHtml(getCashierDisplayNameAdmin())}</span>
                </div>
                <div class="sig-box">
                    <strong>KẾ TOÁN NHÀ HÀNG</strong><br>
                    <em>(Ký, ghi rõ họ tên)</em>
                    <br><br><br><br>
                    <span>....................................</span>
                </div>
                <div class="sig-box">
                    <strong>GIÁM ĐỐC / CHỦ NHÀ HÀNG</strong><br>
                    <em>(Ký, đóng dấu)</em>
                    <br><br><br><br>
                    <span>....................................</span>
                </div>
            </div>
        </body>
        </html>
    `;

    printA4ReportWindow(html);
};

// Global function aliases for bulletproof execution
window.viewInvoiceDetail = viewInvoiceDetails;
window.viewInvoiceDetails = viewInvoiceDetails;
window.printInvoice = quickPrintInvoiceAdmin;
window.quickPrintInvoiceAdmin = quickPrintInvoiceAdmin;


// -------------------------------------------------------------
// 12. UTILITY & BADGE HELPERS
// -------------------------------------------------------------
function getRoleBadgeClass(role) {
    switch (role) {
        case 'ROLE_ADMIN':
        case 'ADMIN': return 'bg-danger';
        case 'ROLE_STAFF':
        case 'STAFF': return 'bg-primary';
        case 'ROLE_CASHIER':
        case 'CASHIER': return 'bg-warning text-dark';
        case 'ROLE_KITCHEN':
        case 'KITCHEN': return 'bg-info text-dark';
        default: return 'bg-secondary';
    }
}

function getTableBadgeClass(status) {
    switch (status) {
        case 'AVAILABLE': return 'bg-success';
        case 'OCCUPIED':
        case 'BUSY': return 'bg-danger';
        case 'RESERVED': return 'bg-warning text-dark';
        default: return 'bg-secondary';
    }
}

function translateTableStatus(status) {
    switch (status) {
        case 'AVAILABLE': return 'Trống';
        case 'OCCUPIED':
        case 'BUSY': return 'Có khách';
        case 'RESERVED': return 'Đã đặt';
        default: return status || 'Trống';
    }
}

function getOrderBadgeClass(status) {
    switch (status) {
        case 'PENDING': return 'bg-warning text-dark';
        case 'PROCESSING': return 'bg-info text-dark';
        case 'SERVED': return 'bg-primary';
        case 'COMPLETED': return 'bg-success';
        case 'CANCELLED': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

function translateOrderStatus(status) {
    switch (status) {
        case 'PENDING': return 'Chờ xử lý';
        case 'PROCESSING': return 'Đang chế biến';
        case 'SERVED': return 'Đã lên món';
        case 'COMPLETED': return 'Hoàn thành';
        case 'CANCELLED': return 'Đã hủy';
        default: return status || 'Chờ xử lý';
    }
}

// -------------------------------------------------------------
// INITIALIZATION ON DOM READY & ROUTE HANDLING
// -------------------------------------------------------------
function detectTabFromUrl() {
    const validTabs = ['dashboard', 'users', 'categories', 'products', 'tables', 'orders', 'invoices', 'reports'];
    const path = window.location.pathname.replace(/\/+$/, "");
    const parts = path.split('/');
    const lastPart = parts[parts.length - 1];
    const hash = window.location.hash.replace('#', '');
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');

    if (validTabs.includes(lastPart)) {
        return lastPart;
    }
    if (validTabs.includes(hash)) {
        return hash;
    }
    if (validTabs.includes(tabParam)) {
        return tabParam;
    }
    return 'dashboard';
}

document.addEventListener("DOMContentLoaded", () => {
    // Ngăn chặn mọi thẻ <a href="#"> bị <base href="/dashboard/1/"> đẩy về trang Tổng quan
    document.addEventListener("click", (e) => {
        const anchor = e.target.closest('a[href="#"]');
        if (anchor) {
            e.preventDefault();
        }
    });

    const targetTab = detectTabFromUrl();
    showTab(targetTab, false);
});

window.addEventListener("popstate", () => {
    const targetTab = detectTabFromUrl();
    if (targetTab && targetTab !== currentTab) {
        showTab(targetTab, false);
    }
});

// -------------------------------------------------------------
// 13. REAL-TIME SHIFT SYNCHRONIZATION (CROSS-TAB & CROSS-DEVICE)
// -------------------------------------------------------------
try {
    const shiftBc = new BroadcastChannel('shift_sync_channel');
    shiftBc.onmessage = (event) => {
        if (event && event.data) {
            if (event.data.activeShiftsMap) {
                try {
                    localStorage.setItem('activeCashierShifts_map', JSON.stringify(event.data.activeShiftsMap));
                } catch(e) {}
            }
            if (event.data.type === 'SHIFT_OPENED' || event.data.type === 'SHIFT_CLOSED' || event.data.type === 'SHIFT_UPDATED') {
                if (typeof loadTodayCashierShifts === 'function') {
                    loadTodayCashierShifts();
                }
                if (currentTab === 'reports' && typeof handleFetchReport === 'function') {
                    handleFetchReport(true);
                }
            }
        }
    };
} catch(e) {}

window.addEventListener('storage', (e) => {
    if (!e.key || e.key.startsWith('activeCashierShift') || e.key.startsWith('closedCashierShifts') || e.key.startsWith('shiftOpening')) {
        if (typeof loadTodayCashierShifts === 'function') {
            loadTodayCashierShifts();
        }
        if (currentTab === 'reports' && typeof handleFetchReport === 'function') {
            handleFetchReport(true);
        }
    }
});

// Tự động kiểm tra làm mới danh sách ca định kỳ mỗi 5 giây khi admin đang ở trang báo cáo
setInterval(() => {
    if (currentTab === 'reports') {
        const filterInput = document.getElementById('shiftsFilterDate');
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const isToday = !filterInput || !filterInput.value || filterInput.value === todayStr;
        if (isToday && typeof loadTodayCashierShifts === 'function') {
            loadTodayCashierShifts();
        }
    }
}, 5000);


