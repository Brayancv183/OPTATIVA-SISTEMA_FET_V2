let currentUser = null;
let isEditing = false;

let displayNombre, editNombre, displayTelefono, editTelefono, displayDepartamento, editDepartamento;

document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    await loadUserProfile();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('editProfileBtn')?.addEventListener('click', () => toggleEdit(true));
    document.getElementById('saveProfileBtn')?.addEventListener('click', saveProfile);
    document.getElementById('cancelEditBtn')?.addEventListener('click', () => toggleEdit(false));
    document.getElementById('changePasswordLink')?.addEventListener('click', openPasswordModal);
    document.getElementById('avatarInput')?.addEventListener('change', uploadAvatar);
    document.getElementById('closePasswordModal')?.addEventListener('click', closePasswordModal);
    document.getElementById('cancelPasswordBtn')?.addEventListener('click', closePasswordModal);
    document.getElementById('confirmPasswordBtn')?.addEventListener('click', changePassword);
    document.getElementById('logout-link')?.addEventListener('click', (e) => { e.preventDefault(); logout(); });
}

async function loadUserProfile() {
    try {
        const res = await fetch(`${API_URL}/auth/perfil`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) {
            currentUser = data.usuario;
            renderProfile();
            await loadUserStats();
            updateLocalStorage();
        } else {
            showToast('Error al cargar perfil', 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Error de conexión', 'error');
    }
}

function renderProfile() {
    const avatarDiv = document.querySelector('.profile-avatar-large');
    if (currentUser.avatar_url) {
        avatarDiv.innerHTML = `<img src="${currentUser.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
        const iniciales = (currentUser.nombre || 'U').split(' ').map(w => w[0]).join('').toUpperCase();
        avatarDiv.innerHTML = `<span>${iniciales}</span>`;
    }

    document.getElementById('nombreCompleto').textContent = currentUser.nombre || 'Usuario';
    document.getElementById('cargoUsuario').textContent = (currentUser.rol || 'usuario').charAt(0).toUpperCase() + (currentUser.rol || 'usuario').slice(1);
    document.getElementById('departamentoUsuario').innerHTML = `<i class="fas fa-building"></i> <span>${currentUser.area_departamento || 'Sin departamento'}</span>`;

    const infoPersonal = `
        <div class="info-field">
            <label>Nombre Completo</label>
            <span class="info-value" id="displayNombre">${escapeHtml(currentUser.nombre || '-')}</span>
            <input type="text" id="editNombre" value="${escapeHtml(currentUser.nombre || '')}" style="display:none;">
        </div>
        <div class="info-field">
            <label>Correo Electrónico</label>
            <span class="info-value">${escapeHtml(currentUser.email || '-')}</span>
        </div>
        <div class="info-field">
            <label>Rol</label>
            <span class="info-value">${escapeHtml((currentUser.rol || 'usuario').charAt(0).toUpperCase() + (currentUser.rol || 'usuario').slice(1))}</span>
        </div>
    `;
    document.getElementById('infoPersonalGrid').innerHTML = infoPersonal;

    const infoContacto = `
        <div class="info-field">
            <label>Teléfono</label>
            <span class="info-value" id="displayTelefono">${escapeHtml(currentUser.telefono || '-')}</span>
            <input type="text" id="editTelefono" value="${escapeHtml(currentUser.telefono || '')}" style="display:none;">
        </div>
        <div class="info-field">
            <label>Email</label>
            <span class="info-value">${escapeHtml(currentUser.email || '-')}</span>
        </div>
    `;
    document.getElementById('infoContactoGrid').innerHTML = infoContacto;

    const infoLaboral = `
        <div class="info-field">
            <label>Departamento/Área</label>
            <span class="info-value" id="displayDepartamento">${escapeHtml(currentUser.area_departamento || '-')}</span>
            <input type="text" id="editDepartamento" value="${escapeHtml(currentUser.area_departamento || '')}" style="display:none;">
        </div>
        <div class="info-field">
            <label>Último Acceso</label>
            <span class="info-value">${currentUser.ultimo_login ? new Date(currentUser.ultimo_login).toLocaleDateString() : 'Primer acceso'}</span>
        </div>
    `;
    document.getElementById('infoLaboralGrid').innerHTML = infoLaboral;

    displayNombre = document.getElementById('displayNombre');
    editNombre = document.getElementById('editNombre');
    displayTelefono = document.getElementById('displayTelefono');
    editTelefono = document.getElementById('editTelefono');
    displayDepartamento = document.getElementById('displayDepartamento');
    editDepartamento = document.getElementById('editDepartamento');
}

async function loadUserStats() {
    document.getElementById('anosExperiencia').textContent = currentUser.anos_experiencia || 0;
    document.getElementById('prestamosGestionados').textContent = currentUser.prestamos_gestionados || 0;
    document.getElementById('satisfaccion').textContent = `${currentUser.satisfaccion || 0}%`;

    try {
        const res = await fetch(`${API_URL}/movimientos?limit=5`, { headers: getAuthHeaders() });
        const data = await res.json();
        const activityDiv = document.getElementById('activityList');
        if (data.success && data.movimientos?.length) {
            activityDiv.innerHTML = data.movimientos.map(m => `
                <div class="activity-item">
                    <div class="activity-icon"><i class="fas ${m.tipo === 'Entrada' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i></div>
                    <div class="activity-details">
                        <div class="activity-title">${escapeHtml(m.tipo)}</div>
                        <div class="activity-date">${m.cantidad} x ${escapeHtml(m.equipo_nombre || 'Equipo')}</div>
                    </div>
                    <div class="activity-date">${new Date(m.fecha).toLocaleDateString()}</div>
                </div>
            `).join('');
        } else {
            activityDiv.innerHTML = '<div class="empty-state">Sin actividad reciente</div>';
        }
    } catch (error) {
        console.error(error);
    }
}

function toggleEdit(editMode) {
    isEditing = editMode;
    const editBtn = document.getElementById('editProfileBtn');
    const saveBtn = document.getElementById('saveProfileBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');

    if (!displayNombre || !editNombre || !displayTelefono || !editTelefono || !displayDepartamento || !editDepartamento) {
        console.error('Elementos de edición no encontrados');
        return;
    }

    if (editMode) {
        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
        displayNombre.style.display = 'none';
        editNombre.style.display = 'block';
        displayTelefono.style.display = 'none';
        editTelefono.style.display = 'block';
        displayDepartamento.style.display = 'none';
        editDepartamento.style.display = 'block';
    } else {
        editBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        displayNombre.style.display = 'block';
        editNombre.style.display = 'none';
        displayTelefono.style.display = 'block';
        editTelefono.style.display = 'none';
        displayDepartamento.style.display = 'block';
        editDepartamento.style.display = 'none';
    }
}

async function saveProfile() {
    const nombre = editNombre ? editNombre.value.trim() : currentUser.nombre;
    const telefono = editTelefono ? editTelefono.value : '';
    const area_departamento = editDepartamento ? editDepartamento.value : '';

    if (!nombre) {
        showToast('El nombre es requerido', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth/perfil`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ nombre, telefono, area_departamento })
        });
        const data = await res.json();
        if (data.success) {
            currentUser.nombre = nombre;
            currentUser.telefono = telefono;
            currentUser.area_departamento = area_departamento;
            renderProfile();
            toggleEdit(false);
            updateLocalStorage();
            showToast('Perfil actualizado', 'success');
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Error al guardar', 'error');
    }
}

async function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
        const res = await fetch(`${API_URL}/auth/avatar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` },
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            // Construir URL absoluta del backend
            const baseUrl = API_URL.replace('/api', ''); // http://localhost:5000
            const avatarUrl = `${baseUrl}${data.avatar_url}`;
            currentUser.avatar_url = avatarUrl;
            renderProfile();
            updateLocalStorage();
            showToast('Foto actualizada', 'success');
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Error al subir imagen', 'error');
    }
}

function updateLocalStorage() {
    const stored = getCurrentUser();
    if (stored) {
        stored.nombre = currentUser.nombre;
        stored.telefono = currentUser.telefono;
        stored.area_departamento = currentUser.area_departamento;
        stored.avatar_url = currentUser.avatar_url;
        localStorage.setItem('user', JSON.stringify(stored));
        updateSidebarUser();
    }
}

// --- Cambio de contraseña ---
function openPasswordModal() {
    let modal = document.getElementById('passwordModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'passwordModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header"><h2><i class="fas fa-key"></i> Cambiar Contraseña</h2><button class="modal-close" id="closePasswordModal">&times;</button></div>
                <div class="modal-body">
                    <div class="form-field"><label>Contraseña Actual</label><input type="password" id="currentPassword" required></div>
                    <div class="form-field"><label>Nueva Contraseña</label><input type="password" id="newPassword" required></div>
                    <div class="form-field"><label>Confirmar</label><input type="password" id="confirmPassword" required></div>
                </div>
                <div class="modal-footer"><button id="cancelPasswordBtn" class="btn-cancel">Cancelar</button><button id="confirmPasswordBtn" class="btn-save">Cambiar</button></div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('closePasswordModal').onclick = closePasswordModal;
        document.getElementById('cancelPasswordBtn').onclick = closePasswordModal;
        document.getElementById('confirmPasswordBtn').onclick = changePassword;
    }
    modal.classList.add('active');
}

function closePasswordModal() {
    const modal = document.getElementById('passwordModal');
    if (modal) modal.classList.remove('active');
    ['currentPassword', 'newPassword', 'confirmPassword'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

async function changePassword() {
    const current = document.getElementById('currentPassword')?.value || '';
    const newPass = document.getElementById('newPassword')?.value || '';
    const confirm = document.getElementById('confirmPassword')?.value || '';
    if (!current || !newPass || !confirm) return showToast('Complete todos los campos', 'error');
    if (newPass !== confirm) return showToast('Las contraseñas no coinciden', 'error');
    if (newPass.length < 6) return showToast('Mínimo 6 caracteres', 'error');
    try {
        const res = await fetch(`${API_URL}/auth/cambiar-password`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ currentPassword: current, newPassword: newPass })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Contraseña cambiada', 'success');
            closePasswordModal();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Error', 'error');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `position:fixed; bottom:20px; right:20px; background:${type==='success'?'#10b981':'#ef4444'}; color:white; padding:12px 24px; border-radius:12px; z-index:9999;`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}