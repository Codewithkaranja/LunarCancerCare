// ================== BASE URL ==================
const BASE_URL = "https://hmis3-backend.onrender.com";
const endpoints = {
  staff: `${BASE_URL}/api/staff`,
};

// ================== HELPERS ==================
function formatDateISO(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return isNaN(d) ? "" : d.toISOString().split("T")[0];
}

function flash(msg, ttl = 2000) {
  let t = document.getElementById("hc-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "hc-toast";
    t.style =
      "position:fixed;bottom:20px;right:20px;background:#222;color:#fff;padding:10px 14px;border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,0.2);z-index:9999;";
    document.body.appendChild(t);
  }
  t.innerText = msg;
  t.style.opacity = "1";
  setTimeout(() => (t.style.opacity = "0"), ttl);
}

function authHeaders() {
  const token = localStorage.getItem("token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

async function apiFetch(url, options = {}) {
  options.headers = { ...authHeaders(), ...(options.headers || {}) };
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "API Error");
  return data;
}

// ================== STATE ==================
let staffData = [];
let selectedStaffId = null;

// ================== FETCH STAFF ==================
async function fetchStaff() {
  try {
    staffData = await apiFetch(endpoints.staff);
    renderStaffTable(staffData);
  } catch (err) {
    console.error("Fetch staff error:", err);
    flash("Error fetching staff");
  }
}

// ================== RENDER STAFF TABLE ==================
function renderStaffTable(list) {
  const table = document.getElementById("staffTable");
  if (!table) return;
  table.innerHTML = "";
  list.forEach((s, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${s.name}</td>
      <td>${s.role}</td>
      <td>${s.department || ""}</td>
      <td>${s.email || ""}</td>
      <td>${s.phone || ""}</td>
      <td>${s.qualifications || ""}</td>
      <td>${s.hiredDate ? new Date(s.hiredDate).toLocaleDateString() : ""}</td>
      <td>${s.shift || ""}</td>
      <td>${s.username}</td>
      <td>
        <button onclick="viewStaff('${s._id}')">View / Edit</button>
        <button onclick="deleteStaff('${s._id}')">Delete</button>
      </td>
    `;
    table.appendChild(tr);
  });
}

// ================== ADD / UPDATE STAFF ==================
async function addOrUpdateStaff() {
  const payload = {
    name: document.getElementById("sName")?.value || "",
    role: (document.getElementById("sRole")?.value || "").toLowerCase(),
    department: document.getElementById("sDepartment")?.value || "",
    email: document.getElementById("sEmail")?.value || "",
    phone: document.getElementById("sPhone")?.value || "",
    qualifications: document.getElementById("sQualifications")?.value || "",
    hiredDate: document.getElementById("sHiredDate")?.value || "",
    shift: document.getElementById("sShift")?.value || "",
    username: document.getElementById("sUsername")?.value || "",
  };

  const password = document.getElementById("sPassword")?.value;
  if (password) payload.password = password;

  try {
    let res, data;
    if (selectedStaffId) {
      res = await fetch(`${endpoints.staff}/${selectedStaffId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      data = await res.json();
      flash(res.ok ? "Staff updated" : data.error || "Failed to update staff");
    } else {
      res = await fetch(endpoints.staff, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      data = await res.json();
      flash(res.ok ? "Staff added" : data.error || "Failed to add staff");
    }
    fetchStaff();
    clearStaffForm();
    closeStaffModal();
  } catch (err) {
    console.error(err);
    flash("Error saving staff");
  }
}

// ================== CLEAR STAFF FORM ==================
function clearStaffForm() {
  ["sName","sRole","sDepartment","sEmail","sPhone","sQualifications","sHiredDate","sShift","sUsername","sPassword"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  selectedStaffId = null;
}

// ================== VIEW STAFF ==================
function viewStaff(id) {
  const staff = staffData.find(s => s._id === id);
  if (!staff) return flash("Staff not found");
  selectedStaffId = id;

  ["modalStaffName","modalStaffRole","modalStaffDepartment","modalStaffEmail","modalStaffPhone","modalStaffQualifications","modalStaffHiredDate","modalStaffShift"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = staff[id.replace("modal","").toLowerCase()] || "";
  });

  // Pre-fill form for editing
  ["sName","sRole","sDepartment","sEmail","sPhone","sQualifications","sHiredDate","sShift","sUsername"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === "sHiredDate") el.value = staff.hiredDate ? new Date(staff.hiredDate).toISOString().substr(0,10) : "";
    else el.value = staff[id.replace("s","").toLowerCase()] || "";
  });

  const modal = document.getElementById("staffModal");
  if (modal) modal.classList.remove("hidden");
}

function closeStaffModal() {
  const modal = document.getElementById("staffModal");
  if (modal) modal.classList.add("hidden");
  clearStaffForm();
}

// ================== DELETE STAFF ==================
async function deleteStaff(id) {
  if (!confirm("Are you sure you want to delete this staff?")) return;
  try {
    const res = await fetch(`${endpoints.staff}/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    flash(res.ok ? "Staff deleted" : data.error || "Failed to delete staff");
    fetchStaff();
  } catch (err) {
    console.error(err);
    flash("Error deleting staff");
  }
}

// ================== SEARCH / FILTER ==================
function filterStaff() {
  const term = document.getElementById("searchStaff")?.value.toLowerCase() || "";
  const filtered = staffData.filter(s =>
    s.name.toLowerCase().includes(term) ||
    (s.role && s.role.toLowerCase().includes(term)) ||
    (s.department && s.department.toLowerCase().includes(term))
  );
  renderStaffTable(filtered);
}

// ================== EXPORT CSV ==================
function exportStaffCSV() {
  if (!staffData.length) return flash("No staff to export");
  const headers = ["Name","Role","Department","Email","Phone","Qualifications","Hired Date","Shift","Username"];
  const csv = [
    headers.join(","),
    ...staffData.map(s => [
      s.name, s.role, s.department||"", s.email||"", s.phone||"", s.qualifications||"",
      s.hiredDate ? new Date(s.hiredDate).toLocaleDateString() : "", s.shift||"", s.username||""
    ].join(","))
  ].join("\n");

  const blob = new Blob([csv], {type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `staff_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ================== INITIALIZE ==================
fetchStaff();
