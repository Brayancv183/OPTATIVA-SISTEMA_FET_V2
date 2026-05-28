// Configuración
let currentPage = 1;
let allProveedores = [];
let itemsPerPage = 5;

// DOM Elements
const proveedoresGrid = document.getElementById('proveedoresGrid');
const searchInput = document.getElementById('searchProveedorInput');
const paginationInfo = document.getElementById('paginationInfo');
const paginationButtons = document.getElementById('paginationButtons');
const newProveedorBtn = document.getElementById('newProveedorBtn');
const modal = document.getElementById('proveedorModal');
const modalTitle = document.getElementById('modalTitle');
const proveedorForm = document.getElementById('proveedorForm');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const saveProveedorBtn = document.getElementById('saveProveedorBtn');

let currentProveedorId = null;

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    await loadStats();
    await loadProveedores();
    setupEventListeners();
});

// Cargar estadísticas
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/proveedores/stats`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('totalProveedores').textContent = data.stats.totalProveedores || 0;
            document.getElementById('proveedoresActivos').textContent = `${data.stats.proveedoresActivos || 0} activos`;
            document.getElementById('comprasTotales').textContent = `$${(data.stats.comprasTotales || 0).toLocaleString()}`;
            document.getElementById('ordenesActivas').textContent = data.stats.ordenesActivas || 0;
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// Cargar proveedores
async function loadProveedores() {
    try {
        const search = searchInput ? searchInput.value : '';
        const url = new URL(`${API_URL}/proveedores`);
        if (search) url.searchParams.append('search', search);
        
        const response = await fetch(url, { headers: getAuthHeaders() });
        const data = await response.json();
        
        if (data.success) {
            allProveedores = data.proveedores;
            renderProveedores();
        }
    } catch (error) {
        console.error('Error cargando proveedores:', error);
        showToast('Error al cargar proveedores', 'error');
    }
}

// Renderizar proveedores
function renderProveedores() {
    if (!proveedoresGrid) return;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const proveedoresPage = allProveedores.slice(start, end);
    
    // Actualizar paginación
    const totalPages = Math.ceil(allProveedores.length / itemsPerPage);
    if (paginationInfo) {
        paginationInfo.textContent = `Mostrando ${start + 1} a ${Math.min(end, allProveedores.length)} de ${allProveedores.length} proveedores`;
    }
    
    if (paginationButtons) {
        renderPaginationButtons(totalPages);
    }
    
    // Renderizar grid
    if (proveedoresPage.length === 0) {
        proveedoresGrid.innerHTML = '<div class="empty-state">No hay proveedores registrados</div>';
        return;
    }
    
    proveedoresGrid.innerHTML = proveedoresPage.map(proveedor => `
        <div class="proveedor-card">
            <div class="proveedor-info-principal">
                <div class="proveedor-icono">
                    <i class="fas fa-truck"></i>
                </div>
                <div class="proveedor-nombre-dir">
                    <h3>${escapeHtml(proveedor.nombre)}</h3>
                    <div class="proveedor-contacto">
                        ${proveedor.contacto_nombre ? `<span><i class="fas fa-user"></i> ${escapeHtml(proveedor.contacto_nombre)}</span>` : ''}
                        ${proveedor.telefono ? `<span><i class="fas fa-phone"></i> ${escapeHtml(proveedor.telefono)}</span>` : ''}
                        ${proveedor.email ? `<span><i class="fas fa-envelope"></i> ${escapeHtml(proveedor.email)}</span>` : ''}
                    </div>
                    ${proveedor.direccion ? `<div class="proveedor-descripcion"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(proveedor.direccion)}</div>` : ''}
                </div>
            </div>
            <div class="proveedor-actions">
                <i class="fas fa-edit" onclick="editProveedor(${proveedor.id})" title="Editar"></i>
                <i class="fas fa-trash-alt" onclick="deleteProveedor(${proveedor.id})" title="Eliminar"></i>
            </div>
        </div>
    `).join('');
}

// Renderizar botones de paginación
function renderPaginationButtons(totalPages) {
    let buttons = '';
    buttons += `<button class="page-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            buttons += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            buttons += `<button class="page-btn" disabled>...</button>`;
        }
    }
    
    buttons += `<button class="page-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>›</button>`;
    paginationButtons.innerHTML = buttons;
}

function changePage(page) {
    if (page < 1 || page > Math.ceil(allProveedores.length / itemsPerPage)) return;
    currentPage = page;
    renderProveedores();
}

// Configurar event listeners
function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentPage = 1;
            loadProveedores();
        });
    }
    
    if (newProveedorBtn) {
        newProveedorBtn.addEventListener('click', () => openModal());
    }
    
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
    if (saveProveedorBtn) saveProveedorBtn.addEventListener('click', saveProveedor);
    
    // Logout
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}

// Abrir modal para crear/editar
function openModal(proveedor = null) {
    if (!modal) return;
    
    if (proveedor) {
        modalTitle.textContent = 'Editar Proveedor';
        document.getElementById('proveedor_nombre').value = proveedor.nombre || '';
        document.getElementById('proveedor_contacto').value = proveedor.contacto_nombre || '';
        document.getElementById('proveedor_telefono').value = proveedor.telefono || '';
        document.getElementById('proveedor_email').value = proveedor.email || '';
        document.getElementById('proveedor_direccion').value = proveedor.direccion || '';
        currentProveedorId = proveedor.id;
    } else {
        modalTitle.textContent = 'Nuevo Proveedor';
        proveedorForm.reset();
        currentProveedorId = null;
    }
    
    modal.classList.add('active');
}

function closeModal() {
    if (modal) {
        modal.classList.remove('active');
        currentProveedorId = null;
        proveedorForm.reset();
    }
}

// Guardar proveedor
async function saveProveedor() {
    const proveedorData = {
        nombre: document.getElementById('proveedor_nombre')?.value,
        contacto_nombre: document.getElementById('proveedor_contacto')?.value,
        telefono: document.getElementById('proveedor_telefono')?.value,
        email: document.getElementById('proveedor_email')?.value,
        direccion: document.getElementById('proveedor_direccion')?.value
    };
    
    if (!proveedorData.nombre) {
        showToast('El nombre del proveedor es requerido', 'error');
        return;
    }
    
    try {
        const url = currentProveedorId 
            ? `${API_URL}/proveedores/${currentProveedorId}`
            : `${API_URL}/proveedores`;
        const method = currentProveedorId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify(proveedorData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            closeModal();
            await loadProveedores();
            await loadStats();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Error guardando proveedor:', error);
        showToast('Error al guardar el proveedor', 'error');
    }
}

// Editar proveedor
function editProveedor(id) {
    const proveedor = allProveedores.find(p => p.id === id);
    if (proveedor) {
        openModal(proveedor);
    }
}

// Eliminar proveedor
async function deleteProveedor(id) {
    if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;
    
    try {
        const response = await fetch(`${API_URL}/proveedores/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            await loadProveedores();
            await loadStats();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Error eliminando proveedor:', error);
        showToast('Error al eliminar el proveedor', 'error');
    }
}

// Helper: escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 12px 24px;
        border-radius: 12px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}