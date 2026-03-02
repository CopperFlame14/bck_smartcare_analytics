// auth.js – Authentication with Multi-Hospital Support
// On register: creates Firebase Auth user → Firestore hospital → Firestore user profile
// On login: fetches user's hospitalId → sets global context
import { auth, db, setHospitalId } from './firebase-config.js';

// Switch between Login / Register tabs (called from HTML onclick)
window.switchTab = function (tab) {
    document.getElementById('loginTab').classList.toggle('active', tab === 'login');
    document.getElementById('registerTab').classList.toggle('active', tab === 'register');
    document.getElementById('loginForm').classList.toggle('active', tab === 'login');
    document.getElementById('registerForm').classList.toggle('active', tab === 'register');
};

// Track whether we just registered (to handle the race condition)
let _pendingRegistration = false;
let _pendingHospitalId = null;
let _pendingHospitalName = null;

export function initAuth(onLogin) {
    // Firebase auth state listener
    auth.onAuthStateChanged(async user => {
        const loginVideo = document.getElementById('bgVideoLogin');
        const dashVideo = document.getElementById('bgVideoDashboard');

        if (user) {
            try {
                // If we just registered, the user doc was already created in the submit handler
                // but Firestore might need a moment. Use the pending data if available.
                if (_pendingRegistration && _pendingHospitalId) {
                    setHospitalId(_pendingHospitalId);
                    const hospitalNameEl = document.getElementById('hospitalName');
                    if (hospitalNameEl) hospitalNameEl.textContent = _pendingHospitalName || 'My Hospital';
                    _pendingRegistration = false;
                    _pendingHospitalId = null;
                    _pendingHospitalName = null;
                } else {
                    // Normal login — fetch user profile from Firestore
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        setHospitalId(userData.hospitalId);
                        const hospitalNameEl = document.getElementById('hospitalName');
                        if (hospitalNameEl) hospitalNameEl.textContent = userData.hospitalName || 'My Hospital';
                    } else {
                        // Retry once after a short delay (Firestore write may still be propagating)
                        console.log('⏳ User doc not found yet, retrying in 1s...');
                        await new Promise(r => setTimeout(r, 1000));
                        const retryDoc = await db.collection('users').doc(user.uid).get();
                        if (retryDoc.exists) {
                            const userData = retryDoc.data();
                            setHospitalId(userData.hospitalId);
                            const hospitalNameEl = document.getElementById('hospitalName');
                            if (hospitalNameEl) hospitalNameEl.textContent = userData.hospitalName || 'My Hospital';
                        } else {
                            console.error('❌ User profile not found after retry');
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching user profile:', err);
            }

            // Show dashboard, hide login
            document.getElementById('authOverlay').classList.remove('active');
            document.getElementById('app').classList.remove('hidden');

            // Switch to dashboard video
            if (loginVideo) loginVideo.classList.remove('active');
            if (dashVideo) dashVideo.classList.add('active');

            // Set user info in sidebar
            const name = user.displayName || user.email.split('@')[0];
            document.getElementById('userName').textContent = name;
            document.getElementById('userAvatar').textContent = name[0].toUpperCase();
            if (onLogin) onLogin(user);
        } else {
            console.log('🚪 User signed out, showing landing page');
            document.getElementById('authOverlay').classList.add('active');
            document.getElementById('app').classList.add('hidden');

            // Switch to login video
            if (dashVideo) dashVideo.classList.remove('active');
            if (loginVideo) loginVideo.classList.add('active');
        }
    });

    // ── Login Form ──
    document.getElementById('loginForm').addEventListener('submit', async e => {
        e.preventDefault();
        const errEl = document.getElementById('loginError');
        errEl.textContent = '';
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPassword').value;
        try {
            await auth.signInWithEmailAndPassword(email, pass);
        } catch (err) {
            errEl.textContent = friendlyError(err.code);
        }
    });

    // ── Register Form ──
    // Flow: Create Auth user → Create hospital doc → Create user doc → Set pending flag
    document.getElementById('registerForm').addEventListener('submit', async e => {
        e.preventDefault();
        const errEl = document.getElementById('registerError');
        errEl.textContent = '';

        const name = document.getElementById('regName').value.trim();
        const hospitalName = document.getElementById('regHospital').value.trim();
        const email = document.getElementById('regEmail').value;
        const pass = document.getElementById('regPassword').value;

        if (!hospitalName) {
            errEl.textContent = 'Please enter a hospital name.';
            return;
        }

        try {
            // 1. Create Firebase Auth user
            const cred = await auth.createUserWithEmailAndPassword(email, pass);
            await cred.user.updateProfile({ displayName: name });

            // 2. Create hospital document
            const hospitalRef = db.collection('hospitals').doc();

            // 3. Create user profile with link to hospital
            // IMPORTANT: Write both docs BEFORE onAuthStateChanged tries to read them
            await Promise.all([
                hospitalRef.set({
                    name: hospitalName,
                    createdBy: cred.user.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }),
                db.collection('users').doc(cred.user.uid).set({
                    displayName: name,
                    email: email,
                    hospitalId: hospitalRef.id,
                    hospitalName: hospitalName,
                    role: 'admin',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                })
            ]);

            // Set pending data so onAuthStateChanged can use it immediately
            _pendingRegistration = true;
            _pendingHospitalId = hospitalRef.id;
            _pendingHospitalName = hospitalName;

            // Force re-trigger onAuthStateChanged by reloading auth state
            // Since user is already signed in, we need to manually trigger the dashboard load
            setHospitalId(hospitalRef.id);
            const hospitalNameEl = document.getElementById('hospitalName');
            if (hospitalNameEl) hospitalNameEl.textContent = hospitalName;

            console.log('✅ Registered:', name, '→ Hospital:', hospitalName, '(', hospitalRef.id, ')');

            // Reload to ensure a clean state with the hospital context set
            window.location.reload();
        } catch (err) {
            errEl.textContent = friendlyError(err.code);
        }
    });

    // ── Logout ──
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            console.log('🔄 Logout clicked...');
            auth.signOut().then(() => {
                window.location.reload();
            });
        };
    }
}

function friendlyError(code) {
    const messages = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Try again.',
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/too-many-requests': 'Too many attempts. Please wait.',
    };
    return messages[code] || 'Something went wrong. Please try again.';
}
