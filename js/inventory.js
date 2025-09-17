// ================== BASE URL ==================
const BASE_URL = "https://hmis3-backend.onrender.com";
const endpoints = {
  medicines: `${BASE_URL}/api/medicines`,
};

// ================== DOM ELEMENTS ==================
const medName = document.getElementById("medName");
const medBatch = document.getElementById("medBatch");
const medQuantity = document.getElementById("medQuantity");
const medUnit = document.getElementById("medUnit");
const medPrice = document.getElementById("medPrice");
const medExpiry = document.getElementById("medExpiry");
const inventoryTableBody = document.getElementById("inventoryTableBody");
const inventorySearch = document.getElementById("inventorySearch");

// ================== STATE ==================
let medicines = [];
let editMedicineId = null;
let stockChart;

// ================== HELPERS ==================
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

// ================== FETCH MEDICINES ==================
async function fetchMedicines() {
  try {
    medicines = await apiFetch(endpoints.medicines);
    renderMedicines(medicines);
    renderStockChart(medicines);
  } catch (err) {
    console.error(err);
    flash("Error fetching medicines");
  }
}

// ================== RENDER TABLE ==================
function renderMedicines(list) {
  if (!inventoryTableBody) return;
  inventoryTableBody.innerHTML = "";
  list.forEach((m, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${m.name}</td>
      <td>${m.batch || ""}</td>
      <td>${m.quantity}</td>
      <td>${m.unit}</td>
      <td>${m.price}</td>
      <td>${m.expiryDate ? new Date(m.expiryDate).toLocaleDateString() : ""}</td>
      <td>
        <button onclick="editMedicine('${m._id}')">Edit</button>
        <button onclick="deleteMedicine('${m._id}')">Delete</button>
      </td>
    `;
    inventoryTableBody.appendChild(row);
  });
}

// ================== ADD / UPDATE MEDICINE ==================
async function addOrUpdateMedicine() {
  const payload = {
    name: medName?.value.trim() || "",
    batch: medBatch?.value.trim() || "",
    quantity: Number(medQuantity?.value) || 0,
    unit: medUnit?.value.trim() || "",
    price: Number(medPrice?.value) || 0,
    expiryDate: medExpiry?.value || null,
  };

  if (!payload.name || isNaN(payload.quantity) || isNaN(payload.price)) {
    return flash("Name, quantity, and price are required");
  }

  try {
    let res;
    if (editMedicineId) {
      res = await fetch(`${endpoints.medicines}/${editMedicineId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      editMedicineId = null;
    } else {
      res = await fetch(endpoints.medicines, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
    }

    const data = await res.json();
    if (res.ok) {
      flash("Medicine saved successfully");
      clearForm();
      fetchMedicines();
    } else {
      flash(data.error || "Error saving medicine");
    }
  } catch (err) {
    console.error(err);
    flash("Error saving medicine");
  }
}

// ================== EDIT MEDICINE ==================
function editMedicine(id) {
  const med = medicines.find((m) => m._id === id);
  if (!med) return flash("Medicine not found");

  medName.value = med.name;
  medBatch.value = med.batch || "";
  medQuantity.value = med.quantity;
  medUnit.value = med.unit;
  medPrice.value = med.price;
  medExpiry.value = med.expiryDate ? new Date(med.expiryDate).toISOString().split("T")[0] : "";
  editMedicineId = id;
}

// ================== DELETE MEDICINE ==================
async function deleteMedicine(id) {
  if (!confirm("Are you sure you want to delete this medicine?")) return;
  try {
    const res = await fetch(`${endpoints.medicines}/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    flash(res.ok ? "Medicine deleted" : data.error || "Error deleting medicine");
    fetchMedicines();
  } catch (err) {
    console.error(err);
    flash("Error deleting medicine");
  }
}

// ================== CLEAR FORM ==================
function clearForm() {
  [medName, medBatch, medQuantity, medUnit, medPrice, medExpiry].forEach(el => {
    if (el) el.value = "";
  });
  editMedicineId = null;
}

// ================== SEARCH / FILTER ==================
inventorySearch?.addEventListener("input", () => {
  const term = inventorySearch.value.toLowerCase();
  const filtered = medicines.filter(
    (m) =>
      m.name.toLowerCase().includes(term) ||
      (m.batch && m.batch.toLowerCase().includes(term)) ||
      (m.unit && m.unit.toLowerCase().includes(term))
  );
  renderMedicines(filtered);
});

// ================== SORTING ==================
function sortInventory(field) {
  const sorted = [...medicines].sort((a, b) => {
    if (field === "expiryDate") return new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0);
    if (field === "quantity") return a.quantity - b.quantity;
    return a.name.localeCompare(b.name);
  });
  renderMedicines(sorted);
}

// ================== STOCK CHART ==================
function renderStockChart(list) {
  const ctx = document.getElementById("stockChart")?.getContext("2d");
  if (!ctx) return;

  const labels = list.map((m) => m.name);
  const data = list.map((m) => m.quantity);

  if (stockChart) stockChart.destroy();

  stockChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Stock Quantity",
        data,
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

// ================== EXPORT CSV ==================
function exportInventoryCSV() {
  if (!medicines.length) return flash("No data to export");

  const headers = ["Name", "Batch", "Quantity", "Unit", "Price", "Expiry"];
  const rows = medicines.map(m => [
    m.name, m.batch||"", m.quantity, m.unit, m.price,
    m.expiryDate ? new Date(m.expiryDate).toLocaleDateString() : ""
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
  const link = document.createElement("a");
  link.href = encodeURI(csvContent);
  link.download = `inventory_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ================== PRINT ==================
function printInventory() {
  const section = document.getElementById("inventorySection");
  if (!section) return flash("Nothing to print");

  const win = window.open("", "", "width=900,height=700");
  win.document.write("<html><head><title>Inventory</title></head><body>");
  win.document.write(section.innerHTML);
  win.document.write("</body></html>");
  win.document.close();
  win.print();
}

// ================== INITIALIZE ==================
fetchMedicines();
