// dashboard.js
import { db } from './firebase-config.js';
import { checkAlerts } from './alerts.js';
import { updatePredictionChart } from './predict.js';

let patientsChart, waitTimeChart, deptLoadChart;

export function initDashboard() {
    const filterDept = document.getElementById('filterDept');
    let currentFilter = 'All';

    filterDept.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        fetchDataAndRender(currentFilter);
    });

    // Real-time listener
    db.collection('hospitalData').orderBy('createdAt', 'asc').onSnapshot(snapshot => {
        const dataRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Save globally if needed, or pass directly
        renderDashboard(dataRecords, currentFilter);
        updatePredictionChart(dataRecords);
    }, error => {
        console.error("Dashboard listener error: ", error);
    });
}

function renderDashboard(records, filterDept) {
    // Apply filter
    const filteredRecords = filterDept === 'All'
        ? records
        : records.filter(r => r.department === filterDept);

    if (filteredRecords.length === 0) return;

    // Process Metrics
    const totalPatients = filteredRecords.length;
    const totalWait = filteredRecords.reduce((sum, r) => sum + (r.processTime || 0), 0);
    const avgWait = totalWait / totalPatients;

    const bedsNeeded = filteredRecords.filter(r => r.needsBed).length;
    const maxBeds = 100; // Mock total capacity
    const bedsAvail = Math.max(0, maxBeds - bedsNeeded);

    // Calculate Efficiency Score (100 is best)
    // formula: 100 - (avgWait/2) - (bedUtilizationModifier)
    const bedUtil = (bedsNeeded / maxBeds) * 100;
    let score = 100 - (avgWait * 0.5) - (bedUtil * 0.2);
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Update DOM Cards
    document.getElementById('patients-count').textContent = totalPatients;
    document.getElementById('wait-time').textContent = Math.round(avgWait) + ' min';
    document.getElementById('beds-available').textContent = bedsAvail;
    document.getElementById('efficiency-score').textContent = score;

    // Check Alerts based on metrics
    checkAlerts({ avgWait: Math.round(avgWait), beds: bedsAvail, score });

    // Process Chart Data
    const deptCounts = {};
    filteredRecords.forEach(r => {
        deptCounts[r.department] = (deptCounts[r.department] || 0) + 1;
    });

    updateCharts(deptCounts, filteredRecords);
}

function updateCharts(deptCounts, records) {
    // Extract context
    const ctxPatients = document.getElementById('patientsChart').getContext('2d');
    const ctxWait = document.getElementById('waitTimeChart').getContext('2d');
    const ctxLoad = document.getElementById('deptLoadChart').getContext('2d');

    // Colors
    const bgColors = ['rgba(54, 162, 235, 0.6)', 'rgba(255, 99, 132, 0.6)', 'rgba(255, 206, 86, 0.6)', 'rgba(75, 192, 192, 0.6)'];
    const borderColors = ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0'];

    // 1. Bar Chart: Patients by Department
    if (patientsChart) {
        patientsChart.data.labels = Object.keys(deptCounts);
        patientsChart.data.datasets[0].data = Object.values(deptCounts);
        patientsChart.update();
    } else {
        patientsChart = new Chart(ctxPatients, {
            type: 'bar',
            data: {
                labels: Object.keys(deptCounts),
                datasets: [{
                    label: 'Total Patients',
                    data: Object.values(deptCounts),
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Patients by Department' } } }
        });
    }

    // 2. Line Chart: Avg Wait Time Trend (simulate by processing time vs record index)
    // To keep it simple, we plot process time of the last N records
    const recentRecords = records.slice(-10);
    const waitData = recentRecords.map(r => r.processTime);
    const waitLabels = recentRecords.map((r, i) => `Pt ${i + 1}`);

    if (waitTimeChart) {
        waitTimeChart.data.labels = waitLabels;
        waitTimeChart.data.datasets[0].data = waitData;
        waitTimeChart.update();
    } else {
        waitTimeChart = new Chart(ctxWait, {
            type: 'line',
            data: {
                labels: waitLabels,
                datasets: [{
                    label: 'Recent Processing Times (min)',
                    data: waitData,
                    fill: false,
                    borderColor: '#FF6384',
                    tension: 0.1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Wait Time Trend' } } }
        });
    }

    // 3. Pie Chart: Workload (Dept Load)
    if (deptLoadChart) {
        deptLoadChart.data.labels = Object.keys(deptCounts);
        deptLoadChart.data.datasets[0].data = Object.values(deptCounts);
        deptLoadChart.update();
    } else {
        deptLoadChart = new Chart(ctxLoad, {
            type: 'pie',
            data: {
                labels: Object.keys(deptCounts),
                datasets: [{
                    data: Object.values(deptCounts),
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Department Workload' } } }
        });
    }
}
