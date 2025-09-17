// ================== BASE ==================
const BASE_URL = "https://hmis3-backend.onrender.com";
const endpoints = {
  patients: `${BASE_URL}/api/patients`
};

// ================== STATE ==================
export let patients = [];
let currentPatientId = null;
let currentEditPatientId = null;

// ================== HELPERS ==================
export function formatDateISO(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return isNaN(d) ? "" : d.toISOString().split("T")[0];
}

export function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function flash(msg, ttl = 2000) {
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

export function authHeaders() {
  const token = localStorage.getItem("authToken");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

export async function apiFetch(url, options = {}) {
  options.headers = { ...authHeaders(), ...(options.headers || {}) };
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      alert("Session expired. Please log in again.");
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      window.location.href = "login.html";
    }
    throw new Error(data.error || "API Error");
  }

  return data;
}

// ================== FETCH PATIENTS ==================
export async function fetchPatients() {
  try {
    patients = await apiFetch(endpoints.patients);
    displayPatients(patients);

    const totalEl = document.getElementById("totalPatients");
    if (totalEl) totalEl.innerText = patients.length;
  } catch (err) {
    console.error(err);
    flash("Error fetching patients");
  }
}

// ================== DISPLAY PATIENTS ==================
export function displayPatients(list) {
  const tbody = document.getElementById("patientsTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  list.forEach((p, i) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.patientCode || `#${i + 1}`}</td>
      <td>${escapeHtml(p.name)}</td>
      <td>${p.age ?? "-"}</td>
      <td>${escapeHtml(p.ailment || "-")}</td>
      <td>${new Date(p.admissionDate || p.createdAt).toLocaleDateString()}</td>
      <td>${escapeHtml(p.phone || "-")}</td>
      <td>
        <button class="btn small view-btn">View</button>
        <button class="btn small edit-btn">Edit</button>
        <button class="btn small danger delete-btn">Delete</button>
      </td>
    `;

    tr.querySelector(".view-btn")?.addEventListener("click", () => viewPatient(p._id));
    tr.querySelector(".edit-btn")?.addEventListener("click", () => editPatientForm(p._id));
    tr.querySelector(".delete-btn")?.addEventListener("click", () => deletePatient(p._id));

    tbody.appendChild(tr);
  });
}

// ================== ADD PATIENT ==================
export async function addPatient() {
  const patient = {
    name: document.getElementById("pName")?.value.trim(),
    age: parseInt(document.getElementById("pAge")?.value),
    gender: document.getElementById("pGender")?.value,
    email: document.getElementById("pEmail")?.value.trim(),
    phone: document.getElementById("pPhone")?.value.trim(),
    nationalId: document.getElementById("pNationalId")?.value.trim(),
    ailment: document.getElementById("pAilment")?.value.trim(),
    admissionDate: new Date(),
  };

  if (!patient.name || !patient.age || !patient.gender || !patient.ailment) {
    return flash("Name, age, gender, and ailment are required");
  }

  try {
    await apiFetch(endpoints.patients, {
      method: "POST",
      body: JSON.stringify(patient),
    });
    flash("Patient added successfully");
    fetchPatients();

    // Clear form
    ["pName","pAge","pGender","pEmail","pPhone","pNationalId","pAilment"].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.value = "";
    });
  } catch (err) {
    console.error(err);
    flash("Error adding patient");
  }
}

// ================== VIEW PATIENT ==================
export function viewPatient(id) {
  const patient = patients.find(p => p._id === id);
  if (!patient) return flash("Patient not found");

  currentPatientId = id;

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = text;
  };

  setText("modalName", patient.name);
  setText("modalAge", patient.age);
  setText("modalGender", patient.gender);
  setText("modalEmail", patient.email || "-");
  setText("modalPhone", patient.phone || "-");
  setText("modalNationalId", patient.nationalId || "-");
  setText("modalAilment", patient.ailment);
  setText("modalDateAdmitted", new Date(patient.admissionDate).toLocaleDateString());

  setText(
    "modalPrevAppointments",
    patient.appointments?.length
      ? patient.appointments.map(a => `<div>${formatDateISO(a.date)} - ${a.status}</div>`).join("")
      : "<i>No appointments</i>"
  );

  setText(
    "modalBills",
    patient.bills?.length
      ? patient.bills.map(b => `<div>${b.amount || "-"} - ${b.status || "-"}</div>`).join("")
      : "<i>No bills</i>"
  );

  setText(
    "modalPrescriptions",
    patient.prescriptions?.length
      ? patient.prescriptions.map(p => `<div>${p.medicine || "-"} - ${p.dosage || "-"}</div>`).join("")
      : "<i>No prescriptions</i>"
  );

  document.getElementById("patientModal")?.classList.remove("hidden");
}

export function closePatientModal() {
  document.getElementById("patientModal")?.classList.add("hidden");
}

// ================== EDIT PATIENT ==================
export function editPatientForm(id) {
  const patient = patients.find(p => p._id === id);
  if (!patient) return flash("Patient not found");

  currentEditPatientId = id;

  document.getElementById("editName").value = patient.name || "";
  document.getElementById("editAge").value = patient.age || "";
  document.getElementById("editGender").value = patient.gender || "";
  document.getElementById("editAilment").value = patient.ailment || "";

  document.getElementById("editPatientModal")?.classList.remove("hidden");
}

export function closeEditPatientModal() {
  document.getElementById("editPatientModal")?.classList.add("hidden");
}

export async function saveEditPatient() {
  if (!currentEditPatientId) return flash("No patient selected");

  const updatedFields = {
    name: document.getElementById("editName")?.value.trim(),
    age: parseInt(document.getElementById("editAge")?.value),
    gender: document.getElementById("editGender")?.value,
    ailment: document.getElementById("editAilment")?.value.trim(),
  };

  if (!updatedFields.name || !updatedFields.age || !updatedFields.gender || !updatedFields.ailment) {
    return flash("All fields are required");
  }

  try {
    await updatePatient(currentEditPatientId, updatedFields);
    closeEditPatientModal();
  } catch (err) {
    console.error(err);
    flash("Error updating patient");
  }
}

export async function updatePatient(id, updatedFields) {
  try {
    await apiFetch(`${endpoints.patients}/${id}`, {
      method: "PUT",
      body: JSON.stringify(updatedFields),
    });
    flash("Patient updated");
    fetchPatients();
  } catch (err) {
    console.error(err);
    flash("Error updating patient");
  }
}

export async function deletePatient(id) {
  if (!confirm("Are you sure you want to delete this patient?")) return;
  try {
    await apiFetch(`${endpoints.patients}/${id}`, { method: "DELETE" });
    flash("Patient deleted");
    fetchPatients();
  } catch (err) {
    console.error(err);
    flash("Error deleting patient");
  }
}

// ================== SEARCH / FILTER ==================
export function filterPatients() {
  const term = document.getElementById("searchPatient")?.value.toLowerCase() || "";
  const filtered = patients.filter(
    p => 
      p.name.toLowerCase().includes(term) ||
      (p.phone || "").toLowerCase().includes(term) ||
      (p.ailment || "").toLowerCase().includes(term)
  );
  displayPatients(filtered);
}

// ================== SCHEDULE APPOINTMENT ==================
export function openScheduleApptModal() {
  if (!currentPatientId) return flash("No patient selected");
  const modal = document.getElementById("scheduleApptModal");
  if(modal) modal.classList.remove("hidden");

  document.getElementById("apptDate").value = "";
  document.getElementById("apptReason").value = "";
}

export async function submitAppointment() {
  if (!currentPatientId) return flash("No patient selected");

  const date = document.getElementById("apptDate")?.value;
  const reason = document.getElementById("apptReason")?.value.trim();
  if (!date || !reason) return flash("Date and reason required");

  try {
    await apiFetch(`${endpoints.patients}/${currentPatientId}/appointments`, {
      method: "POST",
      body: JSON.stringify({ date, reason }),
    });
    flash("Appointment scheduled successfully");
    document.getElementById("scheduleApptModal")?.classList.add("hidden");
    fetchPatients();
  } catch (err) {
    console.error(err);
    flash("Error scheduling appointment");
  }
}

// ================== PRINT & EXPORT ==================
function exportToCSV(filename, rows) {
  if (!rows || !rows.length) return flash("No data to export");
  const csvContent =
    "data:text/csv;charset=utf-8," +
    [Object.keys(rows[0]).join(","), ...rows.map(r => Object.values(r).join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printPatientHistory() {
  if (!currentPatientId) return flash("No patient selected");
  const patient = patients.find(p => p._id === currentPatientId);
  if (!patient) return flash("Patient not found");

  let printContent = `
    <h2>${patient.name} - History</h2>
    <p><strong>Age:</strong> ${patient.age}</p>
    <p><strong>Gender:</strong> ${patient.gender}</p>
    <p><strong>Ailment:</strong> ${patient.ailment}</p>
    <hr>
    <h3>Appointments</h3>
    ${patient.appointments?.length ? patient.appointments.map(a => `<div>${formatDateISO(a.date)} - ${a.status}</div>`).join("") : "<i>No appointments</i>"}
    <h3>Bills</h3>
    ${patient.bills?.length ? patient.bills.map(b => `<div>${b.amount || "-"} - ${b.status || "-"}</div>`).join("") : "<i>No bills</i>"}
    <h3>Prescriptions</h3>
    ${patient.prescriptions?.length ? patient.prescriptions.map(p => `<div>${p.medicine || "-"} - ${p.dosage || "-"}</div>`).join("") : "<i>No prescriptions</i>"}
  `;
  const w = window.open("", "_blank");
  w.document.write(printContent);
  w.document.close();
  w.print();
}

export function exportPatientBills() {
  if (!currentPatientId) return flash("No patient selected");
  const patient = patients.find(p => p._id === currentPatientId);
  if (!patient || !patient.bills?.length) return flash("No bills to export");

  const rows = patient.bills.map(b => ({
    Amount: b.amount || "-",
    Status: b.status || "-",
    Date: formatDateISO(b.date)
  }));
  exportToCSV(`${patient.name}_bills.csv`, rows);
}

// ================== INITIALIZE ==================
export function initPatientsPage() {
  fetchPatients();

  document.getElementById("addPatientBtn")?.addEventListener("click", addPatient);
  document.getElementById("saveEditBtn")?.addEventListener("click", saveEditPatient);

  document.querySelector(".schedule-appt")?.addEventListener("click", openScheduleApptModal);
  document.querySelector(".print-history")?.addEventListener("click", printPatientHistory);
  document.querySelector(".export-bills")?.addEventListener("click", exportPatientBills);

  document.getElementById("searchPatient")?.addEventListener("input", filterPatients);
}
