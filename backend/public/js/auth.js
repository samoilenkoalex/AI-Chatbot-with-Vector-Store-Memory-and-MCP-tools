// API endpoints
const API_URL = 'http://localhost:3000/api';
const ENDPOINTS = {
    register: `${API_URL}/auth/register`,
    login: `${API_URL}/auth/login`,
};

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const tabBtns = document.querySelectorAll('.tab-btn');
const notification = document.getElementById('notification');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const loginSuccess = document.getElementById('loginSuccess');
const registerSuccess = document.getElementById('registerSuccess');

// Event Listeners
loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);
tabBtns.forEach((btn) => btn.addEventListener('click', switchForm));

// Set initial active state
document.querySelector('[data-form="login"]').click();

// Check if user is already logged in
checkAuthStatus();

// Form Handling Functions
async function handleLogin(e) {
    e.preventDefault();
    // Clear previous messages
    loginError.textContent = '';
    loginError.classList.add('hidden');
    loginSuccess.textContent = '';
    loginSuccess.classList.add('hidden');

    const formData = new FormData(loginForm);
    const data = {
        username: formData.get('username'),
        password: formData.get('password'),
    };

    try {
        const response = await fetch(ENDPOINTS.login, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            // Handle specific error cases
            switch (result.code) {
                case 'MISSING_CREDENTIALS':
                    throw new Error('Please enter both username and password.');
                case 'INVALID_CREDENTIALS':
                    throw new Error(
                        'Incorrect username or password. Please try again.'
                    );
                case 'INVALID_USERNAME':
                    throw new Error(
                        'Username must be at least 3 characters long.'
                    );
                case 'INVALID_PASSWORD':
                    throw new Error(
                        'Password must be at least 6 characters long.'
                    );
                default:
                    throw new Error(
                        result.message || 'Login failed. Please try again.'
                    );
            }
        }

        localStorage.setItem('token', result.token);
        loginSuccess.textContent = 'Login successful!';
        loginSuccess.classList.remove('hidden');
        setTimeout(() => {
            window.location.href = '/main';
        }, 1000);
        loginForm.reset();
    } catch (error) {
        // Show error in the form
        loginError.textContent = error.message;
        loginError.classList.remove('hidden');
        // Clear password field on error for security
        const passwordInput = loginForm.querySelector('input[type="password"]');
        if (passwordInput) passwordInput.value = '';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    // Clear previous messages
    registerError.textContent = '';
    registerError.classList.add('hidden');
    registerSuccess.textContent = '';
    registerSuccess.classList.add('hidden');

    const formData = new FormData(registerForm);
    const data = {
        username: formData.get('username'),
        password: formData.get('password'),
    };

    try {
        const response = await fetch(ENDPOINTS.register, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            // Handle specific error cases
            switch (result.code) {
                case 'USERNAME_TAKEN':
                    throw new Error(
                        'This username is already taken. Please choose another one.'
                    );
                case 'INVALID_USERNAME':
                    throw new Error(
                        'Username must be at least 3 characters long.'
                    );
                case 'INVALID_PASSWORD':
                    throw new Error(
                        'Password must be at least 6 characters long.'
                    );
                default:
                    throw new Error(
                        result.message ||
                            'Registration failed. Please try again.'
                    );
            }
        }

        registerSuccess.textContent = 'Registration successful! Please login.';
        registerSuccess.classList.remove('hidden');
        registerForm.reset();

        // Switch to login form after a short delay
        setTimeout(() => {
            switchToLogin();
        }, 2000);
    } catch (error) {
        // Show error in the form
        registerError.textContent = error.message;
        registerError.classList.remove('hidden');
        // Clear password field on error for security
        const passwordInput = registerForm.querySelector(
            'input[type="password"]'
        );
        if (passwordInput) passwordInput.value = '';
    }
}

// UI Helper Functions
function switchForm(e) {
    const formType = e.target.dataset.form;

    // Clear any existing messages
    loginError.textContent = '';
    loginError.classList.add('hidden');
    loginSuccess.textContent = '';
    loginSuccess.classList.add('hidden');
    registerError.textContent = '';
    registerError.classList.add('hidden');
    registerSuccess.textContent = '';
    registerSuccess.classList.add('hidden');

    // Remove active styles from all tabs
    tabBtns.forEach((btn) => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('bg-gray-100');
    });

    // Add active styles to clicked tab
    e.target.classList.remove('bg-gray-100');
    e.target.classList.add('bg-blue-600', 'text-white');

    if (formType === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    }
}

function switchToLogin() {
    tabBtns.forEach((btn) => {
        if (btn.dataset.form === 'login') {
            // Simulate a click to trigger the switchForm function
            btn.click();
        }
    });
}

function showNotification(message, type) {
    notification.textContent = message;
    notification.className = `notification ${type} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Auth Status Function
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = '/main';
    }
}
