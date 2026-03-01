// auth.js – Full authentication with Login + Register
import { auth } from './firebase-config.js';

// Switch between Login / Register tabs (called from HTML onclick)
window.switchTab = function (tab) {
    document.getElementById('loginTab').classList.toggle('active', tab === 'login');
    document.getElementById('registerTab').classList.toggle('active', tab === 'register');
    document.getElementById('loginForm').classList.toggle('active', tab === 'login');
    document.getElementById('registerForm').classList.toggle('active', tab === 'register');
};

export function initAuth(onLogin) {
    // Firebase auth state listener
    auth.onAuthStateChanged(user => {
        if (user) {
            document.getElementById('authOverlay').classList.remove('active');
            document.getElementById('app').classList.remove('hidden');
            // Set user info in sidebar
            const name = user.displayName || user.email.split('@')[0];
            document.getElementById('userName').textContent = name;
            document.getElementById('userAvatar').textContent = name[0].toUpperCase();
            if (onLogin) onLogin(user);
        } else {
            document.getElementById('authOverlay').classList.add('active');
            document.getElementById('app').classList.add('hidden');
        }
    });

    // Login form submit
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

    // Register form submit
    document.getElementById('registerForm').addEventListener('submit', async e => {
        e.preventDefault();
        const errEl = document.getElementById('registerError');
        errEl.textContent = '';
        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value;
        const pass = document.getElementById('regPassword').value;
        try {
            const cred = await auth.createUserWithEmailAndPassword(email, pass);
            // Set display name
            await cred.user.updateProfile({ displayName: name });
        } catch (err) {
            errEl.textContent = friendlyError(err.code);
        }
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut());
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
