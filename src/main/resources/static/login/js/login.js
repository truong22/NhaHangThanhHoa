const API_URL = "/api/v1/auth/login";

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("loginButton");

const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// Hiện / ẩn mật khẩu
togglePassword.addEventListener("click", () => {
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    togglePassword.textContent = "Ẩn";
  } else {
    passwordInput.type = "password";
    togglePassword.textContent = "Hiện";
  }
});

// Đăng nhập
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    loginMessage.style.color = "#e74c3c";
    loginMessage.textContent = "Vui lòng nhập đầy đủ email và mật khẩu.";
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Đang đăng nhập...";
  loginMessage.textContent = "";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Email hoặc mật khẩu không đúng.");
    }

    const data = result.data;
    const token = data.token;
    const payload = parseJwt(token);

    if (!payload) {
      throw new Error("Token không hợp lệ.");
    }

    let roles = [];
    if (Array.isArray(payload.roles)) {
      roles = payload.roles;
    } else if (typeof payload.roles === "string") {
      roles = [payload.roles];
    } else if (payload.role) {
      roles = Array.isArray(payload.role) ? payload.role : [payload.role];
    }

    const isAdmin = roles.some(r => typeof r === 'string' && (r.toUpperCase() === "ROLE_ADMIN" || r.toUpperCase() === "ADMIN"));
    const isStaff = roles.some(r => typeof r === 'string' && (r.toUpperCase() === "ROLE_STAFF" || r.toUpperCase() === "STAFF" || r.toUpperCase() === "ROLE_CASHIER" || r.toUpperCase() === "CASHIER"));
    const isKitchen = roles.some(r => typeof r === 'string' && (r.toUpperCase() === "ROLE_KITCHEN" || r.toUpperCase() === "KITCHEN"));

    if (!isAdmin && !isStaff && !isKitchen) {
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("userRoles");
      localStorage.removeItem("userEmail");
      loginMessage.style.color = "#e74c3c";
      loginMessage.textContent = "Tài khoản của bạn không có quyền truy cập!";
      return;
    }

    // Lưu thông tin đăng nhập
    localStorage.setItem("token", token);
    localStorage.setItem("userId", data.id);
    localStorage.setItem("userEmail", payload.sub || email);
    localStorage.setItem("userFullName", data.fullName || "");
    localStorage.setItem("userRoles", JSON.stringify(roles));

    loginMessage.style.color = "#2ecc71";
    loginMessage.textContent = "Đăng nhập thành công! Đang chuyển hướng...";

    setTimeout(() => {
      if (isKitchen && !isAdmin) {
        window.location.href = "/kitchen";
      } else if (isAdmin) {
        window.location.href = "/admin";
      } else {
        window.location.href = "/pos-tables";
      }
    }, 600);

  } catch (error) {
    console.error(error);

    loginMessage.style.color = "#e74c3c";
    loginMessage.textContent =
        error.message || "Không thể kết nối đến máy chủ.";

  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Đăng nhập";
  }
});