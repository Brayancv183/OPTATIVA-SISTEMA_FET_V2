const API_URL = 'http://localhost:5000/api';

function getAuthToken() { return localStorage.getItem('token'); }
function getCurrentUser() { const user = localStorage.getItem('user'); return user ? JSON.parse(user) : null; }
function getAuthHeaders() {
    const token = getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}
function isAuthenticated() { return !!getAuthToken(); }
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}
function checkAuth() {
    if (!isAuthenticated() && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
    }
}

function updateSidebarUser() {
    const user = getCurrentUser();
    if (!user) return;
    const nombreElem = document.querySelector('.coordinator-info p');
    const avatarElem = document.querySelector('.coordinator-info i');
    const avatarImg = document.querySelector('.coordinator-info img');
    if (nombreElem) nombreElem.textContent = user.nombre || 'Usuario';
    if (user.avatar_url && avatarImg) {
        avatarImg.src = user.avatar_url;
        avatarImg.style.display = 'inline-block';
        if (avatarElem) avatarElem.style.display = 'none';
    } else if (avatarElem) {
        avatarElem.style.display = 'inline-block';
        if (avatarImg) avatarImg.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (isAuthenticated()) updateSidebarUser();
});