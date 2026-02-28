// static/js/auth.js

// Utility function to get authorization headers with JWT token
function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab');
    const loginContainer = document.getElementById('login-form-container');
    const registerContainer = document.getElementById('register-form-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authView = document.getElementById('auth-view');
    const dashboardView = document.getElementById('dashboard-view');
    const logoutBtn = document.getElementById('logout-btn');
    const logoutConfirm = document.getElementById('logout-confirm');
    const confirmLogout = document.getElementById('confirm-logout');
    const cancelLogout = document.getElementById('cancel-logout');

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if (tab.dataset.tab === 'login') {
                loginContainer.style.display = 'block';
                registerContainer.style.display = 'none';
            } else {
                loginContainer.style.display = 'none';
                registerContainer.style.display = 'block';
            }
        });
    });

    // Login form submit
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validation
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;

            if (!username || username.length < 2) {
                showToast('Username must be at least 2 characters', 'error');
                return;
            }
            if (!password || password.length < 1) {
                showToast('Password is required', 'error');
                return;
            }

            const btn = loginForm.querySelector('button');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Signing in...';

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json();

                if (data.success) {
                    // Store JWT token in localStorage
                    localStorage.setItem('authToken', data.token);
                    showToast('✓ Login successful! Redirecting...', 'success');
                    setTimeout(() => {
                        authView && (authView.style.display = 'none');
                        dashboardView && (dashboardView.style.display = 'block');
                        logoutBtn && (logoutBtn.style.display = 'block');
                        loadDashboard();
                    }, 500);
                } else {
                    showToast(data.message || 'Login failed', 'error');
                    btn.disabled = false;
                    btn.textContent = originalText;
                }
            } catch (err) {
                showToast('Network error. Please try again.', 'error');
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }

    // Register form submit
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('reg-username').value.trim();
            const password = document.getElementById('reg-password').value;
            const name = document.getElementById('reg-name').value.trim();

            // Validation
            if (!username || username.length < 3) {
                showToast('Username must be at least 3 characters', 'error');
                return;
            }
            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                showToast('Username can only contain letters, numbers, and underscores', 'error');
                return;
            }
            if (!password || password.length < 6) {
                showToast('Password must be at least 6 characters', 'error');
                return;
            }
            if (!name || name.length < 2) {
                showToast('Name must be at least 2 characters', 'error');
                return;
            }

            const btn = registerForm.querySelector('button');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Creating Account...';

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, name })
                });
                const data = await response.json();

                if (data.success) {
                    // Store JWT token in localStorage
                    localStorage.setItem('authToken', data.token);
                    showToast('✓ Account created successfully!', 'success');
                    setTimeout(() => {
                        authView && (authView.style.display = 'none');
                        dashboardView && (dashboardView.style.display = 'block');
                        logoutBtn && (logoutBtn.style.display = 'block');
                        loadDashboard();
                    }, 500);
                } else {
                    showToast(data.message || 'Registration failed', 'error');
                    btn.disabled = false;
                    btn.textContent = originalText;
                }
            } catch (err) {
                showToast('Network error. Please try again.', 'error');
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }

    // Logout button
    logoutBtn.addEventListener('click', () => {
        logoutConfirm.classList.remove('hidden');
    });

    cancelLogout.addEventListener('click', () => {
        logoutConfirm.classList.add('hidden');
    });

    confirmLogout.addEventListener('click', async () => {
        confirmLogout.disabled = true;
        confirmLogout.textContent = 'Logging out...';

        try {
            const response = await fetch('/api/logout', { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                // Clear JWT token from localStorage
                localStorage.removeItem('authToken');
                showToast('✓ Logged out successfully', 'success');
                setTimeout(() => {
                    location.reload();
                }, 500);
            }
        } catch (err) {
            showToast('Logout error. Please try again.', 'error');
            confirmLogout.disabled = false;
            confirmLogout.textContent = 'Yes, Logout';
        }
    });
});