// static/js/transfer.js
document.addEventListener('DOMContentLoaded', () => {
    const transferForm = document.getElementById('transfer-form');
    if (!transferForm) return;

    transferForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const recipient = document.getElementById('recipient').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        const desc = document.getElementById('desc').value.trim();

        // Validation
        if (!recipient || recipient.length < 2) {
            showToast('✕ Recipient username is required', 'error');
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            showToast('✕ Please enter a valid amount', 'error');
            return;
        }

        if (amount > 999999) {
            showToast('✕ Amount is too large', 'error');
            return;
        }

        // Confirmation dialog
        const confirmBox = document.createElement('div');
        confirmBox.className = 'confirm-dialog';
        confirmBox.innerHTML = `
            <div class="confirm-box">
                <h3>Confirm Transfer</h3>
                <p style="margin-top: 1rem; color: #666;">
                    Send <strong style="color: #4a90e2; font-size: 1.2rem;">$${amount.toFixed(2)}</strong> to <strong>${recipient}</strong>
                </p>
                ${desc ? `<p style="color: #999; font-size: 0.9rem; margin-top: 0.5rem;">Note: ${desc}</p>` : ''}
                <div style="margin-top: 1.5rem;">
                    <button class="confirm-transfer btn" style="background: #2ecc71;">Confirm</button>
                    <button class="cancel-transfer btn" style="margin-left: 0.5rem; background: #95a5a6;">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmBox);

        const confirmBtn = confirmBox.querySelector('.confirm-transfer');
        const cancelBtn = confirmBox.querySelector('.cancel-transfer');

        cancelBtn.addEventListener('click', () => {
            confirmBox.remove();
        });

        confirmBtn.addEventListener('click', async () => {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Processing...';

            try {
                const response = await fetch('/api/transfer', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ recipient, amount, desc })
                });
                const data = await response.json();

                if (data.success) {
                    showToast(`✓ Transferred $${amount.toFixed(2)} to ${recipient}`, 'success');
                    document.getElementById('account-balance').textContent = `$${data.new_balance.toFixed(2)}`;
                    transferForm.reset();
                    confirmBox.remove();
                    loadTransactions();
                } else {
                    showToast(data.message || 'Transfer failed', 'error');
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'Confirm';
                }
            } catch (err) {
                showToast('Network error. Please try again.', 'error');
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Confirm';
            }
        });
    });
});