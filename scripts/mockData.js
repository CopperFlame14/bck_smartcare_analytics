// mockData.js — Generate 7 days of realistic hospital mock data
import { db } from './firebase-config.js';

const DEPARTMENTS = ['Emergency', 'Cardiology', 'Neurology', 'Orthopedics'];
const SEVERITIES = ['low', 'low', 'low', 'medium', 'medium', 'high']; // weighted

export async function generateMockData() {
    const btn = document.getElementById('generateMockBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }

    try {
        const batch = db.batch();
        let count = 0;

        for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
            const date = new Date();
            date.setDate(date.getDate() - dayOffset);
            date.setHours(0, 0, 0, 0);

            // Weekends get slightly more emergency cases
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const dailyCount = Math.floor(Math.random() * 8) + (isWeekend ? 10 : 6);

            for (let i = 0; i < dailyCount; i++) {
                const dept = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
                const severity = SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)];
                const waitMultiplier = severity === 'high' ? 1.8 : severity === 'medium' ? 1.2 : 1;
                const processTime = Math.round((Math.random() * 40 + 10) * waitMultiplier);

                const arrival = new Date(date);
                arrival.setHours(Math.floor(Math.random() * 22) + 1, Math.floor(Math.random() * 60));

                const ref = db.collection('hospitalData').doc();
                batch.set(ref, {
                    department: dept,
                    arrival,
                    processTime,
                    needsBed: severity === 'high' || (severity === 'medium' && Math.random() > 0.5),
                    severity,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                count++;
            }
        }
        await batch.commit();
        console.log(`✅ Mock data: ${count} records generated`);
        showSuccess(`✅ Generated ${count} patient records across 7 days!`);
    } catch (err) {
        console.error('Mock data error:', err);
        showError('Error generating data: ' + err.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Generate 7-Day Mock Data'; }
    }
}

function showSuccess(msg) {
    const el = document.getElementById('submitMsg');
    if (el) { el.textContent = msg; el.style.color = '#10b981'; }
}
function showError(msg) {
    const el = document.getElementById('submitMsg');
    if (el) { el.textContent = msg; el.style.color = '#ef4444'; }
}
