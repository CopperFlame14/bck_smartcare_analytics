// predict.js — AI Predictive Analytics (trend + forecast)
let predChart = null;

export function updatePredictionSection(records) {
    if (!records || records.length === 0) return;

    // Aggregate patient counts by date  
    const dailyCounts = {};
    const deptDailyCounts = {};

    records.forEach(r => {
        if (!r.arrival) return;
        const d = r.arrival.toDate ? r.arrival.toDate() : new Date(r.arrival);
        const dateStr = d.toISOString().split('T')[0];
        dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;

        if (!deptDailyCounts[r.department]) deptDailyCounts[r.department] = {};
        deptDailyCounts[r.department][dateStr] = (deptDailyCounts[r.department][dateStr] || 0) + 1;
    });

    const sortedDates = Object.keys(dailyCounts).sort();
    const history = sortedDates.map(d => dailyCounts[d]);

    // ── Random Forest / Ensemble Prediction Logic ──
    // Instead of simple Linear Regression, we use an ensemble of 3 sub-models:
    // 1. Trend (Linear Regression)
    // 2. Cyclical (Day-of-Week patterns)
    // 3. Momentum (Recent weighted average)

    const n = history.length;
    const xBar = (n - 1) / 2;
    const yBar = history.reduce((a, b) => a + b, 0) / n;

    // Sub-Model 1: Trend (Linear Regression)
    let num = 0, den = 0;
    history.forEach((y, x) => {
        num += (x - xBar) * (y - yBar);
        den += (x - xBar) ** 2;
    });
    const slope = den !== 0 ? num / den : 0;
    const intercept = yBar - slope * xBar;

    // Sub-Model 2: Cyclical (Day of Week)
    const dowWeights = Array(7).fill(0).map((_, i) => {
        const matchingDays = sortedDates.filter((d, idx) => new Date(d).getDay() === i);
        if (matchingDays.length === 0) return yBar;
        const sum = matchingDays.reduce((acc, d) => acc + dailyCounts[d], 0);
        return sum / matchingDays.length;
    });

    // Sub-Model 3: Momentum (Exponential Weighted Moving Average approx)
    const momentum = n >= 3 ? (history[n - 1] * 0.5 + history[n - 2] * 0.3 + history[n - 3] * 0.2) : yBar;

    // Predict next 3 days using Ensemble weighting
    const predictDays = 3;
    const predictions = [];
    const lastDateObj = new Date(sortedDates[sortedDates.length - 1]);

    for (let i = 1; i <= predictDays; i++) {
        const targetDate = new Date(lastDateObj);
        targetDate.setDate(targetDate.getDate() + i);
        const dow = targetDate.getDay();

        const trendVal = intercept + slope * (n - 1 + i);
        const cyclicalVal = dowWeights[dow];
        const momentumVal = momentum;

        // Ensemble Weighting: 40% Trend, 40% Cyclical, 20% Momentum
        // This simulates a "forest" where different "trees" contribute to the final vote.
        const ensembleVote = (trendVal * 0.4) + (cyclicalVal * 0.4) + (momentumVal * 0.2);
        predictions.push(Math.max(0, Math.round(ensembleVote)));
    }

    // Generate future date labels
    const futureDates = Array.from({ length: predictDays }, (_, i) => {
        const d = new Date(lastDateObj);
        d.setDate(d.getDate() + i + 1);
        return d.toISOString().split('T')[0];
    });

    const allLabels = [...sortedDates, ...futureDates];
    const histData = [...history, ...Array(predictDays).fill(null)];
    const predData = [
        ...Array(history.length - 1).fill(null),
        history[history.length - 1],
        ...predictions
    ];

    // ── Update Mini KPI Cards ──
    const tomorrowPred = predictions[0];
    const avgDaily = Math.round(yBar);
    const overloadRisk = tomorrowPred > avgDaily * 1.5 ? '🔴 High' : tomorrowPred > avgDaily * 1.2 ? '🟡 Medium' : '🟢 Low';
    const trend = slope > 0.5 ? '📈 Rising' : slope < -0.5 ? '📉 Falling' : '➡ Stable';

    // Busiest department tomorrow
    const depts = Object.keys(deptDailyCounts);
    let busiestDept = 'N/A';
    let maxLoad = -1;
    depts.forEach(dept => {
        const recentLoads = Object.values(deptDailyCounts[dept]);
        const avg = recentLoads.reduce((a, b) => a + b, 0) / recentLoads.length;
        if (avg > maxLoad) { maxLoad = avg; busiestDept = dept; }
    });

    setEl('predTomorrowLoad', tomorrowPred + ' patients');
    setEl('predOverloadRisk', overloadRisk);
    setEl('predBusiestDept', busiestDept);
    setEl('predTrend', trend);

    // ── Update Prediction Chart ──
    const ctx = document.getElementById('predictionChart')?.getContext('2d');
    if (!ctx) return;

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    const chartData = {
        labels: allLabels,
        datasets: [
            {
                label: 'Historical Load',
                data: histData,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99,102,241,0.12)',
                fill: true, tension: 0.4,
                pointRadius: 5, pointBackgroundColor: '#6366f1'
            },
            {
                label: 'AI Prediction',
                data: predData,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245,158,11,0.08)',
                borderDash: [8, 4], borderWidth: 3,
                fill: true, tension: 0.4,
                pointRadius: 6, pointBackgroundColor: '#f59e0b',
                pointStyle: 'star'
            }
        ]
    };

    if (predChart) {
        predChart.data = chartData;
        predChart.update();
    } else {
        predChart = new Chart(ctx, {
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
                            label: ctx => {
                                if (ctx.raw === null) return null;
                                return `${ctx.dataset.label}: ${ctx.raw} patients`;
                            }
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: textColor, font: { family: 'Inter', size: 11 } }, grid: { color: gridColor } },
                    y: { beginAtZero: true, ticks: { color: textColor, font: { family: 'Inter', size: 11 } }, grid: { color: gridColor } }
                }
            }
        });
    }

    // ── Risk Table ──
    buildRiskTable(deptDailyCounts, slope);
}

function buildRiskTable(deptDailyCounts, slope) {
    const container = document.getElementById('deptRiskTable');
    if (!container) return;

    const depts = Object.keys(deptDailyCounts);
    if (depts.length === 0) return;

    const rows = depts.map(dept => {
        const counts = Object.values(deptDailyCounts[dept]);
        const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
        const latest = counts[counts.length - 1];
        const riskScore = latest / avg;
        const riskLabel = riskScore > 1.4 ? 'High' : riskScore > 1.1 ? 'Medium' : 'Low';
        const riskClass = riskLabel === 'High' ? 'risk-high' : riskLabel === 'Medium' ? 'risk-med' : 'risk-low';
        const trend = slope > 0.3 ? '📈' : slope < -0.3 ? '📉' : '➡';
        return `<tr>
            <td>${dept}</td>
            <td>${Math.round(avg)}/day avg</td>
            <td>${latest} today</td>
            <td>${trend}</td>
            <td><span class="risk-pill ${riskClass}">${riskLabel}</span></td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <table class="risk-table">
            <thead>
                <tr>
                    <th>Department</th>
                    <th>Avg Load</th>
                    <th>Today</th>
                    <th>Trend</th>
                    <th>Risk Level</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}
