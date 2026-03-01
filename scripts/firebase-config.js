/**
 * firebase-config.js – initialise Firebase SDK (Compat version)
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

// Initialize once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

export { auth, db };
