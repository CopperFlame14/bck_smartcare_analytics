// insights.js — Heatmap, Anomaly Detection, and Department Comparison Table
// These three features transform SmartCare from a dashboard to an intelligent analytics platform

let anomalyChart = null;

export function updateInsights(records) {
    if (!records || records.length === 0) return;
    buildHeatmap(records);
    buildAnomalyChart(records);
    buildComparisonTable(records);
}

// ─────────────────────────────────────────────────────
// 1. STAFF UTILIZATION HEATMAP
//    Grid: Departments (rows) × Days of week (cols)
//    Color intensity = avg patient load
// ─────────────────────────────────────────────────────
function buildHeatmap(records) {
    const container = document.getElementById('heatmapGrid');
    if (!container) return;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const depts = ['Emergency', 'Cardiology', 'Neurology', 'Orthopedics'];

    // Build count matrix: dept × dayOfWeek
    const matrix = {};
    depts.forEach(d => { matrix[d] = Array(7).fill(0); });
    const dayCounts = Array(7).fill(0); // how many records per day of week

    records.forEach(r => {
        if (!r.arrival) return;
        const d = r.arrival.toDate ? r.arrival.toDate() : new Date(r.arrival);
        const dow = (d.getDay() + 6) % 7; // 0=Mon, 6=Sun
        if (matrix[r.department]) {
            matrix[r.department][dow]++;
        }
        dayCounts[dow]++;
    });

    // Find max for color scaling
    let maxVal = 1;
    depts.forEach(dept => {
        matrix[dept].forEach(v => { if (v > maxVal) maxVal = v; });
    });

    // Render heatmap header
    let html = `<div class="heatmap-wrapper">
        <div class="heatmap-table">
            <div class="heatmap-row heatmap-header">
                <div class="heatmap-label">Dept \\ Day</div>
                ${days.map(d => `<div class="heatmap-day">${d}</div>`).join('')}
            </div>`;

    depts.forEach(dept => {
        html += `<div class="heatmap-row">
            <div class="heatmap-label">${dept}</div>
            ${matrix[dept].map(val => {
            const intensity = maxVal > 0 ? val / maxVal : 0;
            const bg = getHeatColor(intensity);
            const textColor = intensity > 0.5 ? '#fff' : 'var(--text-secondary)';
            return `<div class="heatmap-cell" style="background:${bg};color:${textColor}" title="${dept} — ${days[matrix[dept].indexOf(val)]}">
                    <span class="cell-val">${val}</span>
                </div>`;
        }).join('')}
        </div>`;
    });

    html += `</div>
        <div class="heatmap-legend">
            <span style="color:var(--text-muted);font-size:0.75rem">Low</span>
            <div class="legend-bar"></div>
            <span style="color:var(--text-muted);font-size:0.75rem">High</span>
        </div>
    </div>`;

    container.innerHTML = html;
}

function getHeatColor(intensity) {
    // Deep blue → purple → pink → red
    if (intensity < 0.2) return `rgba(59,130,246,${0.1 + intensity * 0.5})`;
    if (intensity < 0.5) return `rgba(99,102,241,${0.2 + intensity * 0.6})`;
    if (intensity < 0.75) return `rgba(236,72,153,${0.3 + intensity * 0.5})`;
    return `rgba(239,68,68,${0.4 + intensity * 0.6})`;
}

// ─────────────────────────────────────────────────────
// 2. ANOMALY DETECTION ON WAIT TIME TREND
//    Uses z-score to find statistical anomalies
//    Marks them with a red point + annotation
// ─────────────────────────────────────────────────────
function buildAnomalyChart(records) {
    const ctx = document.getElementById('anomalyChart')?.getContext('2d');
    if (!ctx) return;

    const sorted = [...records].sort((a, b) => {
        const da = a.arrival?.toDate ? a.arrival.toDate() : new Date(a.arrival || 0);
        const db = b.arrival?.toDate ? b.arrival.toDate() : new Date(b.arrival || 0);
        return da - db;
    });

    const waitTimes = sorted.map(r => r.processTime || 0);
    const labels = sorted.map((_, i) => `#${i + 1}`);

    // Z-score anomaly detection (|z| > 2 = anomaly)
    const mean = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length;
    const std = Math.sqrt(waitTimes.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / waitTimes.length) || 1;
    const anomalyData = waitTimes.map(v => Math.abs((v - mean) / std) > 1.8 ? v : null);
    const anomalyCount = anomalyData.filter(v => v !== null).length;

    // Update anomaly count badge
    const badge = document.getElementById('anomalyCount');
    if (badge) badge.textContent = anomalyCount + ' anomalies detected';

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Wait Time (min)',
                data: waitTimes,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99,102,241,0.1)',
                fill: true, tension: 0.4,
                pointRadius: 3, pointHoverRadius: 6,
                pointBackgroundColor: '#6366f1'
            },
            {
                label: '⚠️ Anomaly',
                data: anomalyData,
                borderColor: 'transparent',
                backgroundColor: '#ef4444',
                pointRadius: 8,
                pointHoverRadius: 10,
                pointStyle: 'triangle',
                pointBackgroundColor: '#ef4444',
                showLine: false
            },
            {
                label: 'Avg Baseline',
                data: Array(waitTimes.length).fill(Math.round(mean)),
                borderColor: '#f59e0b',
                borderDash: [6, 4], borderWidth: 2,
                pointRadius: 0, fill: false
            }
        ]
    };

    if (anomalyChart) {
        anomalyChart.data = chartData;
        anomalyChart.update();
    } else {
        anomalyChart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: textColor, font: { family: 'Inter', size: 12 }, usePointStyle: true, padding: 16 },
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: (ctx) => {
                                if (ctx.dataset.label.includes('Anomaly') && ctx.raw !== null) {
                                    const z = Math.abs((ctx.raw - mean) / std).toFixed(1);
                                    return `Z-score: ${z} — Statistically unusual`;
                                }
                                return null;
                            }
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: textColor, font: { size: 10 }, maxTicksLimit: 20 }, grid: { color: gridColor } },
                    y: { beginAtZero: true, ticks: { color: textColor, font: { size: 11 } }, grid: { color: gridColor } }
                }
            }
        });
    }
}

// ─────────────────────────────────────────────────────
// 3. DEPARTMENT COMPARISON TABLE
//    Side-by-side: Avg wait, patients, efficiency, beds
// ─────────────────────────────────────────────────────
function buildComparisonTable(records) {
    const container = document.getElementById('comparisonTable');
    if (!container) return;

    const depts = ['Emergency', 'Cardiology', 'Neurology', 'Orthopedics'];
    const stats = {};

    depts.forEach(d => { stats[d] = { total: 0, totalWait: 0, beds: 0 }; });

    records.forEach(r => {
        if (!stats[r.department]) return;
        stats[r.department].total++;
        stats[r.department].totalWait += r.processTime || 0;
        if (r.needsBed) stats[r.department].beds++;
    });

    const allAvgWait = records.length ? records.reduce((s, r) => s + (r.processTime || 0), 0) / records.length : 1;

    const rows = depts.map(dept => {
        const s = stats[dept];
        if (s.total === 0) return `<tr><td>${dept}</td><td colspan="5" style="color:var(--text-muted);font-size:0.8rem;text-align:center">No data</td></tr>`;

        const avgWait = Math.round(s.totalWait / s.total);
        const bedPct = Math.round((s.beds / s.total) * 100);
        const waitPenalty = Math.min(40, (avgWait / 90) * 40);
        const bedPenalty = Math.min(30, (s.beds / 100) * 30);
        const eff = Math.max(0, Math.round(100 - waitPenalty - bedPenalty));

        const effColor = eff > 70 ? 'var(--emerald)' : eff > 40 ? 'var(--amber)' : 'var(--red)';
        const waitColor = avgWait > 60 ? 'var(--red)' : avgWait > 30 ? 'var(--amber)' : 'var(--emerald)';
        const vsAvg = avgWait - Math.round(allAvgWait);
        const vsStr = vsAvg === 0 ? '—' : vsAvg > 0 ? `<span style="color:var(--red)">▲${vsAvg}m</span>` : `<span style="color:var(--emerald)">▼${Math.abs(vsAvg)}m</span>`;

        return `<tr>
            <td><strong>${dept}</strong></td>
            <td>${s.total}</td>
            <td style="color:${waitColor};font-weight:600">${avgWait} min</td>
            <td>${vsStr}</td>
            <td>${bedPct}%</td>
            <td style="color:${effColor};font-weight:700">${eff}%</td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <table class="risk-table comparison-table">
            <thead>
                <tr>
                    <th>Department</th>
                    <th>Patients</th>
                    <th>Avg Wait</th>
                    <th>vs Hospital</th>
                    <th>Bed Usage</th>
                    <th>Efficiency</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
}
