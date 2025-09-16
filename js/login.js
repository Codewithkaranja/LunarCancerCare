/* ===== Login JS ===== */

// config
import { BASE_URL } from './config/config.js';
const loginURL = `${BASE_URL}/api/auth/login`;

document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
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
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Login failed");
    }

    const data = await res.json();
    const token = data.token;

    if (!token) throw new Error("No token returned from server");

    // save token to localStorage
    localStorage.setItem("authToken", token);

    // optional: save user info if returned
    if (data.user) localStorage.setItem("user", JSON.stringify(data.user));

    // redirect to dashboard
    window.location.href = "/dashboard.html"; // change if your dashboard has another URL

  } catch (e) {
    console.error(e);
    alert(e.message || "Login error");
  }
});

// optional: auto redirect if already logged in
window.addEventListener("load", () => {
  const token = localStorage.getItem("authToken");
  if (token) {
    window.location.href = "/dashboard.html";
  }
});
