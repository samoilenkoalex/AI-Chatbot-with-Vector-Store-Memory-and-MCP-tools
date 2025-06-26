// API endpoints
const API_URL = 'http://localhost:3000/api';
const ENDPOINTS = {
    protected: `${API_URL}/auth/protected`,
};

// DOM Elements
const welcomeMessage = document.getElementById('welcomeMessage');
const logoutBtn = document.getElementById('logoutBtn');
const notification = document.getElementById('notification');

// Event Listeners
logoutBtn.addEventListener('click', handleLogout);

// Check auth status immediately when page loads
checkAuthStatus();

function handleLogout() {
    localStorage.removeItem('token');
    showNotification('Logged out successfully!', 'success');
    window.location.href = '/auth'; // Updated path
}

function showNotification(message, type) {
    notification.textContent = message;
    notification.className = `notification ${type} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

async function checkAuthStatus() {
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = '/auth'; // Updated path
        return;
    }

    try {
        const response = await fetch(ENDPOINTS.protected, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) throw new Error('Invalid token');

        const data = await response.json();
        welcomeMessage.textContent = data.message;
    } catch (error) {
        localStorage.removeItem('token');
        window.location.href = '/auth'; // Updated path
    }
}
