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

    if (filteredRecords.length === 0) {
        document.getElementById('patients-count').textContent = 0;
        document.getElementById('wait-time').textContent = '0 min';
        document.getElementById('beds-available').textContent = 100;
        document.getElementById('efficiency-score').textContent = 100;
        return;
    }

    // Process Metrics
    const totalPatients = filteredRecords.length;
    const totalWait = filteredRecords.reduce((sum, r) => sum + (r.processTime || 0), 0);
    const avgWait = totalWait / totalPatients;

    const bedsNeeded = filteredRecords.filter(r => r.needsBed).length;
    const maxBeds = 100; // Mock total capacity
    const bedsAvail = Math.max(0, maxBeds - bedsNeeded);

    // Calculate Efficiency Score (100 is best)
    // formula: weighting factors for wait time and resource utilization
    const waitWeight = Math.min(40, (avgWait / 60) * 40); // Max 40 pt deduction for wait
    const bedUtil = (bedsNeeded / maxBeds) * 100;
    const bedWeight = Math.min(30, (bedUtil / 100) * 30); // Max 30 pt deduction for crowding

    // Staff Utilization (Mock logic: based on patient load vs capacity)
    const staffCapacity = 50;
    const staffUtil = Math.min(100, (totalPatients / staffCapacity) * 100);
    const staffWeight = Math.min(30, (staffUtil / 100) * 30);

    let score = 100 - waitWeight - bedWeight - (staffUtil > 90 ? 10 : 0);
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Update DOM Cards
    document.getElementById('patients-count').textContent = totalPatients;
    document.getElementById('wait-time').textContent = Math.round(avgWait) + ' min';
    document.getElementById('beds-available').textContent = bedsAvail;
    document.getElementById('efficiency-score').textContent = score;

    // Check Alerts based on metrics
    checkAlerts({ avgWait: Math.round(avgWait), beds: bedsAvail, score });

    // Process Chart Data
    const deptData = {};
    filteredRecords.forEach(r => {
        if (!deptData[r.department]) deptData[r.department] = { count: 0, totalWait: 0 };
        deptData[r.department].count++;
        deptData[r.department].totalWait += r.processTime || 0;
    });

    updateCharts(deptData, filteredRecords);
}

function updateCharts(deptData, records) {
    const ctxPatients = document.getElementById('patientsChart').getContext('2d');
    const ctxWait = document.getElementById('waitTimeChart').getContext('2d');
    const ctxLoad = document.getElementById('deptLoadChart').getContext('2d');

    const labels = Object.keys(deptData);
    const counts = labels.map(l => deptData[l].count);
    const avgWaits = labels.map(l => Math.round(deptData[l].totalWait / deptData[l].count));

    // Premium Color Palette
    const colors = {
        primary: '#3b82f6',
        secondary: '#ef4444',
        accent: '#f59e0b',
        success: '#10b981',
        purple: '#8b5cf6',
        pink: '#ec4899'
    };
    const bgColors = [colors.primary, colors.purple, colors.pink, colors.accent, colors.success];

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
        },
        onClick: (evt, elements) => {
            if (elements.length > 0) {
                const index = elements[0].index;
                const label = labels[index];
                console.log(`Drill-down for ${label} requested.`);
            }
        }
    };

    // 1. Bar Chart: Patients by Department
    if (patientsChart) {
        patientsChart.data.labels = labels;
        patientsChart.data.datasets[0].data = counts;
        patientsChart.update();
    } else {
        patientsChart = new Chart(ctxPatients, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Patients',
                    data: counts,
                    backgroundColor: bgColors.map(c => c + 'cc'),
                    borderRadius: 8
                }]
            },
            options: { ...chartOptions, scales: { y: { beginAtZero: true } } }
        });
    }

    // 2. Line Chart: Avg Wait Time Trend
    const recentRecords = records.slice(-15);
    const waitData = recentRecords.map(r => r.processTime);
    const waitLabels = recentRecords.map((r, i) => `Case ${i + 1}`);

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
                    label: 'Processing Time (min)',
                    data: waitData,
                    borderColor: colors.primary,
                    backgroundColor: colors.primary + '22',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: chartOptions
        });
    }

    // 3. Pie Chart: Workload (Dept Load)
    if (deptLoadChart) {
        deptLoadChart.data.labels = labels;
        deptLoadChart.data.datasets[0].data = counts;
        deptLoadChart.update();
    } else {
        deptLoadChart = new Chart(ctxLoad, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: counts,
                    backgroundColor: bgColors,
                    hoverOffset: 15,
                    borderWidth: 0
                }]
            },
            options: { ...chartOptions, cutout: '70%' }
        });
    }
}
