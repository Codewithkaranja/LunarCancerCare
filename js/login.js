// ===== Login JS =====
import { BASE_URL } from '../config/config.js';
import { setAuth, getToken } from './auth.js';

const loginURL = `${BASE_URL}/api/auth/login`;
const loginForm = document.getElementById("loginForm");

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    alert("Please enter username and password");
    return;
  }

  try {
    const res = await fetch(loginURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || data.message || "Invalid credentials");
    }

    // ✅ If backend forces password change
    if (data.mustChangePassword) {
      localStorage.setItem("staffId", data.id);
      localStorage.setItem("staffCode", data.staffCode);
      window.location.href = "../html/change-password.html";
      return;
    }

    // ✅ Save token + user (ensure correct property name from backend)
    const token = data.token;
    const user = data.user || data.staff; // fallback if API uses staff instead
    if (!token || !user) throw new Error("Invalid login response from server");

    setAuth(token, user);

    // ✅ Redirect to dashboard
    window.location.href = "../html/dashboard.html";

  } catch (err) {
    console.error("Login error:", err);
    alert(err.message || "Login error");
  }
});

// ✅ Auto redirect if already logged in
window.addEventListener("load", () => {
  if (getToken()) {
    window.location.href = "../html/dashboard.html";
  }
});
