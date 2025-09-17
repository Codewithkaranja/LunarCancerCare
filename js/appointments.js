// ================= BASE URL =================
const BASE_URL = "https://hmis3-backend.onrender.com";
const endpoints = {
  appointments: `${BASE_URL}/api/appointments`,
  patients: `${BASE_URL}/api/patients`,
  staff: `${BASE_URL}/api/staff`,
  auth: `${BASE_URL}/api/auth`,
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

function formatDateISO(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return isNaN(d) ? "" : d.toISOString().split("T")[0];
}

function formatTimeISO(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return isNaN(d) ? "" : d.toTimeString().slice(0, 5);
}

// ================= GLOBALS =================
let appointments = [];
let patientsList = [];
let staffList = [];
let appointmentsChartInstance = null;

// ================= FETCH DATA =================
async function fetchAppointments() {
  try {
    appointments = await apiFetch(endpoints.appointments);
    applyFilters(); // render with current filters
    renderAppointmentsChart(appointments.map(a => formatDateISO(a.appointmentDate)));
  } catch (err) {
    console.error("Fetch appointments error:", err);
  }
}

async function fetchPatients() {
  try {
    patientsList = await apiFetch(endpoints.patients);
    populatePatientDropdown();
    populateFilterDropdowns();
  } catch (err) {
    console.error("Fetch patients error:", err);
  }
}

async function fetchStaff() {
  try {
    staffList = await apiFetch(endpoints.staff);
    populateStaffDropdown();
    populateFilterDropdowns();
  } catch (err) {
    console.error("Fetch staff error:", err);
  }
}

// ================= DISPLAY =================
function displayAppointments(list) {
  const tbody = document.getElementById("appointmentsTable");
  tbody.innerHTML = "";
  list.forEach((a, i) => {
    const date = formatDateISO(a.appointmentDate);
    const time = formatTimeISO(a.appointmentDate);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${a.patient?.name || "-"}</td>
      <td>${a.staff?.name || "-"}</td>
      <td>${a.reason || "-"}</td>
      <td>${date}</td>
      <td>${time}</td>
      <td>${a.notes || "-"}</td>
      <td>
        <button onclick='editAppointment("${a.id}")'>Edit</button>
        <button onclick='deleteAppointment("${a.id}")'>Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// ================= MODAL HELPERS =================
function openModal() {
  const modal = document.getElementById("appointmentModal");
  modal.classList.remove("hidden");
  document.getElementById("modalTitle").innerText = "Add Appointment";
  const form = document.getElementById("appointmentForm");
  form.dataset.editId = "";
  form.reset();
}

function closeModal() {
  document.getElementById("appointmentModal").classList.add("hidden");
}

// ================= DROPDOWNS =================
function populatePatientDropdown() {
  const select = document.getElementById("aPatient");
  select.innerHTML =
    `<option value="">-- Select Patient --</option>` +
    patientsList.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
}

function populateStaffDropdown() {
  const select = document.getElementById("aStaff");
  select.innerHTML =
    `<option value="">-- Select Staff --</option>` +
    staffList.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
}

// Filter dropdowns
const filterPatientSelect = document.getElementById("filterPatient");
const filterStaffSelect = document.getElementById("filterStaff");

function populateFilterDropdowns() {
  filterPatientSelect.innerHTML =
    `<option value="">-- All Patients --</option>` +
    patientsList.map(p => `<option value="${p._id}">${p.name}</option>`).join("");

  filterStaffSelect.innerHTML =
    `<option value="">-- All Staff --</option>` +
    staffList.map(s => `<option value="${s._id}">${s.name}</option>`).join("");
}

// ================= CRUD =================
async function submitAppointment(e) {
  e.preventDefault();
  const form = document.getElementById("appointmentForm");
  const editId = form.dataset.editId;
  const patientId = document.getElementById("aPatient").value;
  const staffId = document.getElementById("aStaff").value;
  const reason = document.getElementById("aReason").value.trim();
  const notes = document.getElementById("aNotes").value.trim();
  const date = document.getElementById("aDate").value;
  const time = document.getElementById("aTime").value;

  if (!patientId || !staffId || !date || !time) return flash("Fill all required fields");

  const payload = { patientId, staffId, appointmentDate: `${date}T${time}:00`, reason, notes };

  try {
    if (editId) {
      await apiFetch(`${endpoints.appointments}/${editId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      flash("Appointment updated");
    } else {
      await apiFetch(endpoints.appointments, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      flash("Appointment added");
    }
    closeModal();
    fetchAppointments();
  } catch (err) {
    console.error(err);
    flash("Error saving appointment");
  }
}

async function editAppointment(id) {
  const a = appointments.find(appt => appt.id === id);
  if (!a) return flash("Appointment not found");

  document.getElementById("modalTitle").innerText = "Edit Appointment";
  document.getElementById("aPatient").value = a.patient?.id || "";
  document.getElementById("aStaff").value = a.staff?.id || "";
  document.getElementById("aReason").value = a.reason || "";
  document.getElementById("aNotes").value = a.notes || "";
  const dateObj = new Date(a.appointmentDate);
  document.getElementById("aDate").value = formatDateISO(dateObj);
  document.getElementById("aTime").value = formatTimeISO(dateObj);
  document.getElementById("appointmentForm").dataset.editId = id;

  openModal();
}

async function deleteAppointment(id) {
  if (!confirm("Are you sure you want to delete this appointment?")) return;
  try {
    await apiFetch(`${endpoints.appointments}/${id}`, { method: "DELETE" });
    flash("Appointment deleted");
    fetchAppointments();
  } catch (err) {
    console.error(err);
    flash("Error deleting appointment");
  }
}

// ================= SEARCH / FILTER =================
function applyFilters() {
  const searchTerm = document.getElementById("appointmentSearch").value.toLowerCase();
  const patientId = filterPatientSelect.value;
  const staffId = filterStaffSelect.value;

  let filtered = appointments;

  if (patientId) filtered = filtered.filter(a => a.patient?._id === patientId);
  if (staffId) filtered = filtered.filter(a => a.staff?._id === staffId);

  if (searchTerm) {
    filtered = filtered.filter(a =>
      a.patient?.name.toLowerCase().includes(searchTerm) ||
      a.staff?.name.toLowerCase().includes(searchTerm) ||
      formatDateISO(a.appointmentDate).includes(searchTerm)
    );
  }

  displayAppointments(filtered);
}

// Event listeners for filters & search
filterPatientSelect.addEventListener("change", applyFilters);
filterStaffSelect.addEventListener("change", applyFilters);
document.getElementById("appointmentSearch").addEventListener("keyup", applyFilters);

// ================= CHART =================
function renderAppointmentsChart(dates) {
  if (!dates || dates.length === 0) return;
  const ctx = document.getElementById("appointmentsChart")?.getContext("2d");
  if (appointmentsChartInstance) appointmentsChartInstance.destroy();
  appointmentsChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: [
        {
          label: "Appointments",
          data: dates.map(() => 1),
          borderColor: "rgba(75,192,192,1)",
          fill: false,
        },
      ],
    },
  });
}

// ================= INIT =================
fetchPatients();
fetchStaff();
fetchAppointments();
document.getElementById("appointmentForm").addEventListener("submit", submitAppointment);
document.querySelectorAll(".modal .close").forEach(btn => btn.addEventListener("click", closeModal));
