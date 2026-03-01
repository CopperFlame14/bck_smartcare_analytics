// app.js — Entry point: wires up all modules
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initDashboard } from './dashboard.js';
import { initInput } from './input.js';
import { generateMockData } from './mockData.js';

document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle (works even on auth screen)
    initTheme();

    // Sidebar navigation routing
    const navItems = document.querySelectorAll('.nav-item[data-target]');
    const pages = document.querySelectorAll('.page');

    function navigate(target) {
        navItems.forEach(n => n.classList.toggle('active', n.getAttribute('data-target') === target));
        pages.forEach(p => p.classList.toggle('active', p.id === `section-${target}`));
    }

    navItems.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            navigate(item.getAttribute('data-target'));
        });
    });

    // Init Firebase auth — everything else loads on login
    initAuth(user => {
        console.log('✅ Signed in as:', user.email);

        // Start real-time dashboard
        initDashboard();

        // Start patient input module
        initInput();

        // Mock data generator
        const mockBtn = document.getElementById('generateMockBtn');
        if (mockBtn) mockBtn.addEventListener('click', generateMockData);

        // Default to dashboard
        navigate('dashboard');
    });
});
