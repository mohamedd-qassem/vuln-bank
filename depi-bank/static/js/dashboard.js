// static/js/dashboard.js
async function loadDashboard() {
    try {
        const response = await fetch('/api/dashboard', {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success) {
            // Check if user is admin
            if (data.is_admin) {
                // Hide user dashboard and show admin dashboard
                document.getElementById('main-dashboard').style.display = 'none';
                document.getElementById('admin-dashboard').classList.remove('hidden');
                document.getElementById('welcome-msg').textContent = `Welcome back, ${data.name}! 👑`;

                // Load admin data
                loadAdminStats();
                loadAdminUsers();
                loadAdminTransactions();
            } else {
                // Show user dashboard
                document.getElementById('main-dashboard').style.display = 'block';
                document.getElementById('admin-dashboard').classList.add('hidden');
                document.getElementById('welcome-msg').textContent = `Welcome back, ${data.name}!`;
                const balanceEl = document.getElementById('account-balance');
                const currentBalance = parseFloat(balanceEl.textContent.replace('$', ''));
                const targetBalance = data.balance;

                // Animate balance changes
                if (currentBalance !== targetBalance) {
                    animateValue(balanceEl, currentBalance, targetBalance, 600);
                } else {
                    balanceEl.textContent = `$${targetBalance.toFixed(2)}`;
                }

                loadTransactions(5);
            }
        } else {
            showToast('Failed to load dashboard', 'error');
        }
    } catch (err) {
        showToast('Network error', 'error');
    }
}

async function loadAdminStats() {
    try {
        const response = await fetch('/api/admin/stats', {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success) {
            document.getElementById('admin-user-count').textContent = data.user_count || 0;
            document.getElementById('admin-transaction-count').textContent = data.transaction_count || 0;
            document.getElementById('admin-transaction-volume').textContent = `$${(data.total_volume || 0).toFixed(2)}`;
            document.getElementById('admin-system-balance').textContent = `$${(data.system_balance || 0).toFixed(2)}`;
        }
    } catch (err) {
        console.error('Admin stats load error:', err);
    }
}

async function loadAdminUsers() {
    try {
        const response = await fetch('/api/admin/users', {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success) {
            const tableBody = document.getElementById('admin-users-table');
            tableBody.innerHTML = '';

            const users = data.users || [];
            if (users.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="3" style="padding: 2rem; text-align: center; color: #7f8c8d;">No users found</td></tr>';
                return;
            }

            users.forEach(user => {
                const row = document.createElement('tr');
                const statusBadge = user.username === 'admin'
                    ? '<span style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">Admin</span>'
                    : '<span style="background: linear-gradient(135deg, #27ae60 0%, #229954 100%); color: white; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">Active</span>';

                row.style.borderBottom = '1px solid #ecf0f1';
                row.innerHTML = `
                    <td style="padding: 1rem; color: #2c3e50; font-weight: 500;">${user.username}</td>
                    <td style="padding: 1rem; color: #27ae60; font-weight: 600;">$${user.balance.toFixed(2)}</td>
                    <td style="padding: 1rem;">${statusBadge}</td>
                `;
                tableBody.appendChild(row);
            });
        }
    } catch (err) {
        console.error('Admin users load error:', err);
    }
}

async function loadAdminTransactions() {
    try {
        const response = await fetch('/api/admin/transactions', {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success) {
            const tableBody = document.getElementById('admin-transactions-table');
            tableBody.innerHTML = '';

            const transactions = data.transactions || [];
            if (transactions.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4" style="padding: 2rem; text-align: center; color: #7f8c8d;">No transactions found</td></tr>';
                return;
            }

            // Show only the latest 10 transactions
            transactions.slice(0, 10).forEach(tx => {
                const row = document.createElement('tr');
                const arrow = tx.amount < 0 ? '▼' : '▲';
                const color = tx.amount < 0 ? '#e74c3c' : '#27ae60';

                row.style.borderBottom = '1px solid #ecf0f1';
                row.innerHTML = `
                    <td style="padding: 1rem; color: #2c3e50;">${tx.from_user}</td>
                    <td style="padding: 1rem; color: #2c3e50;">${tx.to_user}</td>
                    <td style="padding: 1rem; color: ${color}; font-weight: 600;">${arrow} $${Math.abs(tx.amount).toFixed(2)}</td>
                    <td style="padding: 1rem; color: #7f8c8d; font-size: 0.9rem;">${tx.date}</td>
                `;
                tableBody.appendChild(row);
            });
        }
    } catch (err) {
        console.error('Admin transactions load error:', err);
    }
}

function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = start + progress * (end - start);
        element.textContent = `$${value.toFixed(2)}`;
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    };
    requestAnimationFrame(step);
}

function loadTransactions(limit = 0) {
    const tableBody = document.getElementById('transaction-body');
    const loading = document.getElementById('transactions-loading');
    const table = document.getElementById('transactions-table');
    const viewAllBtn = document.getElementById('view-all-transactions');

    if (!tableBody || !loading || !table) return;

    loading.style.display = 'block';
    table.style.display = 'none';
    tableBody.innerHTML = '';

    let url = '/api/transactions';
    if (limit > 0) {
        url += `?limit=${limit}`;
    }

    fetch(url, {
        method: 'GET',
        headers: getAuthHeaders()
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                throw new Error('Load failed');
            }

            loading.style.display = 'none';

            const transactions = data.transactions || [];

            if (transactions.length === 0) {
                const emptyRow = document.createElement('tr');
                emptyRow.innerHTML = '<td colspan="3" style="text-align: center; padding: 2rem; color: #999;">No transactions yet</td>';
                tableBody.appendChild(emptyRow);
                table.style.display = 'table';
                if (viewAllBtn) viewAllBtn.style.display = 'none';
                return;
            }

            // Add transactions to table
            transactions.forEach((tx) => {
                const row = document.createElement('tr');
                const isNegative = tx.amount < 0;
                const amountClass = isNegative ? 'negative' : 'positive';
                const arrow = isNegative ? '▼' : '▲';

                row.innerHTML = `
                    <td style="color: #7f8c8d; font-size: 0.9rem;">${tx.date}</td>
                    <td style="color: #2c3e50; font-weight: 500;">${tx.desc}</td>
                    <td class="${amountClass}" style="text-align: right; font-weight: 600;">${arrow} $${Math.abs(tx.amount).toFixed(2)}</td>
                `;
                tableBody.appendChild(row);
            });

            table.style.display = 'table';

            // Show View All button if there are more transactions and we're showing limited
            if (limit > 0 && transactions.length >= limit && viewAllBtn) {
                viewAllBtn.style.display = 'block';
                viewAllBtn.onclick = () => {
                    const originalText = viewAllBtn.textContent;
                    viewAllBtn.textContent = '📋 Loading...';
                    viewAllBtn.disabled = true;

                    setTimeout(() => {
                        loadTransactions(0);
                        viewAllBtn.textContent = originalText;
                        viewAllBtn.disabled = false;
                    }, 500);
                };
            } else if (viewAllBtn) {
                viewAllBtn.style.display = 'none';
            }
        })
        .catch(err => {
            console.error('Transaction load error:', err);
            loading.style.display = 'none';
            const errorRow = document.createElement('tr');
            errorRow.innerHTML = '<td colspan="3" style="text-align: center; padding: 2rem; color: #e74c3c;">Failed to load transactions</td>';
            tableBody.appendChild(errorRow);
            table.style.display = 'table';
        });
}