// mockData.js
import { db } from './firebase-config.js';

export async function generateMockData() {
    const departments = ['Emergency', 'Cardiology', 'Neurology', 'Orthopedics'];
    const batch = db.batch();

    // Generate data for the last 7 days
    for (let day = 0; day < 7; day++) {
        const date = new Date();
        date.setDate(date.getDate() - day);

        // Random number of patients per day (5 to 15)
        const dailyPatients = Math.floor(Math.random() * 10) + 5;

        for (let i = 0; i < dailyPatients; i++) {
            const dept = departments[Math.floor(Math.random() * departments.length)];
            const arrival = new Date(date);
            arrival.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

            const docRef = db.collection('hospitalData').doc();
            batch.set(docRef, {
                department: dept,
                arrival: arrival,
                processTime: Math.floor(Math.random() * 60) + 10, // 10-70 mins
                needsBed: Math.random() > 0.7,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }

    try {
        await batch.commit();
        console.log("Mock data generated successfully!");
        alert("7 days of mock data generated for visualization!");
    } catch (err) {
        console.error("Error generating mock data: ", err);
    }
}
