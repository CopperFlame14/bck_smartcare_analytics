// alerts.js
let alertTimeouts = {};

export function checkAlerts(metrics) {
    const container = document.getElementById('alertContainer');
    const alertThresholds = {
        waitTime: 45, // Alert if average wait time > 45 mins
        bedAvail: 10,  // Alert if bed availability < 10
        score: 60     // Alert if efficiency score < 60
    };

    const createAlert = (id, message) => {
        if (document.getElementById(`alert-${id}`)) return; // already showing
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert';
        alertDiv.id = `alert-${id}`;
        alertDiv.textContent = `⚠️ Alert: ${message}`;
        container.appendChild(alertDiv);

        // Auto remove after 5 seconds
        alertTimeouts[id] = setTimeout(() => {
            if (container.contains(alertDiv)) {
                container.removeChild(alertDiv);
            }
            delete alertTimeouts[id];
        }, 5000);
    };

    if (metrics.avgWait > alertThresholds.waitTime) createAlert('wait', `Average waiting time is extremely high! (${metrics.avgWait} mins)`);
    if (metrics.beds < alertThresholds.bedAvail) createAlert('beds', `Low bed availability! Only ${metrics.beds} beds left.`);
    if (metrics.score !== undefined && metrics.score < alertThresholds.score) createAlert('score', `Hospital efficiency score dropped below safe levels! (${metrics.score})`);
}
