// dashboard.js — Real-time Firestore listeners + Chart.js charts + Discharge System
import { db, getHospitalRef } from './firebase-config.js';
import { checkAlerts } from './alerts.js';
import { updatePredictionSection } from './predict.js';
import { updateInsights } from './insights.js';

// Chart instances
let chartPatients = null, chartWaitTime = null, chartDeptLoad = null;

// Dept emoji map
const DEPT_EMOJI = { Emergency: '🚨', Cardiology: '❤️', Neurology: '🧠', Orthopedics: '🦴' };

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

    // Real-time Firestore listener — scoped to current hospital
    getHospitalRef().orderBy('createdAt', 'asc').onSnapshot(snapshot => {
        const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const currentFilter = filterDept ? filterDept.value : 'All';
        render(records, currentFilter);
        updatePredictionSection(records);
        updateInsights(records);
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

    // ── Separate active vs discharged ──
    const activeRecords = filtered.filter(r => r.status !== 'discharged');
    const dischargedRecords = filtered.filter(r => r.status === 'discharged');
    const activeAll = records.filter(r => r.status !== 'discharged');
    const dischargedAll = records.filter(r => r.status === 'discharged');

    // Count discharged today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dischargedToday = dischargedAll.filter(r => {
        const dt = r.dischargedAt?.toDate ? r.dischargedAt.toDate() : (r.dischargedAt ? new Date(r.dischargedAt) : null);
        return dt && dt >= today;
    }).length;

    // ── Empty guard ──
    if (filtered.length === 0) {
        setKpi('patients-count', '0');
        setKpi('wait-time', '0 min');
        setKpi('beds-available', '100');
        setKpi('efficiency-score', '100');
        document.getElementById('scoreBar').style.width = '100%';
        document.getElementById('patients-delta').textContent = 'No data yet';
        document.getElementById('wait-delta').textContent = 'No data yet';
        renderActivePatients([]);
        return;
    }

    // ── Metrics (based on ACTIVE patients) ──
    const currentActive = activeRecords.length;
    const totalAll = filtered.length;
    const totalWait = activeRecords.reduce((s, r) => s + (r.processTime || 0), 0);
    const avgWait = currentActive > 0 ? Math.round(totalWait / currentActive) : 0;
    const bedsNeeded = activeRecords.filter(r => r.needsBed).length;
    const bedsAvail = Math.max(0, 100 - bedsNeeded);

    // ── Efficiency score (now includes discharge rate) ──
    const waitPenalty = Math.min(40, (avgWait / 90) * 40);
    const bedPenalty = Math.min(25, (bedsNeeded / 100) * 25);

    // Discharge rate bonus: reward fast turnover
    const dischargePct = totalAll > 0 ? (dischargedRecords.length / totalAll) * 100 : 0;
    const dischargeBonus = Math.min(15, (dischargePct / 100) * 15); // up to +15

    // Overstay penalty: active patients with long waits penalize
    const longStay = activeRecords.filter(r => (r.processTime || 0) > 60).length;
    const overstayPenalty = Math.min(15, (longStay / Math.max(1, currentActive)) * 15);

    const score = Math.max(0, Math.min(100, Math.round(100 - waitPenalty - bedPenalty - overstayPenalty + dischargeBonus)));

    // KPI deltas
    const half = Math.floor(activeRecords.length / 2);
    const firstHalf = activeRecords.slice(0, half);
    const prevAvgWait = firstHalf.length ? Math.round(firstHalf.reduce((s, r) => s + (r.processTime || 0), 0) / firstHalf.length) : avgWait;
    const waitDiff = avgWait - prevAvgWait;

    setKpi('patients-count', currentActive);
    setKpi('wait-time', avgWait + ' min');
    setKpi('beds-available', bedsAvail);
    setKpi('efficiency-score', score);

    document.getElementById('scoreBar').style.width = score + '%';
    document.getElementById('scoreBar').style.background =
        score > 70 ? 'linear-gradient(90deg, #10b981, #6366f1)' :
            score > 40 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' :
                '#ef4444';

    document.getElementById('patients-delta').textContent = `${currentActive} active · ${dischargedRecords.length} discharged`;
    document.getElementById('wait-delta').textContent = waitDiff === 0
        ? 'Stable vs previous' : (waitDiff > 0 ? `▲ ${waitDiff} min vs average` : `▼ ${Math.abs(waitDiff)} min vs average`);
    document.getElementById('beds-delta').textContent = `${bedsNeeded} occupied · ${bedsAvail} of 100 total`;

    // Active/discharged counters
    const activeCountEl = document.getElementById('activePatientCount');
    if (activeCountEl) activeCountEl.textContent = activeAll.length;
    const dischCountEl = document.getElementById('dischargedTodayCount');
    if (dischCountEl) dischCountEl.textContent = `${dischargedToday} discharged today`;

    // Alerts
    checkAlerts({ avgWait, beds: bedsAvail, score });

    // Render active patients table
    renderActivePatients(activeAll);

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

// ─────────────────────────────────────────────
// ACTIVE PATIENTS TABLE + DISCHARGE
// ─────────────────────────────────────────────
function renderActivePatients(activePatients) {
    const tbody = document.getElementById('activePatientBody');
    if (!tbody) return;

    if (activePatients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No active patients — all discharged! 🎉</td></tr>';
        return;
    }

    // Sort by most recent first
    const sorted = [...activePatients].sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const db_ = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return db_ - da;
    });

    tbody.innerHTML = sorted.map(r => {
        const emoji = DEPT_EMOJI[r.department] || '🏥';
        const severityClass = r.severity === 'high' ? 'risk-high' : r.severity === 'medium' ? 'risk-med' : 'risk-low';
        const severityLabel = r.severity === 'high' ? 'Critical' : r.severity === 'medium' ? 'Medium' : 'Low';
        const bedIcon = r.needsBed ? '🛏️ Yes' : '—';
        const admitted = r.arrival?.toDate
            ? r.arrival.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : r.arrival ? new Date(r.arrival).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

        return `<tr>
            <td><span>${emoji}</span> <strong>${r.department}</strong></td>
            <td><span class="risk-pill ${severityClass}">${severityLabel}</span></td>
            <td>${r.processTime || 0} min</td>
            <td>${bedIcon}</td>
            <td style="font-size:0.8rem;color:var(--text-secondary)">${admitted}</td>
            <td><button class="btn-discharge" onclick="window.__dischargePatient('${r.id}')">Discharge</button></td>
        </tr>`;
    }).join('');
}

// Global discharge function (called from inline onclick)
window.__dischargePatient = async function (docId) {
    try {
        await getHospitalRef().doc(docId).update({
            status: 'discharged',
            dischargedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Patient discharged:', docId);
    } catch (err) {
        console.error('Discharge error:', err);
        alert('Failed to discharge patient: ' + err.message);
    }
};

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
