// charts.js

let ageChartInstance = null;
let appointmentsChartInstance = null;

/**
 * Render Age Distribution Bar Chart
 * @param {number[]} ages - array of patient ages
 */
export function renderAgeChart(ages) {
  if (!ages || ages.length === 0) return;

  const ctx = document.getElementById("ageChart")?.getContext("2d");
  if (!ctx) return;

  if (ageChartInstance) ageChartInstance.destroy();

  ageChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ages.map((_, i) => `Patient ${i + 1}`),
      datasets: [{
        label: "Age",
        data: ages,
        backgroundColor: ages.map(a => `rgba(${Math.min(255, a*5)}, 99, 132, 0.6)`),
        borderColor: ages.map(a => `rgba(${Math.min(255, a*5)}, 99, 132, 1)`),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: { mode: 'index', intersect: false },
        legend: { display: true }
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Age' } },
        x: { title: { display: true, text: 'Patients' } }
      }
    }
  });
}

/**
 * Render Appointments Trend Line Chart
 * @param {string[]} dates - array of appointment dates (ISO strings)
 */
export function renderAppointmentsChart(dates) {
  if (!dates || dates.length === 0) return;

  const ctx = document.getElementById("appointmentsChart")?.getContext("2d");
  if (!ctx) return;

  if (appointmentsChartInstance) appointmentsChartInstance.destroy();

  // Count appointments per date
  const counts = {};
  dates.forEach(d => counts[d] = (counts[d] || 0) + 1);
  const labels = Object.keys(counts);
  const dataPoints = Object.values(counts);

  appointmentsChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Appointments",
        data: dataPoints,
        borderColor: "rgba(54, 162, 235, 1)",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        tension: 0.3,
        fill: true,
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: { mode: 'index', intersect: false },
        legend: { display: true }
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Number of Appointments' } },
        x: { title: { display: true, text: 'Date' } }
      }
    }
  });
}
