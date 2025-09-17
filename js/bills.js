// ================== BILLING.JS ==================

// Base URL for API
const base = "http://localhost:5000/api"; // Update if your API is hosted elsewhere
const billsURL = `${base}/bills`;
const patientsURL = `${base}/patients`;

let billItems = []; // Temporary storage for items before submitting
let cachedBills = []; // Keep last fetched bills for export/print

// ================== Fetch Patients for Dropdown ==================
async function loadPatients() {
  try {
    const res = await fetch(patientsURL, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const patients = await res.json();
    const select = document.getElementById("billPatient");
    select.innerHTML = '<option value="">Select Patient</option>';
    patients.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.patientCode})`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Error loading patients:", err);
  }
}

// ================== Add Item to Bill ==================
function addBillItem() {
  const description = document.getElementById("billItemDescription").value.trim();
  const amount = parseFloat(document.getElementById("billItemAmount").value);

  if (!description || isNaN(amount)) {
    alert("Item description and valid amount are required");
    return;
  }

  const item = { description, amount };
  billItems.push(item);
  renderBillItems();
  document.getElementById("billItemDescription").value = "";
  document.getElementById("billItemAmount").value = "";
}

// ================== Render Bill Items ==================
function renderBillItems() {
  const tbody = document.getElementById("billItemsTable");
  tbody.innerHTML = "";
  billItems.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.description}</td>
      <td>${item.amount.toFixed(2)}</td>
      <td><button onclick="removeBillItem(${index})">Remove</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// ================== Remove Item ==================
function removeBillItem(index) {
  billItems.splice(index, 1);
  renderBillItems();
}

// ================== Create Bill ==================
async function createBill() {
  const patientId = document.getElementById("billPatient").value;
  if (!patientId || billItems.length === 0) {
    alert("Select a patient and add at least one item");
    return;
  }

  try {
    const res = await fetch(billsURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ patient: patientId, items: billItems }),
    });

    if (!res.ok) throw new Error("Failed to create bill");
    const newBill = await res.json();
    alert(`Bill ${newBill.billId} created successfully`);
    billItems = [];
    renderBillItems();
    document.getElementById("billPatient").value = "";
    fetchBills();
  } catch (err) {
    console.error("Error creating bill:", err);
    alert("Error creating bill. Check console.");
  }
}

// ================== Fetch and Render Bills ==================
async function fetchBills() {
  try {
    const res = await fetch(billsURL, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const bills = await res.json();
    cachedBills = bills; // Save locally for export/print
    renderBills(bills);
  } catch (err) {
    console.error("Error fetching bills:", err);
  }
}

function renderBills(bills) {
  const tbody = document.getElementById("billsTable");
  const searchText = document.getElementById("billSearch").value.toLowerCase();
  const statusFilter = document.getElementById("billStatusFilter").value;

  tbody.innerHTML = "";
  bills
    .filter((b) => {
      const matchSearch =
        b.billId.toLowerCase().includes(searchText) ||
        b.patient.name.toLowerCase().includes(searchText);
      const matchStatus = !statusFilter || b.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .forEach((b) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${b.billId}</td>
        <td>${b.patient.name}</td>
        <td>
          ${b.items.map((i) => `${i.description} (${i.amount.toFixed(2)})`).join(", ")}
        </td>
        <td>${b.totalAmount.toFixed(2)}</td>
        <td>${b.status}</td>
        <td>${b.createdBy ? b.createdBy.name : "System"}</td>
        <td>${new Date(b.createdAt).toLocaleDateString()}</td>
        <td>
          <button onclick="deleteBill('${b.id}')">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
}

// ================== Delete Bill ==================
async function deleteBill(id) {
  if (!confirm("Are you sure you want to delete this bill?")) return;

  try {
    const res = await fetch(`${billsURL}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (!res.ok) throw new Error("Failed to delete bill");
    alert("Bill deleted successfully");
    fetchBills();
  } catch (err) {
    console.error("Error deleting bill:", err);
    alert("Error deleting bill. Check console.");
  }
}

// ================== Export CSV ==================
function exportBillsCSV() {
  if (!cachedBills.length) {
    alert("No bills to export");
    return;
  }

  const rows = [
    ["Bill ID", "Patient", "Items", "Total Amount", "Status", "Created By", "Date"],
    ...cachedBills.map((b) => [
      b.billId,
      b.patient.name,
      b.items.map((i) => `${i.description} (${i.amount.toFixed(2)})`).join("; "),
      b.totalAmount.toFixed(2),
      b.status,
      b.createdBy ? b.createdBy.name : "System",
      new Date(b.createdAt).toLocaleDateString(),
    ]),
  ];

  const csvContent = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "bills.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ================== Print Bills ==================
function printBills() {
  if (!cachedBills.length) {
    alert("No bills to print");
    return;
  }

  const win = window.open("", "_blank");
  win.document.write(`
    <html>
    <head>
      <title>Billing Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #f4f4f4; }
      </style>
    </head>
    <body>
      <h2>Billing Report</h2>
      <table>
        <thead>
          <tr>
            <th>Bill ID</th>
            <th>Patient</th>
            <th>Items</th>
            <th>Total Amount</th>
            <th>Status</th>
            <th>Created By</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${cachedBills
            .map(
              (b) => `
            <tr>
              <td>${b.billId}</td>
              <td>${b.patient.name}</td>
              <td>${b.items
                .map((i) => `${i.description} (${i.amount.toFixed(2)})`)
                .join(", ")}</td>
              <td>${b.totalAmount.toFixed(2)}</td>
              <td>${b.status}</td>
              <td>${b.createdBy ? b.createdBy.name : "System"}</td>
              <td>${new Date(b.createdAt).toLocaleDateString()}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </body>
    </html>
  `);
  win.document.close();
  win.print();
}

// ================== Filters ==================
function filterBills() {
  fetchBills();
}

// ================== Init ==================
document.addEventListener("DOMContentLoaded", () => {
  loadPatients();
  fetchBills();

  // Hook export & print buttons (make sure you add them in HTML)
  document.getElementById("exportBillsBtn").addEventListener("click", exportBillsCSV);
  document.getElementById("printBillsBtn").addEventListener("click", printBills);
});
