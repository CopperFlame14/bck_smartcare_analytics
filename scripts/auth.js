// auth.js
import { auth } from './firebase-config.js';

export function initAuth(onLoginCallback) {
    const loginOverlay = document.getElementById('loginOverlay');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');

    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
        if (user) {
            user.getIdTokenResult().then((idTokenResult) => {
                // In a real app we check custom claims here:
                // if (!!idTokenResult.claims.admin) { ... }
                loginOverlay.classList.remove('active');
                if (onLoginCallback) onLoginCallback(user);
            }).catch(err => {
                console.error(err);
            });
        } else {
            loginOverlay.classList.add('active');
        }
    });

    // Handle Login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        loginError.textContent = '';
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        auth.signInWithEmailAndPassword(email, password)
            .catch((error) => {
                loginError.textContent = error.message;
            });
    });

    // Handle Logout
    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });
}
