// input.js — Patient form submission + recent entries list
import { db } from './firebase-config.js';

const DEPT_EMOJI = { Emergency: '🚨', Cardiology: '❤️', Neurology: '🧠', Orthopedics: '🦴' };

export function initInput() {
    const form = document.getElementById('patientForm');
    const submitBtn = document.getElementById('submitBtn');
    const submitMsg = document.getElementById('submitMsg');

    // Set default datetime to now
    const dtInput = form.querySelector('input[name="arrival"]');
    if (dtInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        dtInput.value = now.toISOString().slice(0, 16);
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        submitMsg.textContent = '';
        submitMsg.style.color = '';

        const department = form.department.value;
        const arrival = new Date(form.arrival.value);
        const processTime = parseInt(form.processTime.value, 10);
        const needsBed = form.needsBed.value === 'yes';
        const severity = form.severity.value;

        try {
            await db.collection('hospitalData').add({
                department,
                arrival,
                processTime,
                needsBed,
                severity,
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            submitMsg.textContent = '✅ Patient record added successfully!';
            submitMsg.style.color = '#10b981';
            form.reset();
            const dtInput = form.querySelector('input[name="arrival"]');
            if (dtInput) {
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                dtInput.value = now.toISOString().slice(0, 16);
            }
        } catch (err) {
            submitMsg.textContent = '❌ Error: ' + err.message;
            submitMsg.style.color = '#ef4444';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Patient Record';
        }
    });

    // Real-time recent entries list
    db.collection('hospitalData').orderBy('createdAt', 'desc').limit(8).onSnapshot(snap => {
        const list = document.getElementById('recentEntries');
        if (!list) return;
        if (snap.empty) {
            list.innerHTML = '<li class="entry-placeholder">No entries yet</li>';
            return;
        }
        list.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            const emoji = DEPT_EMOJI[d.department] || '🏥';
            const time = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
            return `<li class="entry-item">
                <span>${emoji}</span>
                <span class="entry-dept">${d.department}</span>
                <span class="entry-meta">${d.processTime}min · ${time}</span>
            </li>`;
        }).join('');
    });
}
