/**
 * firebase-config.js – Firebase SDK init + Hospital-scoped data access
 * 
 * ARCHITECTURE:
 *   hospitals/{hospitalId}/hospitalData/{recordId}  — patient records per hospital
 *   users/{uid}                                     — maps user → hospitalId
 *
 * Usage:
 *   import { db, auth, setHospitalId, getHospitalRef } from './firebase-config.js';
 *   setHospitalId('hospital_abc');  // called once after login
 *   getHospitalRef()               // → Firestore CollectionReference scoped to that hospital
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

// ── Hospital Context ──────────────────────────────────
// The current hospital ID is set after login and used by all modules
let _hospitalId = null;

/**
 * Set the active hospital ID (called by auth.js after login)
 */
function setHospitalId(id) {
  _hospitalId = id;
  console.log('🏥 Hospital context set:', id);
}

/**
 * Get the active hospital ID
 */
function getHospitalId() {
  return _hospitalId;
}

/**
 * Get a Firestore CollectionReference scoped to the current hospital's data
 * Returns: db.collection('hospitals/{hospitalId}/hospitalData')
 */
function getHospitalRef() {
  if (!_hospitalId) {
    throw new Error('Hospital ID not set. User must log in first.');
  }
  return db.collection('hospitals').doc(_hospitalId).collection('hospitalData');
}

export { auth, db, setHospitalId, getHospitalId, getHospitalRef };
