// input.js
import { db } from './firebase-config.js';

export function initInput() {
    const form = document.getElementById('patientForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const department = form.department.value;
        const arrival = form.arrival.value;
        const processTime = parseInt(form.processTime.value, 10);
        const needsBedStr = form.needsBed.value;

        try {
            await db.collection('hospitalData').add({
                department,
                arrival: new Date(arrival),
                processTime,
                needsBed: needsBedStr === 'yes',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert('Patient record added successfully!');
            form.reset();
        } catch (err) {
            console.error("Error adding document: ", err);
            alert('Error adding patient: ' + err.message);
        }
    });
}
