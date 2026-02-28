// static/js/actions.js - Handle quick actions and modals

document.addEventListener('DOMContentLoaded', () => {
    // Modal elements
    const modals = {
        changePassword: document.getElementById('modal-change-password'),
        accountSettings: document.getElementById('modal-account-settings'),
        contactSupport: document.getElementById('modal-contact-support'),
        cardDetails: document.getElementById('modal-card-details')
    };

    // Action buttons
    const actionButtons = {
        changePassword: document.getElementById('action-change-password'),
        accountSettings: document.getElementById('action-account-settings'),
        contactSupport: document.getElementById('action-contact-support'),
        cardDetails: document.getElementById('action-card-details')
    };

    // Close buttons
    const closeButtons = document.querySelectorAll('.modal-cancel-btn');

    // Open modal on action button click
    if (actionButtons.changePassword) {
        actionButtons.changePassword.addEventListener('click', () => openModal(modals.changePassword));
    }
    if (actionButtons.accountSettings) {
        actionButtons.accountSettings.addEventListener('click', () => openModal(modals.accountSettings));
    }
    if (actionButtons.contactSupport) {
        actionButtons.contactSupport.addEventListener('click', () => openModal(modals.contactSupport));
    }
    if (actionButtons.cardDetails) {
        actionButtons.cardDetails.addEventListener('click', () => openModal(modals.cardDetails));
    }

    // Close modals on cancel button click
    closeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.confirm-dialog');
            closeModal(modal);
        });
    });

    // Close modal on background click
    Object.values(modals).forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(modal);
                }
            });
        }
    });

    // Change Password Form
    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            // Validation
            if (!currentPassword) {
                showToast('Current password is required', 'error');
                return;
            }

            if (!newPassword || newPassword.length < 6) {
                showToast('New password must be at least 6 characters', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }

            const btn = changePasswordForm.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Updating...';

            try {
                const response = await fetch('/api/change_password', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword
                    })
                });

                const data = await response.json();

                if (data.success) {
                    showToast('✓ Password changed successfully!', 'success');
                    changePasswordForm.reset();
                    closeModal(modals.changePassword);
                } else {
                    showToast(data.message || 'Failed to change password', 'error');
                }
            } catch (err) {
                showToast('Network error. Please try again.', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }

    // Contact Support Form
    const contactSupportForm = document.getElementById('contact-support-form');
    if (contactSupportForm) {
        contactSupportForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const subject = document.getElementById('support-subject').value.trim();
            const message = document.getElementById('support-message').value.trim();

            // Validation
            if (!subject || subject.length < 5) {
                showToast('Subject must be at least 5 characters', 'error');
                return;
            }

            if (!message || message.length < 10) {
                showToast('Message must be at least 10 characters', 'error');
                return;
            }

            const btn = contactSupportForm.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Sending...';

            try {
                // Simulate sending message (in real app, would call API)
                await new Promise(resolve => setTimeout(resolve, 1000));

                showToast('✓ Support request sent! We\'ll respond within 24 hours.', 'success');
                contactSupportForm.reset();
                closeModal(modals.contactSupport);
            } catch (err) {
                showToast('Failed to send support request', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }

    // Update account name in settings modal
    function updateAccountSettings() {
        const welcomeMsg = document.getElementById('welcome-msg');
        if (welcomeMsg) {
            const nameMatch = welcomeMsg.textContent.match(/Welcome back, (.+?)!/);
            if (nameMatch) {
                const accountNameEl = document.getElementById('settings-account-name');
                if (accountNameEl) {
                    accountNameEl.textContent = nameMatch[1];
                }
            }
        }
    }

    // Call update when available
    setTimeout(updateAccountSettings, 500);

    // Helper functions
    function openModal(modal) {
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        }
    }

    function closeModal(modal) {
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
    }
});
