/**
 * FIREBASE CONFIGURATION & SETUP INSTRUCTIONS
 * -------------------------------------------
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project (e.g., "SmartCare Analytics Dashboard")
 * 3. Add a Web App to your project.
 * 4. Copy the `firebaseConfig` object and paste it below.
 * 5. Enable "Email/Password" Authentication in the Firebase Console.
 * 6. Create a "Firestore Database" in the Firebase Console.
 * 7. Set Firestore Rules to allow read/write for authenticated users (for development).
 */

const firebaseConfig = {
  apiKey: "AIzaSyCFh2i3zYxoSU2ONY8FQAe34VZKyag0rXs",
  authDomain: "bck-smartcare-analytics.firebaseapp.com",
  projectId: "bck-smartcare-analytics",
  storageBucket: "bck-smartcare-analytics.firebasestorage.app",
  messagingSenderId: "240576756562",
  appId: "1:240576756562:web:0bf302481a79f8b157588b",
  measurementId: "G-LRYW2S7MYR"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

export { auth, db };
