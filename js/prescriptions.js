// ================= BASE URL =================
const BASE_URL = "http://localhost:5000";
const endpoints = {
  prescriptions: `${BASE_URL}/api/prescriptions`,
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
let prescriptions = [];
let patients = [];
let editingPrescriptionId = null;

// ================= FETCH DATA =================
async function fetchPatients() {
  try {
    patients = await apiFetch(endpoints.patients);
    populatePatientDropdown();
  } catch (err) {
    console.error("Fetch patients error:", err);
    flash("Error fetching patients");
  }
}

async function fetchPrescriptions() {
  try {
    prescriptions = await apiFetch(endpoints.prescriptions);
    renderPrescriptionsTable(prescriptions);
  } catch (err) {
    console.error("Fetch prescriptions error:", err);
    flash("Error fetching prescriptions");
  }
}

// ================= RENDER TABLE =================
function renderPrescriptionsTable(data) {
  const table = document.getElementById("prescriptionsTable");
  table.innerHTML = "";
  data.forEach((p) => {
    const tr = document.createElement("tr");
    const medicineList = p.items.map(i => `${i.name} (${i.dosage}, ${i.duration})`).join("<br>");
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.prescriptionCode}</td>
      <td>${p.patient.name}</td>
      <td>${medicineList}</td>
      <td>${p.prescribedBy.name} (${p.prescribedBy.role})</td>
      <td>${p.status}</td>
      <td>${new Date(p.issuedDate).toLocaleDateString()}</td>
      <td>${p.dispensedDate ? new Date(p.dispensedDate).toLocaleDateString() : "-"}</td>
      <td>
        ${p.status === "Pending" ? `<button onclick="dispensePrescription('${p.id}')">Dispense</button>` : ""}
        ${p.status === "Pending" ? `<button onclick="cancelPrescription('${p.id}')">Cancel</button>` : ""}
        <button onclick="editPrescription('${p.id}')">Edit</button>
        <button onclick="deletePrescription('${p.id}')">Delete</button>
      </td>`;
    table.appendChild(tr);
  });
}

// ================= MODAL =================
function openPrescriptionModal() {
  editingPrescriptionId = null;
  document.getElementById("prescriptionModalTitle").textContent = "Add Prescription";
  document.getElementById("prescriptionForm").reset();
  resetPrescriptionItems();
  document.getElementById("prescriptionModal").classList.remove("hidden");
}

function closePrescriptionModal() {
  document.getElementById("prescriptionModal").classList.add("hidden");
}

// ================= PRESCRIPTION ITEMS =================
function addPrescriptionItem() {
  const container = document.getElementById("prescriptionItemsContainer");
  const div = document.createElement("div");
  div.className = "prescription-item";
  div.innerHTML = `
    <input type="text" class="pMedicine" placeholder="Medicine Name" required />
    <input type="text" class="pDosage" placeholder="Dosage" required />
    <input type="text" class="pDuration" placeholder="Duration" required />
    <button type="button" onclick="removePrescriptionItem(this)">Remove</button>
  `;
  container.appendChild(div);
}

function removePrescriptionItem(btn) {
  btn.parentElement.remove();
}

function resetPrescriptionItems() {
  const container = document.getElementById("prescriptionItemsContainer");
  container.innerHTML = `<h4>Prescription Items</h4>`;
  addPrescriptionItem();
}

// ================= DROPDOWN =================
function populatePatientDropdown() {
  const select = document.getElementById("pPatient");
  select.innerHTML = '<option value="">-- Select Patient --</option>';
  patients.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = `${p.name} (${p.patientCode})`;
    select.appendChild(option);
  });
}

// ================= CRUD =================
async function submitPrescription(e) {
  e.preventDefault();
  const patientId = document.getElementById("pPatient").value;
  const notes = document.getElementById("pNotes").value;
  const items = Array.from(document.querySelectorAll(".prescription-item")).map(div => ({
    name: div.querySelector(".pMedicine").value,
    dosage: div.querySelector(".pDosage").value,
    duration: div.querySelector(".pDuration").value,
  }));

  if (!patientId || items.length === 0) return flash("Select a patient and add at least one medicine");

  const payload = { patientId, items, notes };
  const url = editingPrescriptionId ? `${endpoints.prescriptions}/${editingPrescriptionId}` : endpoints.prescriptions;
  const method = editingPrescriptionId ? "PUT" : "POST";

  try {
    await apiFetch(url, { method, body: JSON.stringify(payload) });
    flash(editingPrescriptionId ? "Prescription updated" : "Prescription added");
    fetchPrescriptions();
    closePrescriptionModal();
  } catch (err) {
    console.error(err);
    flash("Error saving prescription");
  }
}

function editPrescription(id) {
  const p = prescriptions.find(pr => pr.id === id);
  if (!p) return flash("Prescription not found");
  editingPrescriptionId = id;
  document.getElementById("prescriptionModalTitle").textContent = "Edit Prescription";
  document.getElementById("pPatient").value = p.patient.id;
  document.getElementById("pNotes").value = p.notes || "";
  const container = document.getElementById("prescriptionItemsContainer");
  container.innerHTML = `<h4>Prescription Items</h4>`;
  p.items.forEach(item => {
    const div = document.createElement("div");
    div.className = "prescription-item";
    div.innerHTML = `
      <input type="text" class="pMedicine" value="${item.name}" required />
      <input type="text" class="pDosage" value="${item.dosage}" required />
      <input type="text" class="pDuration" value="${item.duration}" required />
      <button type="button" onclick="removePrescriptionItem(this)">Remove</button>
    `;
    container.appendChild(div);
  });
  document.getElementById("prescriptionModal").classList.remove("hidden");
}

async function deletePrescription(id) {
  if (!confirm("Are you sure you want to delete this prescription?")) return;
  try {
    await apiFetch(`${endpoints.prescriptions}/${id}`, { method: "DELETE" });
    flash("Prescription deleted");
    fetchPrescriptions();
  } catch (err) {
    console.error(err);
    flash("Error deleting prescription");
  }
}

async function dispensePrescription(id) {
  if (!confirm("Mark this prescription as dispensed?")) return;
  try {
    await apiFetch(`${endpoints.prescriptions}/${id}/dispense`, { method: "PUT" });
    flash("Prescription dispensed");
    fetchPrescriptions();
  } catch (err) {
    console.error(err);
    flash("Error dispensing prescription");
  }
}

async function cancelPrescription(id) {
  if (!confirm("Cancel this prescription?")) return;
  try {
    await apiFetch(`${endpoints.prescriptions}/${id}/cancel`, { method: "PUT" });
    flash("Prescription cancelled");
    fetchPrescriptions();
  } catch (err) {
    console.error(err);
    flash("Error cancelling prescription");
  }
}

// ================= SEARCH =================
document.getElementById("prescriptionSearch").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = prescriptions.filter(p =>
    p.patient.name.toLowerCase().includes(q) ||
    p.items.some(i => i.name.toLowerCase().includes(q)) ||
    p.prescribedBy.name.toLowerCase().includes(q)
  );
  renderPrescriptionsTable(filtered);
});

// ================= INIT =================
window.addEventListener("DOMContentLoaded", async () => {
  await fetchPatients();
  await fetchPrescriptions();
  document.getElementById("prescriptionForm").addEventListener("submit", submitPrescription);
});
