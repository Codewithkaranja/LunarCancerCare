// ================= BASE URL =================
const BASE_URL = "http://localhost:5000";
const endpoints = {
  labTests: `${BASE_URL}/api/lab-tests`,
  patients: `${BASE_URL}/api/patients`,
};

// ================= HELPERS =================
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

// ================= GLOBALS =================
let labReports = [];
let patients = [];
let editingLabId = null;

// ================= DOM ELEMENTS =================
const labTableBody = document.getElementById("labReportsTable");
const searchInput = document.getElementById("searchLabReports");
const labModal = document.getElementById("labModal");

// ================= FETCH DATA =================
async function fetchPatients() {
  try {
    patients = await apiFetch(endpoints.patients);
    populatePatientDropdown();
  } catch (err) {
    console.error(err);
    flash("Error fetching patients");
  }
}

async function fetchLabReports() {
  try {
    labReports = await apiFetch(endpoints.labTests);
    renderLabReportsTable(labReports);
  } catch (err) {
    console.error(err);
    flash("Error fetching lab reports");
  }
}

// ================= RENDER TABLE =================
function renderLabReportsTable(data) {
  labTableBody.innerHTML = "";
  data.forEach((lab) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${lab.labTestCode}</td>
      <td>${lab.patientId?.name || "N/A"}</td>
      <td>${lab.testName}</td>
      <td>${lab.result}</td>
      <td>${lab.unit || ""}</td>
      <td>${lab.referenceRange || ""}</td>
      <td>${new Date(lab.testDate || lab.createdAt).toLocaleDateString()}</td>
      <td>
        <button onclick="openLabModal('${lab._id}', true)">Edit</button>
        <button onclick="deleteLabReport('${lab._id}')">Delete</button>
      </td>
    `;
    labTableBody.appendChild(tr);
  });
}

// ================= MODAL =================
function openLabModal(id = null, isEdit = false) {
  editingLabId = id || null;
  document.getElementById("labForm").reset();
  document.getElementById("modalLabTitle").innerText = isEdit ? "Edit Lab Report" : "Add Lab Report";

  if (id && isEdit) {
    const lab = labReports.find((l) => l._id === id);
    if (!lab) return flash("Lab report not found");
    document.getElementById("labPatient").value = lab.patientId?.id || "";
    document.getElementById("labTest").value = lab.testName;
    document.getElementById("labResult").value = lab.result;
    document.getElementById("labUnit").value = lab.unit || "";
    document.getElementById("labReference").value = lab.referenceRange || "";
  }

  labModal.classList.remove("hidden");
}

function closeLabModal() {
  labModal.classList.add("hidden");
  editingLabId = null;
}

// ================= DROPDOWN =================
function populatePatientDropdown() {
  const select = document.getElementById("labPatient");
  select.innerHTML = `<option value="">-- Select Patient --</option>`;
  patients.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = `${p.name} (${p.patientCode})`;
    select.appendChild(option);
  });
}

// ================= CRUD =================
async function saveLabReport(e) {
  e.preventDefault();
  const patientId = document.getElementById("labPatient").value.trim();
  const testName = document.getElementById("labTest").value.trim();
  const result = document.getElementById("labResult").value.trim();
  const unit = document.getElementById("labUnit").value.trim();
  const referenceRange = document.getElementById("labReference").value.trim();

  if (!patientId || !testName || !result) return flash("Patient, Test Name, and Result are required");

  const payload = { patientId, testName, result, unit, referenceRange };
  const url = editingLabId ? `${endpoints.labTests}/${editingLabId}` : endpoints.labTests;
  const method = editingLabId ? "PUT" : "POST";

  try {
    await apiFetch(url, { method, body: JSON.stringify(payload) });
    flash(editingLabId ? "Lab report updated" : "Lab report added");
    closeLabModal();
    fetchLabReports();
  } catch (err) {
    console.error(err);
    flash("Error saving lab report");
  }
}

async function deleteLabReport(id) {
  if (!confirm("Are you sure you want to delete this lab report?")) return;
  try {
    await apiFetch(`${endpoints.labTests}/${id}`, { method: "DELETE" });
    flash("Lab report deleted");
    fetchLabReports();
  } catch (err) {
    console.error(err);
    flash("Error deleting lab report");
  }
}

// ================= SEARCH / FILTER =================
searchInput.addEventListener("input", () => {
  const term = searchInput.value.toLowerCase();
  const filtered = labReports.filter(
    (l) =>
      (l.patientId?.name || "").toLowerCase().includes(term) ||
      (l.testName || "").toLowerCase().includes(term) ||
      (l.result || "").toLowerCase().includes(term)
  );
  renderLabReportsTable(filtered);
});

// ================= CLEAR FORM =================
function clearLabForm() {
  document.getElementById("labForm").reset();
}

// ================= EXPORT CSV =================
function exportLabReportsCSV() {
  let csv = "LabCode,Patient,Test,Result,Unit,Reference,Date\n";
  labReports.forEach((l) => {
    csv += `${l.labTestCode},${l.patientId?.name || ""},${l.testName},${l.result},${l.unit || ""},${l.referenceRange || ""},${new Date(l.testDate || l.createdAt).toLocaleDateString()}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "lab_reports.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ================= PRINT =================
function printLabReports() {
  const printContent = labTableBody.parentElement.outerHTML;
  const newWin = window.open("");
  newWin.document.write(`<html><head><title>Lab Reports</title></head><body>${printContent}</body></html>`);
  newWin.print();
  newWin.close();
}

function printLabReport() {
  const modalContent = labModal.querySelector(".modal-content").innerHTML;
  const newWin = window.open("");
  newWin.document.write(`<html><head><title>Lab Report</title></head><body>${modalContent}</body></html>`);
  newWin.print();
  newWin.close();
}

// ================= INIT =================
window.addEventListener("DOMContentLoaded", async () => {
  await fetchPatients();
  await fetchLabReports();
  document.getElementById("labForm").addEventListener("submit", saveLabReport);
  document.querySelectorAll(".modal .close").forEach(btn => btn.addEventListener("click", closeLabModal));
});
