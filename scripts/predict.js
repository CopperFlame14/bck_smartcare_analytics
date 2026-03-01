// predict.js

let predictChartInstance = null;

export function updatePredictionChart(dataRecords) {
    const ctx = document.getElementById('predictionChart').getContext('2d');

    // Aggregate patient counts by day
    const dailyCounts = {};
    dataRecords.forEach(record => {
        if (!record.arrival) return;
        let dateObj;
        if (record.arrival.toDate) {
            dateObj = record.arrival.toDate();
        } else {
            dateObj = new Date(record.arrival);
        }
        const dateStr = dateObj.toISOString().split('T')[0];
        dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
    });

    const sortedDates = Object.keys(dailyCounts).sort();
    const historyCounts = sortedDates.map(d => dailyCounts[d]);

    // Simple prediction: next 3 days using average of last 3 days
    const predictions = [];
    const predictDays = 3;
    let last3 = historyCounts.slice(-3);
    if (last3.length === 0) last3 = [0];

    for (let i = 0; i < predictDays; i++) {
        const avg = Math.round(last3.reduce((a, b) => a + b, 0) / last3.length);
        predictions.push(avg);
        last3.shift();
        last3.push(avg);
    }

    // Generate future date labels
    let lastDate = new Date();
    if (sortedDates.length > 0) {
        lastDate = new Date(sortedDates[sortedDates.length - 1]);
    }

    const futureDates = [];
    for (let i = 1; i <= predictDays; i++) {
        const nextDay = new Date(lastDate);
        nextDay.setDate(lastDate.getDate() + i);
        futureDates.push(nextDay.toISOString().split('T')[0]);
    }

    // Combine for chart
    const labels = [...sortedDates, ...futureDates];

    // Padding with nulls so lines connect properly but distinguish distinct datasets
    const historyData = [...historyCounts, ...Array(predictDays).fill(null)];
    const predictData = [...Array(historyCounts.length - 1).fill(null), historyCounts[historyCounts.length - 1], ...predictions];

    if (predictChartInstance) {
        predictChartInstance.data.labels = labels;
        predictChartInstance.data.datasets[0].data = historyData;
        predictChartInstance.data.datasets[1].data = predictData;
        predictChartInstance.update();
    } else {
        predictChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Historical Patient Load',
                        data: historyData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4
                    },
                    {
                        label: 'Predicted Patient Load',
                        data: predictData,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.05)',
                        borderDash: [6, 4],
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointBackgroundColor: '#f59e0b'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'Patient Load Forecast' }
                }
            }
        });
    }
}
