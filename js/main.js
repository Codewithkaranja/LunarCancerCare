// main.js
import { formatDateISO, formatTimeISO, escapeHtml, apiFetch } from './helpers.js';
import { showSection, applyRoleAccess } from './navigation.js';
import { renderAgeChart, renderAppointmentsChart } from './charts.js';
import { initModalForms, openScheduleAppointmentModal, populateMedicineDropdown } from './modals.js';
import { getToken, logout } from './auth.js';

// ================= BASE URLS =================
export const BASE_URL = "https://hmis3-backend.onrender.com";
export const endpoints = {
  patients: `${BASE_URL}/api/patients`,
  appointments: `${BASE_URL}/api/appointments`,
  staff: `${BASE_URL}/api/staff`,
  medicines: `${BASE_URL}/api/medicines`,
  auth: `${BASE_URL}/api/auth`,
};

// ================= GLOBAL STATE =================
let patients = [];
let appointments = [];
let medicinesData = [];
const currentUser = JSON.parse(localStorage.getItem("user")) || { role: "guest" };

// ================= AUTH CHECK =================
if (!getToken()) {
  // Redirect to login if no token
  window.location.href = "../html/login.html";
}

// ================= FETCH ALL =================
export async function fetchAll() {
  await Promise.all([
    fetchPatients(),
    fetchAppointments(),
    fetchStaff(),
    loadMedicines()
  ]);
}

// ================= PATIENTS =================
export async function fetchPatients() {
  try {
    patients = await apiFetch(endpoints.patients);
    displayPatients(patients);
    const totalPatientsEl = document.getElementById("totalPatients");
    if (totalPatientsEl) totalPatientsEl.innerText = patients.length;
  } catch (e) {
    console.error("Fetch patients error:", e);
  }
}

export function displayPatients(list) {
  const tbody = document.getElementById("patientsTable");
  if (!tbody) return;
  tbody.innerHTML = "";
  list.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${escapeHtml(p.name)}</td>
      <td>${p.age ?? "-"}</td>
      <td>${escapeHtml(p.ailment || "-")}</td>
      <td>${new Date(p.admissionDate || p.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="btn small" onclick='viewPatient("${p._id}")'>View</button>
        <button class="btn small" onclick='editPatientForm("${p._id}")'>Edit</button>
        <button class="btn small danger" onclick='deletePatient("${p._id}")'>Delete</button>
        <button class="btn small" onclick='printPatientHistory("${p._id}")'>Print</button>
        <button class="btn small primary" onclick='openScheduleAppointmentModal("${p._id}")'>Schedule</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// ================= APPOINTMENTS =================
export async function fetchAppointments() {
  try {
    appointments = await apiFetch(endpoints.appointments);
    displayAppointments(appointments);
    const totalAppointmentsEl = document.getElementById("totalAppointments");
    if (totalAppointmentsEl) totalAppointmentsEl.innerText = appointments.length;

    const dates = appointments.map(a => formatDateISO(a.date));
    renderAppointmentsChart(dates);
  } catch (e) {
    console.error("Fetch appointments error:", e);
  }
}

export function displayAppointments(list) {
  const tbody = document.getElementById("appointmentsTable");
  if (!tbody) return;
  tbody.innerHTML = "";
  list.forEach((a, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${escapeHtml(a.patient?.name || "-")}</td>
      <td>${formatDateISO(a.date)}</td>
      <td>${formatTimeISO(a.date)}</td>
      <td>${a.status}</td>
      <td>
        <button onclick='editAppointment("${a._id}")'>Edit</button>
        <button onclick='deleteAppointment("${a._id}")'>Cancel</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// ================= STAFF =================
export async function fetchStaff() {
  try {
    const data = await apiFetch(endpoints.staff);
    const tbody = document.getElementById("staffTable");
    if (!tbody) return;
    tbody.innerHTML = "";
    data.forEach(s => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.staffCode || ""}</td>
        <td><input type="text" id="sName-${s._id}" value="${s.name || ""}"></td>
        <td><input type="text" id="sRole-${s._id}" value="${s.role || ""}"></td>
        <td><input type="text" id="sUsername-${s._id}" value="${s.username || ""}"></td>
        <td>${s.failedLogins >= 5 ? "<span style='color:red'>Locked</span>" : "Active"}</td>
        <td>
          <button onclick="editStaff('${s._id}')">Save</button>
          <button onclick="deleteStaff('${s._id}')">Delete</button>
          <button onclick="openResetPasswordModal('${s._id}')">Reset Password</button>
          <button onclick="unlockStaff('${s._id}')">Unlock</button>
        </td>`;
      tbody.appendChild(tr);
    });
    const staffCountEl = document.getElementById("staffCount");
    if (staffCountEl) staffCountEl.innerText = data.length;
  } catch (e) {
    console.error("Fetch staff error:", e);
  }
}

// ================= INVENTORY =================
export async function loadMedicines() {
  try {
    const data = await apiFetch(endpoints.medicines);
    medicinesData = data.map(m => ({
      _id: m._id,
      name: m.name || "-",
      batch: m.batch || "-",
      quantity: m.quantity ?? 0,
      unit: m.unit || "pcs",
      price: m.price ?? 0,
      expiryDate: m.expiryDate || null
    }));
    renderInventoryTable(medicinesData);
    populateMedicineDropdown(medicinesData);
  } catch (e) {
    console.error("Load medicines error:", e);
  }
}

export function renderInventoryTable(data) {
  const tbody = document.getElementById("inventoryTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No medicines found</td></tr>`;
    return;
  }

  const today = new Date();
  data.forEach(m => {
    const expiryDate = m.expiryDate ? new Date(m.expiryDate) : null;
    const tr = document.createElement("tr");
    tr.className = expiryDate && expiryDate < today ? "expired" : m.quantity <= 5 ? "low-stock" : "";
    tr.innerHTML = `
      <td>${m.name}</td>
      <td>${m.batch}</td>
      <td>${m.quantity}</td>
      <td>${m.unit}</td>
      <td>${m.price}</td>
      <td>${expiryDate ? formatDateISO(expiryDate) : ""}</td>
      <td>${currentUser.role === "superadmin"
        ? `<button onclick="openEditModal('${m._id}')">Edit</button>
           <button onclick="deleteMedicine('${m._id}')">Delete</button>`
        : `<span style="color:gray;">No actions</span>`}</td>`;
    tbody.appendChild(tr);
  });
}

// ================= INITIALIZE =================
window.addEventListener('DOMContentLoaded', () => {
  initModalForms();
  fetchAll();
  applyRoleAccess(currentUser.role);
});
