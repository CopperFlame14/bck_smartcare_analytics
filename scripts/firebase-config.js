// firebase-config.js – initialise Firebase SDK
// Replace the placeholder values with your own Firebase project configuration.
// You can obtain these from the Firebase console under Project Settings.

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialise Firebase
firebase.initializeApp(firebaseConfig);

// Export convenient references
const auth = firebase.auth();
const db = firebase.firestore();

// Optional: set Firestore settings (e.g., timestampsInSnapshots)
// db.settings({ timestampsInSnapshots: true });

export { auth, db };
