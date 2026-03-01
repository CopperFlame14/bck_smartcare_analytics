// app.js
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initDashboard } from './dashboard.js';
import { initInput } from './input.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize simple things
    initTheme();

    // Tab Routing
    const navLinks = document.querySelectorAll('.nav-link[data-target]');
    const sections = document.querySelectorAll('.content-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Remove active class from all links and sections
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            // Add active to current
            link.classList.add('active');
            const targetId = document.getElementById('section-' + link.getAttribute('data-target'));
            if (targetId) {
                targetId.classList.add('active');
            }
        });
    });

    // Initialize Auth
    initAuth((user) => {
        console.log("Logged in as", user.email);
        // When logged in successfully, start the dashboard listeners
        initDashboard();
        initInput();
    });
});
