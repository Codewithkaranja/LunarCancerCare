// ================= BASE URLS =================
const base = "http://localhost:5000";
const patientsURL = `${base}/api/patients`;
const appointmentsURL = `${base}/api/appointments`;
const staffURL = `${base}/api/staff`;
const medicinesURL = `${base}/api/medicines`;

// ================= HELPERS =================
function formatDateISO(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  return d.toISOString().split("T")[0];
}
function formatTimeISO(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  return d.toTimeString().slice(0, 5);
}

// ================= CHART HANDLERS =================
let ageChartInstance = null;
let appointmentsChartInstance = null;

// ================= LOGIN =================
const loginForm = document.getElementById("loginForm");
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      loginForm.classList.add("hidden");
      document.getElementById("dashboardContainer").classList.remove("hidden");
      document.getElementById("adminName").innerText =
        data.staff?.name || username;
      fetchAll();
      showSection("dashboard");
    } else {
      alert(data.message || "Login failed");
    }
  } catch (err) {
    console.error(err);
    alert("Login error - check server");
  }
});

// ================= NAVIGATION =================
function showSection(section) {
  const sections = [
    "dashboard",
    "patients",
    "appointments",
    "staff",
    "inventory",
    "reports",
  ];
  sections.forEach((sec) => {
    const el = document.getElementById(sec + "Section");
    if (el) el.classList.add("hidden");
  });
  const target = document.getElementById(section + "Section");
  if (target) target.classList.remove("hidden");
}

// ================= FETCH ALL =================
async function fetchAll() {
  fetchPatients();
  fetchAppointments();
  fetchStaff();
  loadMedicines();
}

// ================= PATIENTS =================
/* ===== Full Patients Dashboard JS (with history, print, CSV, schedule appt) ===== */

const baseURL = "http://localhost:5000";
const patientURL = `${baseURL}/api/patients`;
const appointmentURL = `${baseURL}/api/appointments`;
const billsURL = `${baseURL}/api/bills`;
const prescriptionsURL = `${baseURL}/api/prescriptions`;

let patients = [];

// ---------------------- Fetch & Display Patients ----------------------
async function fetchPatients() {
  try {
    const res = await fetch(patientURL);
    patients = await res.json();
    displayPatients(patients);
    updateSummary();
  } catch (e) {
    console.error("Error fetching patients:", e);
  }
}

function displayPatients(list) {
  const tbody = document.getElementById("patientsTable");
  tbody.innerHTML = "";
  list.forEach((p, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHtml(p.name)}</td>
      <td>${p.age ?? "-"}</td>
      <td>${escapeHtml(p.ailment || "-")}</td>
      <td>${new Date(p.admissionDate || p.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="btn small" onclick='viewPatient("${p._id}")'>View</button>
        <button class="btn small" onclick='editPatientForm("${p._id}")'>Edit</button>
        <button class="btn small danger" onclick='deletePatient("${p._id}")'>Delete</button>
        <button class="btn small" onclick='printPatient("${p._id}")'>Print</button>
        <button class="btn small primary" onclick='openScheduleAppointment("${p._id}")'>Schedule</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// small helper to avoid XSS if any
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function updateSummary() {
  const totalEl = document.getElementById("totalPatients");
  if (totalEl) totalEl.innerText = Array.isArray(patients) ? patients.length : 0;
}

// ---------------------- Search / Filter ----------------------
function filterPatients() {
  const term = (document.getElementById("searchPatient")?.value || "").toLowerCase();
  const filtered = patients.filter(p =>
    (p.name || "").toLowerCase().includes(term) ||
    (p.phone || "").includes(term) ||
    (p.ailment || "").toLowerCase().includes(term)
  );
  displayPatients(filtered);
}
document.getElementById("searchPatient")?.addEventListener("input", filterPatients);

// ---------------------- Add / Edit / Delete Patients ----------------------
async function addPatient() {
  const patient = {
    name: document.getElementById("pName").value.trim(),
    age: document.getElementById("pAge").value,
    gender: document.getElementById("pGender").value,
    email: document.getElementById("pEmail").value.trim(),
    phone: document.getElementById("pPhone").value.trim(),
    nationalId: document.getElementById("pNationalId").value.trim(),
    ailment: document.getElementById("pAilment").value.trim(),
    // admissionDate optional - backend will set createdAt if missing
  };
  if (!patient.name || !patient.age || !patient.ailment) {
    alert("Fill all required fields (name, age, ailment)");
    return;
  }
  try {
    const res = await fetch(patientURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patient),
    });
    if (!res.ok) {
      const err = await res.json().catch(()=> ({}));
      throw new Error(err.message || "Error adding patient");
    }
    clearPatientForm();
    await fetchPatients();
    flash("Patient added");
  } catch (e) {
    console.error(e);
    alert(e.message || "Server error");
  }
}

function clearPatientForm() {
  ["pName","pAge","pGender","pEmail","pPhone","pNationalId","pAilment"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const btn = document.querySelector("#patientsSection .form-container button");
  if (btn) { btn.innerText = "Add Patient"; btn.onclick = addPatient; }
}

function editPatientForm(id) {
  const p = patients.find(x => x._id === id);
  if (!p) return;
  document.getElementById("pName").value = p.name || "";
  document.getElementById("pAge").value = p.age || "";
  document.getElementById("pGender").value = p.gender || "";
  document.getElementById("pEmail").value = p.email || "";
  document.getElementById("pPhone").value = p.phone || "";
  document.getElementById("pNationalId").value = p.nationalId || "";
  document.getElementById("pAilment").value = p.ailment || "";
  const btn = document.querySelector("#patientsSection .form-container button");
  btn.innerText = "Save Changes";
  btn.onclick = () => savePatientChanges(id);
}

async function savePatientChanges(id) {
  const updatedPatient = {
    name: document.getElementById("pName").value.trim(),
    age: document.getElementById("pAge").value,
    gender: document.getElementById("pGender").value,
    email: document.getElementById("pEmail").value.trim(),
    phone: document.getElementById("pPhone").value.trim(),
    nationalId: document.getElementById("pNationalId").value.trim(),
    ailment: document.getElementById("pAilment").value.trim(),
  };
  try {
    const res = await fetch(`${patientURL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedPatient),
    });
    if (!res.ok) {
      const err = await res.json().catch(()=> ({}));
      throw new Error(err.message || "Error updating patient");
    }
    clearPatientForm();
    await fetchPatients();
    flash("Patient updated");
  } catch (e) {
    console.error(e);
    alert(e.message);
  }
}

async function deletePatient(id) {
  if (!confirm("Are you sure you want to delete this patient?")) return;
  try {
    const res = await fetch(`${patientURL}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Error deleting patient");
    await fetchPatients();
    flash("Patient deleted");
  } catch (e) {
    console.error(e);
    alert(e.message || "Delete failed");
  }
}

// ---------------------- View Patient & Fetch Related Data ----------------------
async function viewPatient(id) {
  const p = patients.find(x => x._id === id);
  if (!p) return;

  document.getElementById("modalName").innerText = p.name || "-";
  document.getElementById("modalAge").innerText = p.age ?? "-";
  document.getElementById("modalGender").innerText = p.gender || "-";
  document.getElementById("modalEmail").innerText = p.email || "-";
  document.getElementById("modalPhone").innerText = p.phone || "-";
  document.getElementById("modalNationalId").innerText = p.nationalId || "-";
  document.getElementById("modalAilment").innerText = p.ailment || "-";
  document.getElementById("modalDateAdmitted").innerText = new Date(p.admissionDate || p.createdAt).toLocaleString();

  setModalActionButtons(id);

  const [appointments, bills, prescriptions] = await Promise.all([
    fetchRelated(`${appointmentURL}/patient/${id}`),
    fetchRelated(`${billsURL}?patientId=${id}`),
    fetchRelated(`${prescriptionsURL}?patientId=${id}`)
  ]);

  renderAppointmentsInModal(appointments || []);
  renderBillsInModal(bills || []);
  renderPrescriptionsInModal(prescriptions || []);

  document.getElementById("patientModal").classList.remove("hidden");
}

async function fetchRelated(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("fetchRelated error", e);
    return [];
  }
}

function setModalActionButtons(patientId) {
  const printBtn = document.querySelector("#patientModal .modal-actions .print-history");
  if (printBtn) printBtn.onclick = () => printPatientHistory(patientId);

  const exportBtn = document.querySelector("#patientModal .modal-actions .export-bills");
  if (exportBtn) exportBtn.onclick = () => exportBillsCSV(patientId);

  const scheduleBtn = document.querySelector("#patientModal .modal-actions .schedule-appt");
  if (scheduleBtn) scheduleBtn.onclick = () => openScheduleAppointment(patientId);
}

// ---------------------- Render helpers ----------------------
function renderAppointmentsInModal(items) {
  const container = document.getElementById("modalPrevAppointments");
  if (!container) return;
  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = "<em>No previous appointments</em>";
    return;
  }
  const rows = items.map(a => {
    const date = new Date(a.appointmentDate || a.date || a.createdAt).toLocaleString();
    return `<tr>
      <td>${date}</td>
      <td>${escapeHtml(a.reason || "-")}</td>
      <td>${escapeHtml(a.status || "-")}</td>
      <td>${a.staffId?.name || a.doctorName || "-"}</td>
    </tr>`;
  }).join("");
  container.innerHTML = `<table class="modal-table"><thead><tr><th>Date</th><th>Reason</th><th>Status</th><th>Doctor</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderBillsInModal(items) {
  const container = document.getElementById("modalBills");
  if (!container) return;
  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = "<em>No bills found</em>";
    return;
  }
  const rows = items.map(b => {
    const date = new Date(b.createdAt || b.date).toLocaleString();
    return `<tr>
      <td>${date}</td>
      <td>${escapeHtml(b.description || "-")}</td>
      <td>${b.amount ?? 0}</td>
      <td>${escapeHtml(b.paymentStatus || b.status || "Unpaid")}</td>
    </tr>`;
  }).join("");
  container.innerHTML = `<div class="bills-actions">
      <button class="btn small export-bills">Export CSV</button>
      <button class="btn small print-history">Print History</button>
    </div>
    <table class="modal-table"><thead><tr><th>Date</th><th>Desc</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
  setModalActionButtons(currentModalPatientId);
}

function renderPrescriptionsInModal(items) {
  const container = document.getElementById("modalPrescriptions");
  if (!container) return;
  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = "<em>No prescriptions found</em>";
    return;
  }
  const rows = items.map(p => {
    const date = new Date(p.createdAt || p.date).toLocaleDateString();
    return `<tr>
      <td>${date}</td>
      <td>${escapeHtml(p.medicine || p.name || "-")}</td>
      <td>${escapeHtml(p.dosage || p.instructions || "-")}</td>
      <td>${escapeHtml(p.issuedBy || p.staffName || "-")}</td>
    </tr>`;
  }).join("");
  container.innerHTML = `<table class="modal-table"><thead><tr><th>Date</th><th>Medicine</th><th>Dosage</th><th>Prescribed By</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ---------------------- Print patient history ----------------------
let currentModalPatientId = null;

function printPatientHistory(patientId) {
  const patient = patients.find(x => x._id === patientId);
  if (!patient) return;
  currentModalPatientId = patientId;

  const header = `<h1>Patient History - ${escapeHtml(patient.name)}</h1>
    <p>Admitted: ${new Date(patient.admissionDate || patient.createdAt).toLocaleString()}</p>
    <hr/>`;

  const apptsHTML = document.getElementById("modalPrevAppointments")?.innerHTML || "";
  const billsHTML = document.getElementById("modalBills")?.innerHTML || "";
  const prescriptionsHTML = document.getElementById("modalPrescriptions")?.innerHTML || "";

  const content = `
    <html>
      <head><title>Patient History</title></head>
      <body>
        ${header}
        <h2>Appointments</h2>${apptsHTML}
        <h2>Bills</h2>${billsHTML}
        <h2>Prescriptions</h2>${prescriptionsHTML}
      </body>
    </html>
  `;

  const w = window.open("", "", "width=900,height=700");
  w.document.write(content);
  w.document.close();
  w.focus();
  w.print();
}

// ---------------------- Export bills CSV ----------------------
function exportBillsCSV(patientId) {
  const container = document.getElementById("modalBills");
  if (!container) { alert("No bills to export"); return; }

  const rows = Array.from(container.querySelectorAll("table tbody tr"));
  if (!rows.length) { alert("No bills to export"); return; }

  const csv = [["Date","Description","Amount","Status"]];
  rows.forEach(r => {
    const cols = Array.from(r.querySelectorAll("td")).map(td => td.innerText.trim().replaceAll(",", ""));
    csv.push(cols);
  });

  const csvContent = csv.map(r => r.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bills_${patientId}_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------------- Schedule Appointment ----------------------
function openScheduleAppointment(patientId) {
  let apptModal = document.getElementById("scheduleApptModal");
  if (!apptModal) createScheduleApptModal();

  document.getElementById("apptPatientId").value = patientId;
  document.getElementById("apptDate").value = "";
  document.getElementById("apptTime").value = "";
  document.getElementById("apptReason").value = "";
  document.getElementById("scheduleApptModal").classList.remove("hidden");
}

function createScheduleApptModal() {
  const div = document.createElement("div");
  div.id = "scheduleApptModal";
  div.className = "modal";
  div.innerHTML = `
    <div class="modal-content">
      <span class="close" onclick="closeScheduleApptModal()">&times;</span>
      <h3>Schedule Appointment</h3>
      <input type="hidden" id="apptPatientId" />
      <div class="input-group">
        <label>Date & Time</label>
        <input id="apptDate" type="date" />
        <input id="apptTime" type="time" />
      </div>
      <div class="input-group">
        <label>Reason</label>
        <input id="apptReason" type="text" />
      </div>
      <div style="margin-top:12px;">
        <button class="btn" onclick="submitScheduleAppointment()">Schedule</button>
        <button class="btn" onclick="closeScheduleApptModal()">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(div);
}

function closeScheduleApptModal(){
  document.getElementById("scheduleApptModal")?.classList.add("hidden");
}

async function submitScheduleAppointment() {
  const patientId = document.getElementById("apptPatientId").value;
  const date = document.getElementById("apptDate").value;
  const time = document.getElementById("apptTime").value;
  const reason = document.getElementById("apptReason").value.trim();

  if (!patientId || !date || !time) {
    alert("Please choose appointment date and time");
    return;
  }

  const appointmentDate = new Date(`${date}T${time}:00`).toISOString();

  try {
    const res = await fetch(appointmentURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, staffId: null, appointmentDate, reason })
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      throw new Error(err.message || "Error scheduling appointment");
    }
    closeScheduleApptModal();
    flash("Appointment scheduled");
  } catch (e) {
    console.error(e);
    alert(e.message || "Appointment error");
  }
}

// ---------------------- Helper UI ----------------------
function flash(msg, ttl = 2000) {
  let t = document.getElementById("hc-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "hc-toast";
    t.style = "position:fixed;bottom:20px;right:20px;background:#222;color:#fff;padding:10px 14px;border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,0.2);z-index:9999;";
    document.body.appendChild(t);
  }
  t.innerText = msg;
  t.style.opacity = "1";
  setTimeout(() => { t.style.opacity = "0"; }, ttl);
}

// initial load
fetchPatients();


// ================= APPOINTMENTS =================
async function fetchAppointments() {
  try {
    const res = await fetch(appointmentsURL);
    const data = await res.json();
    const tbody = document.getElementById("appointmentsTable");
    tbody.innerHTML = "";
    const dates = [];
    data.forEach((a) => {
      const d = a.date ? formatDateISO(a.date) : "";
      const t = a.time ? formatTimeISO(a.time) : "";
      dates.push(d);
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${a._id}</td>
        <td><input type="text" id="aPatient-${a._id}" value="${a.patientName || ""}"></td>
        <td><input type="text" id="aDoctor-${a._id}" value="${a.doctorName || ""}"></td>
        <td><input type="date" id="aDate-${a._id}" value="${d}"></td>
        <td><input type="time" id="aTime-${a._id}" value="${t}"></td>
        <td><input type="text" id="aReason-${a._id}" value="${a.reason || ""}"></td>
        <td>
          <button onclick="editAppointment('${a._id}')">Save</button>
          <button onclick="deleteAppointment('${a._id}')">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
    document.getElementById("totalAppointments").innerText = Array.isArray(data)
      ? data.length
      : 0;

    // ✅ Hook appointments chart
    renderAppointmentsChart(dates);
  } catch (e) {
    console.error(e);
  }
}

async function addAppointment() {
  const patientName = document.getElementById("aPatientName").value.trim();
  const doctorName = document.getElementById("aDoctorName").value.trim();
  const date = document.getElementById("aDate").value;
  const time = document.getElementById("aTime").value;
  const reason = document.getElementById("aReason").value.trim();
  if (!patientName || !doctorName || !date || !time) {
    alert("Fill all required fields");
    return;
  }
  try {
    await fetch(appointmentsURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientName, doctorName, date, time, reason }),
    });
    document.getElementById("aPatientName").value = "";
    document.getElementById("aDoctorName").value = "";
    document.getElementById("aDate").value = "";
    document.getElementById("aTime").value = "";
    document.getElementById("aReason").value = "";
    fetchAppointments();
  } catch (e) {
    console.error(e);
  }
}

async function editAppointment(id) {
  const patientName = document.getElementById(`aPatient-${id}`).value;
  const doctorName = document.getElementById(`aDoctor-${id}`).value;
  const date = document.getElementById(`aDate-${id}`).value;
  const time = document.getElementById(`aTime-${id}`).value;
  const reason = document.getElementById(`aReason-${id}`).value;
  try {
    await fetch(`${appointmentsURL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientName, doctorName, date, time, reason }),
    });
    fetchAppointments();
  } catch (e) {
    console.error(e);
  }
}

async function deleteAppointment(id) {
  if (!confirm("Delete appointment?")) return;
  try {
    await fetch(`${appointmentsURL}/${id}`, { method: "DELETE" });
    fetchAppointments();
  } catch (e) {
    console.error(e);
  }
}

// ================= STAFF =================
async function fetchStaff() {
  try {
    const res = await fetch(staffURL);
    const data = await res.json();
    const tbody = document.getElementById("staffTable");
    tbody.innerHTML = "";
    data.forEach((s) => {
      const hired = s.hiredDate ? formatDateISO(s.hiredDate) : "";
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${s._id}</td>
        <td><input type="text" id="sName-${s._id}" value="${s.name || ""}"></td>
        <td><input type="text" id="sRole-${s._id}" value="${s.role || ""}"></td>
        <td><input type="email" id="sEmail-${s._id}" value="${s.email || ""}"></td>
        <td><input type="text" id="sQualifications-${s._id}" value="${s.qualifications || ""}"></td>
        <td><input type="date" id="sHiredDate-${s._id}" value="${hired}"></td>
        <td><input type="tel" id="sPhone-${s._id}" value="${s.phone || ""}"></td>
        <td>
          <button onclick="editStaff('${s._id}')">Save</button>
          <button onclick="deleteStaff('${s._id}')">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
    document.getElementById("staffCount").innerText = Array.isArray(data)
      ? data.length
      : 0;
  } catch (e) {
    console.error(e);
  }
}

async function addStaff() {
  const name = document.getElementById("sName").value.trim();
  const role = document.getElementById("sRole").value.trim();
  const department = document.getElementById("sDepartment").value.trim();
  const email = document.getElementById("sEmail").value.trim();
  const phone = document.getElementById("sPhone").value.trim();
  const qualifications = document.getElementById("sQualifications").value.trim();
  const hiredDate = document.getElementById("sHiredDate").value;
  const password = document.getElementById("sPassword").value.trim(); // ✅ added password
  if (!name || !role || !password) {
    alert("Fill name, role and password");
    return;
  }
  try {
    await fetch(staffURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        role,
        department,
        email,
        phone,
        qualifications,
        hiredDate,
        password, // ✅ send to backend
      }),
    });
    document.getElementById("sName").value = "";
    document.getElementById("sRole").value = "";
    document.getElementById("sDepartment").value = "";
    document.getElementById("sEmail").value = "";
    document.getElementById("sPhone").value = "";
    document.getElementById("sQualifications").value = "";
    document.getElementById("sHiredDate").value = "";
    document.getElementById("sPassword").value = ""; // clear password
    fetchStaff();
  } catch (e) {
    console.error(e);
  }
}

async function editStaff(id) {
  const name = document.getElementById(`sName-${id}`).value;
  const role = document.getElementById(`sRole-${id}`).value;
  const email = document.getElementById(`sEmail-${id}`).value;
  const qualifications = document.getElementById(`sQualifications-${id}`).value;
  const hiredDate = document.getElementById(`sHiredDate-${id}`).value;
  const phone = document.getElementById(`sPhone-${id}`).value;
  try {
    await fetch(`${staffURL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        role,
        email,
        qualifications,
        hiredDate,
        phone,
      }),
    });
    fetchStaff();
  } catch (e) {
    console.error(e);
  }
}

async function deleteStaff(id) {
  if (!confirm("Delete staff?")) return;
  try {
    await fetch(`${staffURL}/${id}`, { method: "DELETE" });
    fetchStaff();
  } catch (e) {
    console.error(e);
  }
}

// ================= INVENTORY =================
// ================= INVENTORY =================
let medicinesData = [];
let currentUser = { role: "superadmin" }; // replace with real logged-in user

// <-- Backend API URL -->
//const medicinesURL = "http://localhost:5000/api/medicines";

// DOM elements
const inventoryTable = document.getElementById("inventoryTableBody");
const medNameInput = document.getElementById("medName");
const medBatchInput = document.getElementById("medBatch");
const medQuantityInput = document.getElementById("medQuantity");
const medUnitInput = document.getElementById("medUnit");
const medPriceInput = document.getElementById("medPrice");
const medExpiryInput = document.getElementById("medExpiry");
const inventorySearch = document.getElementById("inventorySearch");
const stockChartCtx = document.getElementById("stockChart").getContext("2d");
let stockChart;

// ================== Load Medicines =================
async function loadMedicines() {
  try {
    const res = await fetch(medicinesURL);
    const data = await res.json();
    medicinesData = Array.isArray(data) ? data : [];
    
    medicinesData = medicinesData.map(m => ({
      _id: m._id,
      name: m.name || "-",
      batch: m.batch || "-",
      quantity: m.quantity ?? 0,
      unit: m.unit || "pcs",
      price: m.price ?? 0,
      expiryDate: m.expiryDate || null
    }));

    renderInventoryTable(medicinesData);
    renderStockChart(medicinesData);
  } catch (e) {
    console.error("Failed to load medicines:", e);
  }
}

// ================== Render Table =================
function renderInventoryTable(data) {
  inventoryTable.innerHTML = "";
  if (!data.length) {
    inventoryTable.innerHTML = `<tr><td colspan="7" style="text-align:center;">No medicines found</td></tr>`;
    return;
  }

  const today = new Date();
  data.forEach(m => {
    const expiryDate = m.expiryDate ? new Date(m.expiryDate) : null;
    const isExpired = expiryDate && expiryDate < today;
    const lowStock = m.quantity <= 5;

    const tr = document.createElement("tr");
    tr.className = isExpired ? "expired" : lowStock ? "low-stock" : "";

    tr.innerHTML = `
      <td>${m.name}</td>
      <td>${m.batch}</td>
      <td>${m.quantity}</td>
      <td>${m.unit}</td>
      <td>${m.price}</td>
      <td>${expiryDate ? expiryDate.toISOString().split("T")[0] : ""}</td>
      <td>
        ${currentUser.role === "superadmin" ? `
          <button onclick="openEditModal('${m._id}')">Edit</button>
          <button onclick="deleteMedicine('${m._id}')">Delete</button>
        ` : `<span style="color:gray;">No actions</span>`}
      </td>
    `;
    inventoryTable.appendChild(tr);
  });
}

// ================== Open Edit Modal =================
function openEditModal(id) {
  if (currentUser.role !== "superadmin") return alert("Unauthorized");

  const med = medicinesData.find(m => m._id === id);
  if (!med) return;

  medNameInput.value = med.name;
  medBatchInput.value = med.batch;
  medQuantityInput.value = med.quantity;
  medUnitInput.value = med.unit;
  medPriceInput.value = med.price;
  medExpiryInput.value = med.expiryDate ? new Date(med.expiryDate).toISOString().split("T")[0] : "";

  medNameInput.dataset.editId = id;
}

// ================== Add / Update Medicine =================
async function addOrUpdateMedicine() {
  if (currentUser.role !== "superadmin") return alert("Unauthorized");

  const id = medNameInput.dataset.editId || null;
  const name = medNameInput.value.trim();
  const batch = medBatchInput.value.trim();
  const quantity = parseInt(medQuantityInput.value);
  const unit = medUnitInput.value.trim();
  const price = parseFloat(medPriceInput.value);
  const expiryDate = medExpiryInput.value;

  if (!name || isNaN(quantity) || quantity < 0) {
    alert("Please provide a valid Name and Quantity");
    return;
  }

  const bodyData = { name, batch, quantity, unit, price, expiryDate };

  try {
    if (id) {
      await fetch(`${medicinesURL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });
      delete medNameInput.dataset.editId;
      alert("Medicine updated successfully!");
    } else {
      await fetch(medicinesURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });
      alert("Medicine added successfully!");
    }

    clearMedicineForm();
    loadMedicines();
  } catch (e) {
    console.error("Error adding/updating medicine:", e);
    alert("Operation failed, check console.");
  }
}

// ================== Delete Medicine =================
async function deleteMedicine(id) {
  if (currentUser.role !== "superadmin") return alert("Unauthorized");
  if (!confirm("Delete this medicine?")) return;

  try {
    await fetch(`${medicinesURL}/${id}`, { method: "DELETE" });
    alert("Medicine deleted!");
    loadMedicines();
  } catch (e) {
    console.error("Failed to delete medicine:", e);
  }
}

// ================== Clear Form =================
function clearMedicineForm() {
  medNameInput.value = "";
  medBatchInput.value = "";
  medQuantityInput.value = "";
  medUnitInput.value = "";
  medPriceInput.value = "";
  medExpiryInput.value = "";
  delete medNameInput.dataset.editId;
}

// ================== Search / Filter =================
inventorySearch.addEventListener("input", () => {
  const query = inventorySearch.value.toLowerCase();
  const filtered = medicinesData.filter(m =>
    m.name.toLowerCase().includes(query) ||
    (m.batch || "").toLowerCase().includes(query) ||
    (m.unit || "").toLowerCase().includes(query)
  );
  renderInventoryTable(filtered);
  renderStockChart(filtered);
});

// ================== Sort Inventory =================
function sortInventory(field) {
  medicinesData.sort((a,b) => {
    if (field === "expiryDate") {
      return new Date(a[field] || 0) - new Date(b[field] || 0);
    }
    return (a[field] > b[field]) ? 1 : (a[field] < b[field]) ? -1 : 0;
  });
  renderInventoryTable(medicinesData);
  renderStockChart(medicinesData);
}

// ================== Render Stock Chart =================
function renderStockChart(data) {
  if (stockChart) stockChart.destroy();

  const labels = data.map(m => m.name);
  const quantities = data.map(m => m.quantity);

  stockChart = new Chart(stockChartCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Stock Levels",
        data: quantities,
        backgroundColor: quantities.map(q => q <= 5 ? "#ffc107" : "#4e73df")
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

// ================== Initialize =================
loadMedicines();


// ================= REPORTS (Charts) =================
function renderAgeChart(ages) {
  if (!ages || ages.length === 0) return;
  const ctx = document.getElementById("ageChart").getContext("2d");

  if (ageChartInstance) ageChartInstance.destroy(); // ✅ prevent duplicates

  ageChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ages.map((_, i) => `Patient ${i + 1}`),
      datasets: [
        {
          label: "Age Distribution",
          data: ages,
          backgroundColor: "rgba(75,192,192,0.6)",
        },
      ],
    },
  });
}

function renderAppointmentsChart(dates) {
  if (!dates || dates.length === 0) return;
  const ctx = document.getElementById("appointmentsChart").getContext("2d");

  if (appointmentsChartInstance) appointmentsChartInstance.destroy(); // ✅ prevent duplicates

  appointmentsChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: [
        {
          label: "Appointments Over Time",
          data: dates.map(() => 1),
          fill: false,
          borderColor: "rgba(75,192,192,1)",
        },
      ],
    },
  });
}

// ================= AUTH / LOGIN ENHANCEMENTS =================

// Login with JWT & mustChangePassword check
const loginForms = document.getElementById("loginForm");
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (res.ok) {
      if (data.mustChangePassword) {
        showSection("changePassword");
        document.getElementById("cpStaffId").value = data.staffId;
        return;
      }

      loginForm.classList.add("hidden");
      document.getElementById("dashboardContainer").classList.remove("hidden");
      document.getElementById("adminName").innerText = data.staff?.name || username;

      // Save token and role
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.staff.role);

      fetchAll();
      showSection("dashboard");
      applyRoleAccess(data.staff.role);
    } else {
      alert(data.message || "Login failed");
    }
  } catch (err) {
    console.error(err);
    alert("Login error - check server");
  }
});

// Password change
async function updatePassword() {
  const password = document.getElementById("newPassword").value.trim();
  const confirm = document.getElementById("confirmPassword").value.trim();
  const staffId = document.getElementById("cpStaffId").value;

  if (!password || !confirm) return alert("Fill both fields");
  if (password !== confirm) return alert("Passwords do not match");

  try {
    const res = await fetch(`${base}/api/auth/update-password/${staffId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error updating password");

    alert("Password updated. Please login again.");
    document.getElementById("changePasswordSection").classList.add("hidden");
    loginForm.classList.remove("hidden");
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
  } catch (e) {
    console.error(e);
    alert(e.message || "Server error");
  }
}

// Role-based access control
function applyRoleAccess(role) {
  const restrictedSections = ["staffSection", "inventorySection"];
  if (role !== "superadmin") {
    restrictedSections.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });
  }
}

// Auth header helper for fetch
function authHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}


//ADMINISTER MEDICINE

const patientNameInput = document.getElementById("patientName");
const medicineSelect = document.getElementById("medicineSelect");
const quantityUsedInput = document.getElementById("quantityUsed");

// Populate medicine dropdown
function populateMedicineDropdown() {
  medicineSelect.innerHTML = medicinesData.map(m => 
    `<option value="${m._id}" ${m.quantity <= 0 ? 'disabled' : ''}>
      ${m.name} (Stock: ${m.quantity})
    </option>`
  ).join('');
}

// Call this after loading medicines
loadMedicines().then(populateMedicineDropdown);

// Administer medicine
async function administerMedicine() {
  const patientName = patientNameInput.value.trim();
  const medId = medicineSelect.value;
  const quantityUsed = parseInt(quantityUsedInput.value);

  if (!patientName || !medId || isNaN(quantityUsed) || quantityUsed <= 0) {
    return alert("Fill all fields with valid values");
  }

  const med = medicinesData.find(m => m._id === medId);
  if (!med || med.quantity < quantityUsed) {
    return alert("Insufficient stock");
  }

  try {
    // 1. Save usage record
    await fetch("/api/medicineUsage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        medicineId: medId,
        patientName,
        administeredBy: currentUser.role,
        quantityUsed,
        dateTime: new Date()
      })
    });

    // 2. Update inventory quantity
    await fetch(`${medicinesURL}/${medId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: med.quantity - quantityUsed })
    });

    // 3. Refresh UI
    patientNameInput.value = "";
    quantityUsedInput.value = "";
    loadMedicines().then(populateMedicineDropdown());

    alert("Medicine administered successfully!");
  } catch (e) {
    console.error(e);
    alert("Error administering medicine");
  }
}
