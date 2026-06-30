const API = 'https://url-shortener-backend-344351741209.us-central1.run.app';
let accessToken = localStorage.getItem('accessToken');
let isLogin = true;

const authView = document.getElementById('auth-view');
const shortenView = document.getElementById('shorten-view');
const authAlert = document.getElementById('auth-alert');
const shortenAlert = document.getElementById('shorten-alert');

function showAlert(el, message, type = 'danger') {
    el.className = `alert alert-${type}`;
    el.textContent = message;
    el.classList.remove('d-none');
}

function hideAlert(el) {
    el.classList.add('d-none');
}

function showView() {
    if (accessToken) {
        authView.classList.add('d-none');
        shortenView.classList.remove('d-none');
    } else {
        authView.classList.remove('d-none');
        shortenView.classList.add('d-none');
    }
}

function setAuthMode(login) {
    isLogin = login;
    const header = document.querySelector('#auth-view .card-header');
    const btn = document.getElementById('auth-btn');
    const link = document.getElementById('auth-switch-link');
    document.getElementById('auth-title').textContent = login ? 'Login' : 'Register';
    btn.textContent = login ? 'Login' : 'Register';
    document.getElementById('auth-switch-text').textContent = login ? "Don't have an account?" : 'Already have an account?';
    link.textContent = login ? 'Register' : 'Login';
    header.classList.toggle('register', !login);
    btn.classList.toggle('btn-primary', login);
    btn.classList.toggle('btn-register', !login);
    link.classList.toggle('register-link', !login);
}

document.getElementById('auth-switch-link').addEventListener('click', () => {
    hideAlert(authAlert);
    setAuthMode(!isLogin);
});

document.getElementById('auth-btn').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    hideAlert(authAlert);

    const endpoint = isLogin ? '/auth/login' : '/auth/register';

    try {
        const res = await fetch(`${API}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok) return showAlert(authAlert, data.message);

        if (isLogin) {
            accessToken = data.accessToken;
            localStorage.setItem('accessToken', accessToken);
            showView();
            const toast = new bootstrap.Toast(document.getElementById('login-toast'), { delay: 3000 });
            toast.show();
        } else {
            showAlert(authAlert, 'Account created! You can now login.', 'success');
            setAuthMode(true);
        }
    } catch {
        showAlert(authAlert, 'Something went wrong. Is the server running?');
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {}
    accessToken = null;
    localStorage.removeItem('accessToken');
    document.getElementById('result').classList.add('d-none');
    hideAlert(shortenAlert);
    showView();
    const toast = new bootstrap.Toast(document.getElementById('logout-toast'), { delay: 3000 });
    toast.show();
});

document.getElementById('shorten-btn').addEventListener('click', async () => {
    const url = document.getElementById('url-input').value.trim();
    hideAlert(shortenAlert);
    document.getElementById('result').classList.add('d-none');

    if (!url) return showAlert(shortenAlert, 'Please enter a URL');

    try {
        const res = await fetch(`${API}/shorten`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ url })
        });
        const data = await res.json();

        if (res.status === 401) {
            accessToken = null;
            localStorage.removeItem('accessToken');
            showView();
            return;
        }

        if (!res.ok) return showAlert(shortenAlert, data.message);

        if (data.accessToken) {
            accessToken = data.accessToken;
            localStorage.setItem('accessToken', accessToken);
        }

        const link = document.getElementById('short-url-link');
        link.href = data.shortUrl;
        link.textContent = data.shortUrl;
        document.getElementById('result').classList.remove('d-none');
    } catch {
        showAlert(shortenAlert, 'Something went wrong. Is the server running?');
    }
});

document.getElementById('copy-btn').addEventListener('click', () => {
    const url = document.getElementById('short-url-link').textContent;
    navigator.clipboard.writeText(url);
    document.getElementById('copy-btn').textContent = 'Copied!';
    setTimeout(() => document.getElementById('copy-btn').textContent = 'Copy', 2000);
});

showView();
