// alerts.js — Smart Alert System with toast + alert log
let activeAlerts = new Set();

export function checkAlerts(metrics) {
    const waitThresh = parseInt(document.getElementById('threshWait')?.value || 45);
    const bedThresh = parseInt(document.getElementById('threshBed')?.value || 10);
    const scoreThresh = parseInt(document.getElementById('threshScore')?.value || 60);

    if (metrics.avgWait > waitThresh) {
        triggerAlert('wait', 'danger', `🚨 High Wait Time: Average wait is ${metrics.avgWait} mins (threshold: ${waitThresh} min)`);
    } else { clearAlert('wait'); }

    if (metrics.beds < bedThresh) {
        triggerAlert('beds', 'danger', `🏥 Critical Bed Shortage: Only ${metrics.beds} beds available (threshold: ${bedThresh})`);
    } else { clearAlert('beds'); }

    if (metrics.score < scoreThresh) {
        triggerAlert('score', 'warning', `⚠️ Low Efficiency Score: ${metrics.score}/100 — intervention recommended`);
    } else { clearAlert('score'); }

    // Update alert badge
    const count = activeAlerts.size;
    const badge = document.getElementById('alertBadgeCount');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count === 0 ? 'none' : '';
    }
}

function triggerAlert(id, type, message) {
    if (activeAlerts.has(id)) return;
    activeAlerts.add(id);

    // Toast notification
    showToast(message, type);

    // Alert log entry
    const log = document.getElementById('alertLog');
    if (log) {
        // Remove placeholder
        const empty = log.querySelector('.empty-state');
        if (empty) empty.remove();

        const entry = document.createElement('div');
        entry.className = `alert-entry ${type}`;
        entry.id = `alert-entry-${id}`;
        entry.innerHTML = `
            <div class="alert-dot ${type}"></div>
            <div>
                <p class="alert-entry-text">${message}</p>
                <p class="alert-time">${new Date().toLocaleTimeString()}</p>
            </div>
        `;
        log.prepend(entry);
    }
}

function clearAlert(id) {
    if (!activeAlerts.has(id)) return;
    activeAlerts.delete(id);
    const entry = document.getElementById(`alert-entry-${id}`);
    if (entry) entry.remove();
}

function showToast(message, type = 'error') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-msg">${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(110%)';
        toast.style.transition = 'all 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 5000);
}
