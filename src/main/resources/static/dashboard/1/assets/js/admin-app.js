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
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString('vi-VN');
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
function checkAdminAuth() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/login";
        return false;
    }

    const payload = parseJwt(token);
    if (!payload) {
        localStorage.clear();
        window.location.href = "/login";
        return false;
    }

    // Check Token Expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
        localStorage.clear();
        window.location.href = "/login";
        return false;
    }

    // Check ADMIN Role
    const roles = payload.roles || [];
    const isAdmin = roles.includes("ROLE_ADMIN") || roles.includes("ADMIN");

    if (!isAdmin) {
        alert("Bạn không có quyền ADMIN để truy cập trang quản trị!");
        localStorage.clear();
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

// Execute Auth Guard Immediately
checkAdminAuth();

function logout() {
    if (confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống admin?")) {
        localStorage.clear();
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
            localStorage.clear();
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
        // Load Revenue Today
        try {
            const revRes = await fetchWithAuth('/api/v1/reports/revenue/today');
            if (revRes && revRes.data) {
                const totalRev = revRes.data.totalRevenue || 0;
                document.getElementById('todayRevenue').textContent = formatMoney(totalRev);
            }
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

async function loadTables() {
    try {
        const [res, orderRes] = await Promise.all([
            fetchWithAuth('/api/v1/tables'),
            fetchWithAuth('/api/v1/orders/all')
        ]);
        allTablesData = res.data || [];
        allOrdersData = orderRes.data || [];
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

    container.innerHTML = tables.map(t => {
        let statusBadge = 'bg-success';
        let statusText = 'Bàn trống';
        let cardBorder = 'border-success';

        if (t.status === 'OCCUPIED' || t.status === 'BUSY') {
            statusBadge = 'bg-danger';
            statusText = 'Có khách';
            cardBorder = 'border-danger';
        } else if (t.status === 'RESERVED') {
            statusBadge = 'bg-warning text-dark';
            statusText = 'Đã đặt';
            cardBorder = 'border-warning';
        }

        const rawName = String(t.tableName || t.name || t.id).trim();
        const displayName = rawName.toLowerCase().startsWith('bàn') ? rawName : ('Bàn ' + rawName);
        const activeOrder = (allOrdersData || []).find(o => o.tableId === t.id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
        const hasActiveOrder = !!activeOrder;

        return `
        <div class="col-md-3 col-sm-6 mb-4">
            <div class="card ${cardBorder} h-100 shadow-sm">
                <div class="card-body text-center p-3">
                    <div class="display-4 mb-2">🍽️</div>
                    <h5 class="card-title font-weight-bold mb-1">${escapeHtml(displayName)}</h5>
                    <p class="text-muted text-small mb-2">Sức chứa: ${t.capacity || 4} chỗ</p>
                    <span class="badge ${statusBadge} mb-3 p-2 d-inline-block">${statusText}</span>

                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle w-100" type="button" data-bs-toggle="dropdown" data-toggle="dropdown">
                            Trạng thái
                        </button>
                        <ul class="dropdown-menu shadow">
                            ${hasActiveOrder ? `
                                <li><a class="dropdown-item text-muted disabled" href="javascript:void(0);" style="opacity:0.6; cursor:not-allowed;" title="Bàn đang có đơn khách ăn bên POS, không thể chuyển bàn trống"><span style="text-decoration:line-through;">🟩 Đánh dấu TRỐNG</span> <small class="text-danger">(Có đơn ăn)</small></a></li>
                            ` : `
                                <li><a class="dropdown-item" href="javascript:void(0);" onclick="event.preventDefault(); updateTableStatus(${t.id}, 'AVAILABLE')">🟩 Đánh dấu TRỐNG</a></li>
                            `}
                            <li><a class="dropdown-item" href="javascript:void(0);" onclick="event.preventDefault(); updateTableStatus(${t.id}, 'OCCUPIED')">🟥 Đánh dấu CÓ KHÁCH</a></li>
                            <li><a class="dropdown-item" href="javascript:void(0);" onclick="event.preventDefault(); updateTableStatus(${t.id}, 'RESERVED')">🟨 Đánh dấu ĐẶT TRƯỚC</a></li>
                            <li><hr class="dropdown-divider"></li>
                            ${(hasActiveOrder || t.status === 'OCCUPIED' || t.status === 'BUSY') ? `
                                <li><a class="dropdown-item text-muted disabled" href="javascript:void(0);" style="opacity:0.6; cursor:not-allowed;" title="Bàn đang có khách hoặc có đơn, không thể xóa"><span style="text-decoration:line-through;">🗑️ Xóa bàn</span> <small class="text-danger">(Đang có đơn)</small></a></li>
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
}

function renderTablesListTable(tables) {
    const tbody = document.getElementById('tablesTableBody');
    if (!tbody) return;
    
    if (tables.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Đang tải danh sách bàn...</td></tr>`;
        renderPaginationControls('tablesPagination', 0, 'tables', 'renderTablesWrapper');
        return;
    }

    const state = paginationState.tables;
    const paginatedData = tables.slice((state.page - 1) * state.size, state.page * state.size);

    tbody.innerHTML = paginatedData.map((t, idx) => {
        const activeOrder = (allOrdersData || []).find(o => o.tableId === t.id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
        const hasActiveOrder = !!activeOrder || t.status === 'OCCUPIED' || t.status === 'BUSY';
        return `
        <tr>
            <td>${(state.page - 1) * state.size + idx + 1}</td>
            <td><strong>${escapeHtml(t.tableName || t.name || ('Bàn #' + t.id))}</strong></td>
            <td>${t.capacity || 4} chỗ</td>
            <td><span class="badge ${getTableBadgeClass(t.status)}">${translateTableStatus(t.status)}</span></td>
            <td>
                ${hasActiveOrder ? `
                    <button class="btn btn-sm btn-outline-secondary" disabled title="Bàn đang có đơn hàng hoặc có khách, không thể xóa" style="opacity: 0.65; cursor: not-allowed;">
                        <i class="mdi mdi-lock"></i> Đang có đơn
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
    if (newStatus === 'AVAILABLE' && table && table.status === 'OCCUPIED') {
        // Chỉ chặn nếu bàn ĐANG CÓ ĐƠN HÀNG THỰC TẾ chưa thanh toán (từ bên Order/POS)
        const hasActiveOrder = (allOrdersData || []).some(o => o.tableId === id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
        if (hasActiveOrder) {
            Swal.fire({
                icon: 'warning',
                title: 'Không thể chuyển bàn trống!',
                html: `Bàn <b>${table.tableName || id}</b> hiện đang có đơn gọi món từ bên Order chưa thanh toán!<br><br>Vui lòng thanh toán hoặc hủy đơn bên POS trước khi chuyển bàn trống.`,
                confirmButtonColor: '#d33'
            });
            return;
        }
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

window.openFutureReservationModal = async function(tableId, tableName) {
    const today = new Date().toISOString().split('T')[0];
    const nowHour = new Date().getHours();
    const nextStartHour = String(Math.min(nowHour + 1, 23)).padStart(2, '0') + ':00';
    const nextEndHour = String(Math.min(nowHour + 3, 23)).padStart(2, '0') + ':00';

    const { value: formValues } = await Swal.fire({
        title: `<div style="font-size:20px; font-weight:bold; color:#17a2b8;"><i class="mdi mdi-calendar-clock"></i> Đặt ${tableName} Giờ Tiếp Theo</div>`,
        html: `
            <div style="text-align: left; font-size: 14px;">
                <p class="text-muted mb-2"><small>Bàn hiện đang có khách. Bạn đang đặt trước bàn này cho khách tiếp theo vào khung giờ sau:</small></p>
                <div class="mb-2">
                    <label class="form-label font-weight-bold mb-1">Tên khách hàng *</label>
                    <input id="swal-res-name" class="form-control" placeholder="Nhập tên khách hàng">
                </div>
                <div class="mb-2">
                    <label class="form-label font-weight-bold mb-1">Số điện thoại *</label>
                    <input id="swal-res-phone" class="form-control" placeholder="Nhập số điện thoại">
                </div>
                <div class="row g-2 mb-2">
                    <div class="col-6">
                        <label class="form-label font-weight-bold mb-1">Ngày đặt *</label>
                        <input id="swal-res-date" type="date" class="form-control" value="${today}">
                    </div>
                    <div class="col-6">
                        <label class="form-label font-weight-bold mb-1">Số lượng khách</label>
                        <input id="swal-res-guests" type="number" min="1" class="form-control" value="4">
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

        // 2. Tạo Reservation cho khung giờ tiếp theo
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

        Swal.fire({
            icon: 'success',
            title: 'Đặt bàn thành công!',
            html: `Đã đặt trước <b>${tableName}</b> cho khách <b>${formValues.name}</b> vào lúc <b>${formValues.start.slice(0,5)} - ${formValues.end.slice(0,5)}</b> ngày <b>${formValues.date}</b>.<br><br><small class="text-muted">Khách hiện tại ở bàn vẫn tiếp tục dùng bữa bình thường.</small>`,
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
                <button class="btn btn-sm btn-outline-info me-1" onclick="viewOrderDetails(${o.id})">
                    <i class="mdi mdi-eye"></i> Chi tiết đơn
                </button>
                <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                        Đổi trạng thái
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="javascript:void(0);" onclick="event.preventDefault(); updateOrderStatus(${o.id}, 'PENDING')">Chờ xử lý</a></li>
                        <li><a class="dropdown-item" href="javascript:void(0);" onclick="event.preventDefault(); updateOrderStatus(${o.id}, 'PROCESSING')">Đang chế biến</a></li>
                        <li><a class="dropdown-item" href="javascript:void(0);" onclick="event.preventDefault(); updateOrderStatus(${o.id}, 'SERVED')">Đã lên món</a></li>
                        <li><a class="dropdown-item" href="javascript:void(0);" onclick="event.preventDefault(); updateOrderStatus(${o.id}, 'COMPLETED')">Hoàn thành</a></li>
                        <li><a class="dropdown-item text-danger" href="javascript:void(0);" onclick="event.preventDefault(); updateOrderStatus(${o.id}, 'CANCELLED')">Hủy đơn</a></li>
                    </ul>
                </div>
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
                <button class="btn btn-sm btn-outline-info me-1" onclick="viewInvoiceDetails(${inv.id})">
                    <i class="mdi mdi-eye"></i> Chi tiết
                </button>
                ${inv.status !== 'PAID' ? `
                    <button class="btn btn-sm btn-success me-1" onclick="updateInvoiceStatus(${inv.id}, 'PAID')">
                        <i class="mdi mdi-cash-register"></i> Thanh toán
                    </button>
                ` : ''}
                <button class="btn btn-sm btn-outline-secondary" onclick="openDiscountModal(${inv.id})">
                    Giảm giá
                </button>
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
        
        // Lấy tên nhân viên từ order nếu có
        let staffName = 'Nhân viên';
        if (inv.orderId) {
            const matchedOrder = allOrdersData.find(o => o.id === inv.orderId);
            if (matchedOrder && matchedOrder.username) {
                staffName = matchedOrder.username;
            }
        }
        const staffEl = document.getElementById('modalInvoiceStaff');
        if (staffEl) staffEl.textContent = staffName;

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

function printInvoiceWindow(inv) {
    const printContent = document.getElementById('invoicePrintArea').innerHTML;
    const printWindow = window.open('', '', 'height=650,width=800');
    printWindow.document.write(`
        <html>
            <head>
                <title>In Hóa Đơn #${inv.invoiceCode || inv.id}</title>
                <link rel="stylesheet" href="assets/vendors/css/vendor.bundle.base.css">
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                    .invoice-header { text-align: center; margin-bottom: 20px; }
                    .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    .table th, .table td { border: 1px solid #ddd; padding: 8px; }
                    .text-end { text-align: right; }
                    .text-center { text-align: center; }
                </style>
            </head>
            <body>
                <div class="invoice-header">
                    <h2>🍽️ NHÀ HÀNG THANH HÓA</h2>
                    <p>HÓA ĐƠN THANH TOÁN KHÁCH HÀNG</p>
                    <hr>
                </div>
                ${printContent}
                <br><br>
                <div class="text-center">
                    <p>Cảm ơn quý khách và hẹn gặp lại!</p>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

async function updateInvoiceStatus(id, newStatus) {
    try {
        await fetchWithAuth(`/api/v1/invoices/${id}/status?status=${newStatus}`, { method: 'PUT' });
        showAlert("Cập nhật trạng thái hóa đơn thành công!", "success");
        loadInvoices();
    } catch (err) {
        showAlert("Cập nhật thất bại: " + err.message, "error");
    }
}

function openDiscountModal(id) {
    document.getElementById('discountInvoiceId').value = id;
    document.getElementById('discountPercent').value = 0;
    $('#discountModal').modal('show');
}

async function handleApplyDiscount(e) {
    e.preventDefault();
    const id = document.getElementById('discountInvoiceId').value;
    const percent = document.getElementById('discountPercent').value;

    try {
        await fetchWithAuth(`/api/v1/invoices/${id}/discount?discountPercent=${percent}`, { method: 'PUT' });
        showAlert("Áp dụng giảm giá thành công!", "success");
        $('#discountModal').modal('hide');
        loadInvoices();
    } catch (err) {
        showAlert("Áp dụng giảm giá thất bại: " + err.message, "error");
    }
}

// -------------------------------------------------------------
// 11. MODULE 8: REVENUE & REPORTS (ROBUST DEFAULT DATES & DTO SUPPORT)
// -------------------------------------------------------------
async function loadReports() {
    const today = new Date();
    const toStr = today.toISOString().split('T')[0];

    const past = new Date();
    past.setDate(past.getDate() - 30);
    const fromStr = past.toISOString().split('T')[0];

    const fromInput = document.getElementById('reportFromDate');
    const toInput = document.getElementById('reportToDate');

    if (fromInput) fromInput.value = fromStr;
    if (toInput) toInput.value = toStr;

    handleFetchReport();
}

function printReport() {
    const from = document.getElementById('reportFromDate').value;
    const to = document.getElementById('reportToDate').value;
    
    // Copy content of reports tab
    const printContent = document.getElementById('tab-reports').cloneNode(true);
    
    // Remove the filter row from the print out
    const filterRow = printContent.querySelector('.card-body .row');
    if(filterRow) filterRow.parentElement.parentElement.remove(); // Removes the filter card
    
    const printWindow = window.open('', '', 'height=800,width=1000');
    printWindow.document.write(`
        <html>
            <head>
                <title>In Báo Cáo Thống Kê</title>
                <link rel="stylesheet" href="assets/vendors/css/vendor.bundle.base.css">
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                    .report-header { text-align: center; margin-bottom: 20px; }
                    .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    .table th, .table td { border: 1px solid #ddd; padding: 8px; }
                    .text-end { text-align: right; }
                    .text-center { text-align: center; }
                    .card { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; }
                    .row { display: flex; flex-wrap: wrap; margin-right: -15px; margin-left: -15px; }
                    .col-md, .col-md-6 { padding-right: 15px; padding-left: 15px; }
                    .col-md-6 { width: 50%; float: left; box-sizing: border-box; }
                    .col-md { flex-grow: 1; min-width: 150px; text-align: center; }
                    .table-responsive { overflow: visible !important; max-height: none !important; }
                    @media print {
                        .col-md-6 { width: 50%; float: left; }
                        .table-responsive { max-height: none !important; }
                        .card { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="report-header">
                    <h2>🍽️ BÁO CÁO THỐNG KÊ DOANH THU</h2>
                    <p>Thời gian: Từ <strong>${from}</strong> đến <strong>${to}</strong></p>
                    <hr>
                </div>
                ${printContent.innerHTML}
                <br><br>
                <div class="text-end">
                    <p>Người in: <strong>Quản trị viên</strong></p>
                    <p>Ngày in: <strong>${new Date().toLocaleDateString('vi-VN')}</strong></p>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

async function handleFetchReport(resetPage = false) {
    if (resetPage === true) {
        paginationState.reportsDate.page = 1;
        paginationState.reportsPayment.page = 1;
        paginationState.reportsItems.page = 1;
    }
    const from = document.getElementById('reportFromDate').value;
    const to = document.getElementById('reportToDate').value;

    if (!from || !to) {
        showAlert("Vui lòng chọn từ ngày và đến ngày", "error");
        return;
    }

    try {
        const res = await fetchWithAuth('/api/v1/invoices/all');
        const allInvoices = res.data || [];
        
        // Lọc hóa đơn theo khoảng thời gian và trạng thái PAID
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        
        const filteredInvoices = allInvoices.filter(inv => {
            if(inv.status !== 'PAID') return false;
            const d = new Date(inv.issuedAt || inv.createdAt || inv.paidAt);
            return d >= fromDate && d <= toDate;
        });

        // 1. Tính toán KPIs
        let totalRevenue = 0;
        let totalItemsSold = 0;
        const itemSales = {}; // key: productName, value: { quantity, revenue }
        const revenueByDateMap = {}; // key: YYYY-MM-DD, value: { invoices, revenue }
        const revenueByStaffMap = {}; // key: staffName, value: { count, revenue }
        const revenueByPaymentMap = {}; // key: method, value: { count, revenue }

        // Lấy danh sách orders để map tên nhân viên cho từng hóa đơn
        let ordersMap = {};
        try {
            const ordRes = await fetchWithAuth('/api/v1/orders/all');
            (ordRes.data || []).forEach(o => {
                ordersMap[o.id] = o.username || o.userName || 'Nhân viên';
            });
        } catch(e) {}

        for (const inv of filteredInvoices) {
            const invAmount = inv.finalAmount || inv.totalAmount || 0;
            totalRevenue += invAmount;
            
            // Theo ngày
            const dateStr = new Date(inv.issuedAt || inv.createdAt || inv.paidAt).toISOString().split('T')[0];
            if(!revenueByDateMap[dateStr]) revenueByDateMap[dateStr] = { invoices: 0, revenue: 0 };
            revenueByDateMap[dateStr].invoices += 1;
            revenueByDateMap[dateStr].revenue += invAmount;
            
            // Theo nhân viên order / thu ngân
            const staffName = ordersMap[inv.orderId] || inv.username || 'Nhân viên';
            if(!revenueByStaffMap[staffName]) revenueByStaffMap[staffName] = { count: 0, revenue: 0 };
            revenueByStaffMap[staffName].count += 1;
            revenueByStaffMap[staffName].revenue += invAmount;

            // Theo phương thức thanh toán
            const method = inv.paymentMethod || 'Tiền mặt';
            if(!revenueByPaymentMap[method]) revenueByPaymentMap[method] = { count: 0, revenue: 0 };
            revenueByPaymentMap[method].count += 1;
            revenueByPaymentMap[method].revenue += invAmount;
            
            // Items
            let items = inv.items || inv.invoiceItems || [];
            if(items.length === 0 && inv.orderId) {
                try {
                    const itemRes = await fetchWithAuth(`/api/v1/order-items/order/${inv.orderId}`);
                    items = itemRes.data || [];
                } catch(e) {}
            }
            
            for(const it of items) {
                const qty = it.quantity || 1;
                const price = (it.unitPrice || it.price || 0);
                const itemTot = it.subtotal || it.totalPrice || (price * qty);
                const pName = it.productName || (it.product ? it.product.name : 'Món ăn');
                
                totalItemsSold += qty;
                
                if(!itemSales[pName]) itemSales[pName] = { quantity: 0, revenue: 0 };
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
            if(!bestSeller || stats.quantity > bestSeller.quantity) {
                bestSeller = { name, quantity: stats.quantity, revenue: stats.revenue };
            }
        }
        itemsArr.sort((a,b) => b.quantity - a.quantity);

        // Fill Summary Cards
        document.getElementById('reportTotalRevenue').textContent = formatMoney(totalRevenue);
        document.getElementById('reportTotalInvoices').textContent = `${totalInvoices} hóa đơn`;
        document.getElementById('reportAverageInvoice').textContent = formatMoney(averageInvoice);
        document.getElementById('reportTotalItemsSold').textContent = `${totalItemsSold} phần/món`;

        if (bestSeller) {
            document.getElementById('reportBestSellerName').textContent = bestSeller.name;
            document.getElementById('reportBestSellerStats').textContent = `Đã bán: ${bestSeller.quantity} suất (${formatMoney(bestSeller.revenue)})`;
        } else {
            document.getElementById('reportBestSellerName').textContent = 'Chưa có dữ liệu';
            document.getElementById('reportBestSellerStats').textContent = '0 suất';
        }

        // Sort & Prepare Data for Tables
        const sortedDates = Object.keys(revenueByDateMap).sort((a,b) => b.localeCompare(a));
        const sortedStaffs = Object.keys(revenueByStaffMap).sort((a,b) => revenueByStaffMap[b].revenue - revenueByStaffMap[a].revenue);
        const sortedMethods = Object.keys(revenueByPaymentMap);

        // Store current reports data globally for pagination
        window.currentReportDates = sortedDates.map(d => ({ date: d, invoices: revenueByDateMap[d].invoices, revenue: revenueByDateMap[d].revenue }));
        window.currentReportStaffs = sortedStaffs.map(s => ({ staff: s, count: revenueByStaffMap[s].count, revenue: revenueByStaffMap[s].revenue }));
        window.currentReportMethods = sortedMethods.map(m => ({ method: m, count: revenueByPaymentMap[m].count, revenue: revenueByPaymentMap[m].revenue }));
        window.currentReportItems = itemsArr;

        renderReportDatesTable();
        renderReportStaffsTable();
        renderReportMethodsTable();
        renderReportItemsTable();

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

