// script.js for HMIS Dashboard

// Global variables
let currentUser = null;
let patients = JSON.parse(localStorage.getItem('patients')) || [];
let appointments = JSON.parse(localStorage.getItem('appointments')) || [];
let staff = JSON.parse(localStorage.getItem('staff')) || [];
let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
let currentPatientId = null;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
    }

    // Login form submission
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        login();
    });

    // Appointment form submission
    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveAppointment();
        });
    }

    // Initialize charts and data
    initDashboard();
    renderPatientsTable();
    renderAppointmentsTable();
    renderStaffTable();
    renderInventoryTable();
});

// Login function
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Simple validation - in a real app, this would be a server request
    if (username && password) {
        currentUser = {
            username: username,
            name: username.charAt(0).toUpperCase() + username.slice(1)
        };
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showDashboard();
    } else {
        alert('Please enter username and password');
    }
}

// Logout function
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    document.getElementById('dashboardContainer').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
}

// Show dashboard after login
function showDashboard() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('dashboardContainer').classList.remove('hidden');
    document.getElementById('adminName').textContent = currentUser.name;
    
    // Show dashboard section by default
    showSection('dashboard');
}

// Show/hide sections
function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('[id$="Section"]');
    sections.forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show the selected section
    document.getElementById(sectionName + 'Section').classList.remove('hidden');
    
    // Update active nav link
    const navLinks = document.querySelectorAll('.sidebar nav a');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick').includes(sectionName)) {
            link.classList.add('active');
        }
    });
    
    // Refresh data if needed
    if (sectionName === 'dashboard') {
        updateDashboardStats();
    } else if (sectionName === 'patients') {
        renderPatientsTable();
    } else if (sectionName === 'appointments') {
        renderAppointmentsTable();
        populatePatientDropdown();
        populateStaffDropdown();
    } else if (sectionName === 'staff') {
        renderStaffTable();
    } else if (sectionName === 'inventory') {
        renderInventoryTable();
    }
}

// Initialize dashboard with sample data
function initDashboard() {
    // Add sample data if none exists
    if (patients.length === 0) {
        patients = [
            { id: 1, name: 'John Doe', age: 45, gender: 'Male', email: 'john@example.com', phone: '123-456-7890', nationalId: '12345678', ailment: 'Hypertension', dateAdmitted: '2023-05-15' },
            { id: 2, name: 'Jane Smith', age: 32, gender: 'Female', email: 'jane@example.com', phone: '098-765-4321', nationalId: '87654321', ailment: 'Diabetes', dateAdmitted: '2023-06-20' }
        ];
        localStorage.setItem('patients', JSON.stringify(patients));
    }
    
    if (appointments.length === 0) {
        appointments = [
            { id: 1, patientId: 1, patientName: 'John Doe', staffId: 1, staffName: 'Dr. Smith', reason: 'Routine Checkup', date: '2023-10-15', time: '10:00', notes: 'Bring previous reports' },
            { id: 2, patientId: 2, patientName: 'Jane Smith', staffId: 2, staffName: 'Nurse Johnson', reason: 'Blood Test', date: '2023-10-16', time: '11:30', notes: 'Fasting required' }
        ];
        localStorage.setItem('appointments', JSON.stringify(appointments));
    }
    
    if (staff.length === 0) {
        staff = [
            { id: 1, name: 'Dr. Smith', role: 'Doctor', department: 'Cardiology', email: 'dr.smith@hospital.com', phone: '555-1234', qualifications: 'MD, Cardiology', hiredDate: '2020-01-15', shift: 'On Duty', username: 'drsmith', password: 'password123' },
            { id: 2, name: 'Nurse Johnson', role: 'Nurse', department: 'General', email: 'nurse.j@hospital.com', phone: '555-5678', qualifications: 'RN, BSN', hiredDate: '2021-03-20', shift: 'On Duty', username: 'nursej', password: 'password123' }
        ];
        localStorage.setItem('staff', JSON.stringify(staff));
    }
    
    if (inventory.length === 0) {
        inventory = [
            { id: 1, name: 'Paracetamol', batch: 'BATCH001', quantity: 100, unit: 'tablets', price: 0.5, expiryDate: '2024-12-01' },
            { id: 2, name: 'Amoxicillin', batch: 'BATCH002', quantity: 50, unit: 'capsules', price: 1.2, expiryDate: '2024-10-15' }
        ];
        localStorage.setItem('inventory', JSON.stringify(inventory));
    }
    
    // Initialize charts
    initCharts();
}

// Update dashboard statistics
function updateDashboardStats() {
    document.getElementById('totalPatients').textContent = patients.length;
    document.getElementById('appointmentsToday').textContent = appointments.filter(apt => apt.date === new Date().toISOString().split('T')[0]).length;
    document.getElementById('staffCount').textContent = staff.length;
    document.getElementById('reportsCount').textContent = 5; // Placeholder
    
    document.getElementById('totalPatientsCount').textContent = patients.length;
}

// Initialize charts
function initCharts() {
    // Age distribution chart
    const ageRanges = {
        '0-18': patients.filter(p => p.age <= 18).length,
        '19-35': patients.filter(p => p.age > 18 && p.age <= 35).length,
        '36-50': patients.filter(p => p.age > 35 && p.age <= 50).length,
        '51-65': patients.filter(p => p.age > 50 && p.age <= 65).length,
        '65+': patients.filter(p => p.age > 65).length
    };
    
    const ageCtx = document.getElementById('ageChart').getContext('2d');
    new Chart(ageCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(ageRanges),
            datasets: [{
                data: Object.values(ageRanges),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    });
    
    // Appointments trend chart (last 7 days)
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();
    
    const appointmentsByDay = last7Days.map(date => {
        return appointments.filter(apt => apt.date === date).length;
    });
    
    const appointmentsCtx = document.getElementById('appointmentsChart').getContext('2d');
    new Chart(appointmentsCtx, {
        type: 'line',
        data: {
            labels: last7Days.map(date => date.split('-')[2] + '/' + date.split('-')[1]),
            datasets: [{
                label: 'Appointments',
                data: appointmentsByDay,
                borderColor: '#36A2EB',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Patient functions
function addPatient() {
    const name = document.getElementById('pName').value;
    const age = document.getElementById('pAge').value;
    const gender = document.getElementById('pGender').value;
    const email = document.getElementById('pEmail').value;
    const phone = document.getElementById('pPhone').value;
    const nationalId = document.getElementById('pNationalId').value;
    const ailment = document.getElementById('pAilment').value;
    
    if (!name || !age || !gender || !email || !phone || !nationalId || !ailment) {
        alert('Please fill all fields');
        return;
    }
    
    const newPatient = {
        id: patients.length > 0 ? Math.max(...patients.map(p => p.id)) + 1 : 1,
        name,
        age: parseInt(age),
        gender,
        email,
        phone,
        nationalId,
        ailment,
        dateAdmitted: new Date().toISOString().split('T')[0]
    };
    
    patients.push(newPatient);
    localStorage.setItem('patients', JSON.stringify(patients));
    
    // Clear form
    document.getElementById('pName').value = '';
    document.getElementById('pAge').value = '';
    document.getElementById('pGender').value = '';
    document.getElementById('pEmail').value = '';
    document.getElementById('pPhone').value = '';
    document.getElementById('pNationalId').value = '';
    document.getElementById('pAilment').value = '';
    
    renderPatientsTable();
    updateDashboardStats();
    alert('Patient added successfully!');
}

function renderPatientsTable() {
    const tableBody = document.getElementById('patientsTable');
    tableBody.innerHTML = '';
    
    patients.forEach(patient => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${patient.id}</td>
            <td>${patient.name}</td>
            <td>${patient.age}</td>
            <td>${patient.ailment}</td>
            <td>${patient.dateAdmitted}</td>
            <td>
                <button class="btn small" onclick="viewPatient(${patient.id})">View</button>
                <button class="btn small" onclick="editPatient(${patient.id})">Edit</button>
                <button class="btn small" onclick="deletePatient(${patient.id})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function filterPatients() {
    const searchTerm = document.getElementById('searchPatient').value.toLowerCase();
    const tableBody = document.getElementById('patientsTable');
    tableBody.innerHTML = '';
    
    const filteredPatients = patients.filter(patient => 
        patient.name.toLowerCase().includes(searchTerm) ||
        patient.phone.includes(searchTerm) ||
        patient.ailment.toLowerCase().includes(searchTerm)
    );
    
    filteredPatients.forEach(patient => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${patient.id}</td>
            <td>${patient.name}</td>
            <td>${patient.age}</td>
            <td>${patient.ailment}</td>
            <td>${patient.dateAdmitted}</td>
            <td>
                <button class="btn small" onclick="viewPatient(${patient.id})">View</button>
                <button class="btn small" onclick="editPatient(${patient.id})">Edit</button>
                <button class="btn small" onclick="deletePatient(${patient.id})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function viewPatient(id) {
    const patient = patients.find(p => p.id === id);
    if (!patient) return;
    
    document.getElementById('modalName').textContent = patient.name;
    document.getElementById('modalAge').textContent = patient.age;
    document.getElementById('modalGender').textContent = patient.gender;
    document.getElementById('modalEmail').textContent = patient.email;
    document.getElementById('modalPhone').textContent = patient.phone;
    document.getElementById('modalNationalId').textContent = patient.nationalId;
    document.getElementById('modalAilment').textContent = patient.ailment;
    document.getElementById('modalDateAdmitted').textContent = patient.dateAdmitted;
    
    // Show patient's appointments
    const patientAppointments = appointments.filter(apt => apt.patientId === id);
    const appointmentsList = document.getElementById('modalPrevAppointments');
    appointmentsList.innerHTML = patientAppointments.length > 0 
        ? patientAppointments.map(apt => `<div>${apt.date} - ${apt.reason}</div>`).join('')
        : 'No appointments found';
    
    // For demo purposes, add some placeholder data
    document.getElementById('modalBills').innerHTML = '<div>Bill 001: $150 - Paid</div><div>Bill 002: $200 - Unpaid</div>';
    document.getElementById('modalPrescriptions').innerHTML = '<div>Paracetamol - 2 tablets daily</div><div>Amoxicillin - 1 capsule twice daily</div>';
    
    currentPatientId = id;
    document.getElementById('patientModal').classList.remove('hidden');
}

function closePatientModal() {
    document.getElementById('patientModal').classList.add('hidden');
    currentPatientId = null;
}

function editPatient(id) {
    const patient = patients.find(p => p.id === id);
    if (!patient) return;
    
    // In a real application, you would populate a form with the patient data
    // and show an edit modal. For simplicity, we'll just use prompts.
    const newName = prompt('Enter new name:', patient.name);
    if (newName === null) return;
    
    const newAge = prompt('Enter new age:', patient.age);
    if (newAge === null) return;
    
    const newAilment = prompt('Enter new ailment:', patient.ailment);
    if (newAilment === null) return;
    
    patient.name = newName;
    patient.age = parseInt(newAge);
    patient.ailment = newAilment;
    
    localStorage.setItem('patients', JSON.stringify(patients));
    renderPatientsTable();
    alert('Patient updated successfully!');
}

function deletePatient(id) {
    if (!confirm('Are you sure you want to delete this patient?')) return;
    
    patients = patients.filter(p => p.id !== id);
    localStorage.setItem('patients', JSON.stringify(patients));
    renderPatientsTable();
    updateDashboardStats();
    alert('Patient deleted successfully!');
}

// Appointment functions
function renderAppointmentsTable() {
    const tableBody = document.getElementById('appointmentsTable');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    appointments.forEach(appointment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${appointment.id}</td>
            <td>${appointment.patientName}</td>
            <td>${appointment.staffName}</td>
            <td>${appointment.reason}</td>
            <td>${appointment.date}</td>
            <td>${appointment.time}</td>
            <td>${appointment.notes}</td>
            <td>
                <button class="btn small" onclick="editAppointment(${appointment.id})">Edit</button>
                <button class="btn small" onclick="deleteAppointment(${appointment.id})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function populatePatientDropdown() {
    const patientDropdown = document.getElementById('aPatient');
    if (!patientDropdown) return;
    
    patientDropdown.innerHTML = '<option value="">-- Select Patient --</option>';
    patients.forEach(patient => {
        const option = document.createElement('option');
        option.value = patient.id;
        option.textContent = patient.name;
        patientDropdown.appendChild(option);
    });
}

function populateStaffDropdown() {
    const staffDropdown = document.getElementById('aStaff');
    if (!staffDropdown) return;
    
    staffDropdown.innerHTML = '<option value="">-- Select Staff --</option>';
    staff.forEach(staffMember => {
        const option = document.createElement('option');
        option.value = staffMember.id;
        option.textContent = staffMember.name;
        staffDropdown.appendChild(option);
    });
}

function openModal() {
    document.getElementById('appointmentModal').classList.remove('hidden');
    document.getElementById('modalTitle').textContent = 'Add Appointment';
    
    // Clear form
    document.getElementById('aPatient').value = '';
    document.getElementById('aStaff').value = '';
    document.getElementById('aReason').value = '';
    document.getElementById('aNotes').value = '';
    document.getElementById('aDate').value = '';
    document.getElementById('aTime').value = '';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function saveAppointment() {
    const patientId = document.getElementById('aPatient').value;
    const staffId = document.getElementById('aStaff').value;
    const reason = document.getElementById('aReason').value;
    const notes = document.getElementById('aNotes').value;
    const date = document.getElementById('aDate').value;
    const time = document.getElementById('aTime').value;
    
    if (!patientId || !staffId || !reason || !date || !time) {
        alert('Please fill all required fields');
        return;
    }
    
    const patient = patients.find(p => p.id === parseInt(patientId));
    const staffMember = staff.find(s => s.id === parseInt(staffId));
    
    if (!patient || !staffMember) {
        alert('Invalid patient or staff selection');
        return;
    }
    
    const newAppointment = {
        id: appointments.length > 0 ? Math.max(...appointments.map(a => a.id)) + 1 : 1,
        patientId: parseInt(patientId),
        patientName: patient.name,
        staffId: parseInt(staffId),
        staffName: staffMember.name,
        reason,
        notes,
        date,
        time
    };
    
    appointments.push(newAppointment);
    localStorage.setItem('appointments', JSON.stringify(appointments));
    
    closeModal('appointmentModal');
    renderAppointmentsTable();
    updateDashboardStats();
    alert('Appointment saved successfully!');
}

function editAppointment(id) {
    const appointment = appointments.find(a => a.id === id);
    if (!appointment) return;
    
    // In a real application, you would populate the form with the appointment data
    // For simplicity, we'll use prompts
    const newReason = prompt('Enter new reason:', appointment.reason);
    if (newReason === null) return;
    
    const newDate = prompt('Enter new date (YYYY-MM-DD):', appointment.date);
    if (newDate === null) return;
    
    const newTime = prompt('Enter new time (HH:MM):', appointment.time);
    if (newTime === null) return;
    
    appointment.reason = newReason;
    appointment.date = newDate;
    appointment.time = newTime;
    
    localStorage.setItem('appointments', JSON.stringify(appointments));
    renderAppointmentsTable();
    alert('Appointment updated successfully!');
}

function deleteAppointment(id) {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    
    appointments = appointments.filter(a => a.id !== id);
    localStorage.setItem('appointments', JSON.stringify(appointments));
    renderAppointmentsTable();
    updateDashboardStats();
    alert('Appointment deleted successfully!');
}

// Staff functions
function addStaff() {
    const name = document.getElementById('sName').value;
    const role = document.getElementById('sRole').value;
    const department = document.getElementById('sDepartment').value;
    const email = document.getElementById('sEmail').value;
    const phone = document.getElementById('sPhone').value;
    const qualifications = document.getElementById('sQualifications').value;
    const hiredDate = document.getElementById('sHiredDate').value;
    const shift = document.getElementById('sShift').value;
    const username = document.getElementById('sUsername').value;
    const password = document.getElementById('sPassword').value;
    
    if (!name || !role || !department || !email || !phone || !qualifications || !hiredDate || !shift || !username || !password) {
        alert('Please fill all fields');
        return;
    }
    
    const newStaff = {
        id: staff.length > 0 ? Math.max(...staff.map(s => s.id)) + 1 : 1,
        name,
        role,
        department,
        email,
        phone,
        qualifications,
        hiredDate,
        shift,
        username,
        password
    };
    
    staff.push(newStaff);
    localStorage.setItem('staff', JSON.stringify(staff));
    
    // Clear form
    document.getElementById('sName').value = '';
    document.getElementById('sRole').value = '';
    document.getElementById('sDepartment').value = '';
    document.getElementById('sEmail').value = '';
    document.getElementById('sPhone').value = '';
    document.getElementById('sQualifications').value = '';
    document.getElementById('sHiredDate').value = '';
    document.getElementById('sShift').value = 'On Duty';
    document.getElementById('sUsername').value = '';
    document.getElementById('sPassword').value = '';
    
    renderStaffTable();
    updateDashboardStats();
    alert('Staff added successfully!');
}

function renderStaffTable() {
    const tableBody = document.getElementById('staffTable');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    staff.forEach(staffMember => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${staffMember.id}</td>
            <td>${staffMember.name}</td>
            <td>${staffMember.role}</td>
            <td>${staffMember.department}</td>
            <td>${staffMember.email}</td>
            <td>${staffMember.phone}</td>
            <td>${staffMember.qualifications}</td>
            <td>${staffMember.hiredDate}</td>
            <td>${staffMember.shift}</td>
            <td>${staffMember.username}</td>
            <td>
                <button class="btn small" onclick="viewStaff(${staffMember.id})">View</button>
                <button class="btn small" onclick="editStaff(${staffMember.id})">Edit</button>
                <button class="btn small" onclick="deleteStaff(${staffMember.id})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function filterStaff() {
    const searchTerm = document.getElementById('searchStaff').value.toLowerCase();
    const tableBody = document.getElementById('staffTable');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    const filteredStaff = staff.filter(staffMember => 
        staffMember.name.toLowerCase().includes(searchTerm) ||
        staffMember.role.toLowerCase().includes(searchTerm) ||
        staffMember.department.toLowerCase().includes(searchTerm)
    );
    
    filteredStaff.forEach(staffMember => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${staffMember.id}</td>
            <td>${staffMember.name}</td>
            <td>${staffMember.role}</td>
            <td>${staffMember.department}</td>
            <td>${staffMember.email}</td>
            <td>${staffMember.phone}</td>
            <td>${staffMember.qualifications}</td>
            <td>${staffMember.hiredDate}</td>
            <td>${staffMember.shift}</td>
            <td>${staffMember.username}</td>
            <td>
                <button class="btn small" onclick="viewStaff(${staffMember.id})">View</button>
                <button class="btn small" onclick="editStaff(${staffMember.id})">Edit</button>
                <button class="btn small" onclick="deleteStaff(${staffMember.id})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function viewStaff(id) {
    const staffMember = staff.find(s => s.id === id);
    if (!staffMember) return;
    
    document.getElementById('modalStaffName').textContent = staffMember.name;
    document.getElementById('modalStaffRole').textContent = staffMember.role;
    document.getElementById('modalStaffDepartment').textContent = staffMember.department;
    document.getElementById('modalStaffEmail').textContent = staffMember.email;
    document.getElementById('modalStaffPhone').textContent = staffMember.phone;
    document.getElementById('modalStaffQualifications').textContent = staffMember.qualifications;
    document.getElementById('modalStaffHiredDate').textContent = staffMember.hiredDate;
    document.getElementById('modalStaffShift').textContent = staffMember.shift;
    
    // Calculate workload statistics
    const patientCount = appointments.filter(apt => apt.staffId === id).length;
    const appointmentCount = appointments.filter(apt => apt.staffId === id).length;
    
    document.getElementById('modalStaffPatients').textContent = patientCount;
    document.getElementById('modalStaffAppointments').textContent = appointmentCount;
    
    document.getElementById('staffModal').classList.remove('hidden');
}

function editStaff(id) {
    const staffMember = staff.find(s => s.id === id);
    if (!staffMember) return;
    
    // In a real application, you would populate a form with the staff data
    // For simplicity, we'll use prompts
    const newName = prompt('Enter new name:', staffMember.name);
    if (newName === null) return;
    
    const newRole = prompt('Enter new role:', staffMember.role);
    if (newRole === null) return;
    
    const newDepartment = prompt('Enter new department:', staffMember.department);
    if (newDepartment === null) return;
    
    staffMember.name = newName;
    staffMember.role = newRole;
    staffMember.department = newDepartment;
    
    localStorage.setItem('staff', JSON.stringify(staff));
    renderStaffTable();
    alert('Staff updated successfully!');
}

function deleteStaff(id) {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    
    staff = staff.filter(s => s.id !== id);
    localStorage.setItem('staff', JSON.stringify(staff));
    renderStaffTable();
    updateDashboardStats();
    alert('Staff deleted successfully!');
}

function assignStaff() {
    alert('Staff assignment functionality would be implemented here');
}

function printStaffProfile() {
    alert('Staff profile printing functionality would be implemented here');
}

function exportStaffCSV() {
    alert('Staff CSV export functionality would be implemented here');
}

function printStaffList() {
    alert('Staff list printing functionality would be implemented here');
}

// Inventory functions
function addOrUpdateMedicine() {
    const name = document.getElementById('medName').value;
    const batch = document.getElementById('medBatch').value;
    const quantity = document.getElementById('medQuantity').value;
    const unit = document.getElementById('medUnit').value;
    const price = document.getElementById('medPrice').value;
    const expiryDate = document.getElementById('medExpiry').value;
    
    if (!name || !batch || !quantity || !unit || !price || !expiryDate) {
        alert('Please fill all fields');
        return;
    }
    
    // Check if medicine with same batch already exists
    const existingIndex = inventory.findIndex(item => item.batch === batch);
    
    if (existingIndex !== -1) {
        // Update existing medicine
        inventory[existingIndex].name = name;
        inventory[existingIndex].quantity = parseInt(quantity);
        inventory[existingIndex].unit = unit;
        inventory[existingIndex].price = parseFloat(price);
        inventory[existingIndex].expiryDate = expiryDate;
    } else {
        // Add new medicine
        const newMedicine = {
            id: inventory.length > 0 ? Math.max(...inventory.map(i => i.id)) + 1 : 1,
            name,
            batch,
            quantity: parseInt(quantity),
            unit,
            price: parseFloat(price),
            expiryDate
        };
        
        inventory.push(newMedicine);
    }
    
    localStorage.setItem('inventory', JSON.stringify(inventory));
    
    // Clear form
    document.getElementById('medName').value = '';
    document.getElementById('medBatch').value = '';
    document.getElementById('medQuantity').value = '';
    document.getElementById('medUnit').value = '';
    document.getElementById('medPrice').value = '';
    document.getElementById('medExpiry').value = '';
    
    renderInventoryTable();
    alert('Medicine inventory updated successfully!');
}

function renderInventoryTable() {
    const tableBody = document.getElementById('inventoryTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    inventory.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.batch}</td>
            <td>${item.quantity}</td>
            <td>${item.unit}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>${item.expiryDate}</td>
            <td>
                <button class="btn small" onclick="editMedicine(${item.id})">Edit</button>
                <button class="btn small" onclick="deleteMedicine(${item.id})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function sortInventory(criteria) {
    switch(criteria) {
        case 'name':
            inventory.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'quantity':
            inventory.sort((a, b) => a.quantity - b.quantity);
            break;
        case 'expiryDate':
            inventory.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
            break;
    }
    
    localStorage.setItem('inventory', JSON.stringify(inventory));
    renderInventoryTable();
}

function editMedicine(id) {
    const medicine = inventory.find(i => i.id === id);
    if (!medicine) return;
    
    // Populate form with medicine data
    document.getElementById('medName').value = medicine.name;
    document.getElementById('medBatch').value = medicine.batch;
    document.getElementById('medQuantity').value = medicine.quantity;
    document.getElementById('medUnit').value = medicine.unit;
    document.getElementById('medPrice').value = medicine.price;
    document.getElementById('medExpiry').value = medicine.expiryDate;
    
    // Scroll to form
    document.getElementById('medName').focus();
}

function deleteMedicine(id) {
    if (!confirm('Are you sure you want to delete this medicine?')) return;
    
    inventory = inventory.filter(i => i.id !== id);
    localStorage.setItem('inventory', JSON.stringify(inventory));
    renderInventoryTable();
    alert('Medicine deleted successfully!');
}

// Other functions
function administerMedicine() {
    alert('Medicine administration functionality would be implemented here');
}

function submitAppointment() {
    alert('Appointment scheduling functionality would be implemented here');
}