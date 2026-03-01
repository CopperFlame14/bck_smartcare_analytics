// dashboard.js — Real-time Firestore listeners + Chart.js charts
import { db } from './firebase-config.js';
import { checkAlerts } from './alerts.js';
import { updatePredictionSection } from './predict.js';

// Chart instances
let chartPatients = null, chartWaitTime = null, chartDeptLoad = null;

// Theme-aware chart colors
function getChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    return {
        text: isDark ? '#94a3b8' : '#475569',
        grid: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        bg: isDark ? '#16161f' : '#ffffff',
        palette: ['#6366f1', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'],
    };
}

const CHART_DEFAULTS = () => {
    const c = getChartColors();
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: c.text, font: { family: 'Inter', size: 12 }, usePointStyle: true, padding: 16 },
                position: 'bottom'
            }
        },
        scales: {
            x: {
                ticks: { color: c.text, font: { family: 'Inter', size: 11 } },
                grid: { color: c.grid }
            },
            y: {
                beginAtZero: true,
                ticks: { color: c.text, font: { family: 'Inter', size: 11 } },
                grid: { color: c.grid }
            }
        }
    };
};

export function initDashboard() {
    const filterDept = document.getElementById('filterDept');

    // Real-time Firestore listener
    db.collection('hospitalData').orderBy('createdAt', 'asc').onSnapshot(snapshot => {
        const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const currentFilter = filterDept ? filterDept.value : 'All';
        render(records, currentFilter);
        updatePredictionSection(records);
    }, err => console.error('Dashboard listener error:', err));

    // Filter change
    if (filterDept) {
        filterDept.addEventListener('change', () => {
            // The onSnapshot above handles updates, but we trigger another fetch
            // Actually we store records globally so re-render from cache
        });
    }
}

let _allRecords = [];

function render(records, filterDept) {
    _allRecords = records;

    const filtered = filterDept === 'All' ? records : records.filter(r => r.department === filterDept);

    // Update filter listener to use cached records
    const sel = document.getElementById('filterDept');
    if (sel) {
        sel.onchange = () => render(_allRecords, sel.value);
    }

    // ── Empty guard ──
    if (filtered.length === 0) {
        setKpi('patients-count', '0');
        setKpi('wait-time', '0 min');
        setKpi('beds-available', '100');
        setKpi('efficiency-score', '100');
        document.getElementById('scoreBar').style.width = '100%';
        document.getElementById('patients-delta').textContent = 'No data yet';
        document.getElementById('wait-delta').textContent = 'No data yet';
        return;
    }

    // ── Metrics ──
    const total = filtered.length;
    const totalWait = filtered.reduce((s, r) => s + (r.processTime || 0), 0);
    const avgWait = Math.round(totalWait / total);
    const bedsNeeded = filtered.filter(r => r.needsBed).length;
    const bedsAvail = Math.max(0, 100 - bedsNeeded);

    // Efficiency score (0–100)
    const waitPenalty = Math.min(40, (avgWait / 90) * 40);
    const bedPenalty = Math.min(30, (bedsNeeded / 100) * 30);
    const staffRatio = total / 50;
    const staffPenalty = staffRatio > 0.9 ? Math.min(20, (staffRatio - 0.9) * 100) : 0;
    const score = Math.max(0, Math.round(100 - waitPenalty - bedPenalty - staffPenalty));

    // KPI deltas (compare to avg of first half vs second half)
    const half = Math.floor(total / 2);
    const firstHalf = filtered.slice(0, half);
    const secondHalf = filtered.slice(half);
    const prevAvgWait = firstHalf.length ? Math.round(firstHalf.reduce((s, r) => s + (r.processTime || 0), 0) / firstHalf.length) : avgWait;
    const waitDiff = avgWait - prevAvgWait;

    setKpi('patients-count', total);
    setKpi('wait-time', avgWait + ' min');
    setKpi('beds-available', bedsAvail);
    setKpi('efficiency-score', score);

    document.getElementById('scoreBar').style.width = score + '%';
    document.getElementById('scoreBar').style.background =
        score > 70 ? 'linear-gradient(90deg, #10b981, #6366f1)' :
            score > 40 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' :
                '#ef4444';

    document.getElementById('patients-delta').textContent = `${total} records loaded`;
    document.getElementById('wait-delta').textContent = waitDiff === 0
        ? 'Stable vs previous' : (waitDiff > 0 ? `▲ ${waitDiff} min vs average` : `▼ ${Math.abs(waitDiff)} min vs average`);
    document.getElementById('beds-delta').textContent = `${bedsNeeded} occupied · ${bedsAvail} of 100 total`;

    // Alerts
    checkAlerts({ avgWait, beds: bedsAvail, score });

    // ── Chart Data ──
    const deptData = {};
    filtered.forEach(r => {
        if (!deptData[r.department]) deptData[r.department] = { count: 0, totalWait: 0 };
        deptData[r.department].count++;
        deptData[r.department].totalWait += r.processTime || 0;
    });
    const labels = Object.keys(deptData);
    const counts = labels.map(l => deptData[l].count);

    updateCharts(labels, counts, filtered);
}

function setKpi(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function updateCharts(labels, counts, records) {
    const c = getChartColors();

    // 1. Bar chart – Patient Volume
    const ctxP = document.getElementById('patientsChart')?.getContext('2d');
    if (ctxP) {
        if (chartPatients) {
            chartPatients.data.labels = labels;
            chartPatients.data.datasets[0].data = counts;
            chartPatients.update();
        } else {
            chartPatients = new Chart(ctxP, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Patients',
                        data: counts,
                        backgroundColor: c.palette.map(p => p + 'cc'),
                        borderRadius: 8,
                        borderSkipped: false
                    }]
                },
                options: {
                    ...CHART_DEFAULTS(),
                    onClick: (evt, els) => {
                        if (els.length > 0) {
                            const dept = labels[els[0].index];
                            document.getElementById('filterDept').value = dept;
                            render(_allRecords, dept);
                        }
                    }
                }
            });
        }
    }

    // 2. Doughnut chart – Dept Load
    const ctxD = document.getElementById('deptLoadChart')?.getContext('2d');
    if (ctxD) {
        if (chartDeptLoad) {
            chartDeptLoad.data.labels = labels;
            chartDeptLoad.data.datasets[0].data = counts;
            chartDeptLoad.update();
        } else {
            chartDeptLoad = new Chart(ctxD, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data: counts,
                        backgroundColor: c.palette,
                        hoverOffset: 12,
                        borderWidth: 0
                    }]
                },
                options: {
                    ...CHART_DEFAULTS(),
                    cutout: '72%',
                    scales: {} // override – doughnut doesn't need scales
                }
            });
        }
    }

    // 3. Line chart – Wait Time Trend
    const recent = records.slice(-15);
    const waitData = recent.map(r => r.processTime || 0);
    const waitLabels = recent.map((_, i) => `#${i + 1}`);

    const ctxW = document.getElementById('waitTimeChart')?.getContext('2d');
    if (ctxW) {
        if (chartWaitTime) {
            chartWaitTime.data.labels = waitLabels;
            chartWaitTime.data.datasets[0].data = waitData;
            chartWaitTime.update();
        } else {
            chartWaitTime = new Chart(ctxW, {
                type: 'line',
                data: {
                    labels: waitLabels,
                    datasets: [{
                        label: 'Processing Time (min)',
                        data: waitData,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99,102,241,0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#6366f1'
                    }]
                },
                options: CHART_DEFAULTS()
            });
        }
    }
}
