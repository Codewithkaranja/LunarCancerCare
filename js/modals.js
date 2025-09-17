// modals.js
import { apiFetch, flash, escapeHtml } from './helpers.js';
import { endpoints } from './main.js';

export function openModal(modalId) {
  document.getElementById(modalId)?.classList.remove("hidden");
}

export function closeModal(modalId) {
  document.getElementById(modalId)?.classList.add("hidden");
}

export function initModalForms() {
  document.querySelectorAll(".modal .close").forEach(btn =>
    btn.addEventListener("click", () => btn.closest(".modal").classList.add("hidden"))
  );

  document.getElementById("scheduleAppointmentForm")?.addEventListener("submit", scheduleAppointment);
  document.getElementById("assignMedicineForm")?.addEventListener("submit", assignMedicine);
}

export function openScheduleAppointmentModal(patientId) {
  document.getElementById("appointmentPatientId").value = patientId;
  openModal("scheduleAppointmentModal");
}

export async function scheduleAppointment(e) {
  e.preventDefault();
  const patientId = document.getElementById("appointmentPatientId").value;
  const date = document.getElementById("appointmentDate").value;
  const time = document.getElementById("appointmentTime").value;

  if (!date || !time) return flash("Select date and time");

  try {
    await apiFetch(endpoints.appointments, {
      method: "POST",
      body: JSON.stringify({ patient: patientId, date: `${date}T${time}:00` })
    });
    flash("Appointment scheduled");
    closeModal("scheduleAppointmentModal");
  } catch(err) {
    console.error(err);
    flash("Error scheduling appointment");
  }
}

export function openAssignMedicineModal(patientId) {
  document.getElementById("assignMedicinePatientId").value = patientId;
  populateMedicineDropdown();
  openModal("assignMedicineModal");
}

export function populateMedicineDropdown(medicines = []) {
  const select = document.getElementById("assignMedicineSelect");
  if (!select) return;
  select.innerHTML = medicines.map(m => `<option value="${m._id}">${escapeHtml(m.name)} (${m.quantity} ${m.unit})</option>`).join("");
}

export async function assignMedicine(e) {
  e.preventDefault();
  const patientId = document.getElementById("assignMedicinePatientId").value;
  const medicineId = document.getElementById("assignMedicineSelect").value;
  const quantity = parseInt(document.getElementById("assignMedicineQty").value);

  if (!medicineId || !quantity || quantity <=0) return flash("Select medicine and quantity");

  try {
    await apiFetch(`${endpoints.medicines}/assign`, {
      method: "POST",
      body: JSON.stringify({ patientId, medicineId, quantity })
    });
    flash("Medicine assigned to patient");
    closeModal("assignMedicineModal");
  } catch(err) {
    console.error(err);
    flash("Error assigning medicine");
  }
}
