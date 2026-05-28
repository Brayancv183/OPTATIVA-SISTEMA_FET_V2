// Configuración
let currentPage = 1;
let totalPages = 1;
let currentFilters = { estado: 'todos', search: '' };

// DOM Elements
const prestamosTableBody = document.getElementById('prestamosTableBody');
const searchInput = document.getElementById('searchPrestamoInput');
const filterButtons = document.querySelectorAll('.filter-btn');
const paginationInfo = document.getElementById('paginationInfo');
const paginationButtons = document.getElementById('paginationButtons');
const prestamosActivosSpan = document.getElementById('prestamosActivos');
const prestamosVencidosSpan = document.getElementById('prestamosVencidos');
const totalPrestamosSpan = document.getElementById('totalPrestamos');
const devueltosMesSpan = document.getElementById('devueltosMes');

// Cargar datos
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    await loadStats();
    await loadPrestamos();
    setupEventListeners();
});

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/prestamos/stats`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.success) {
            prestamosActivosSpan.textContent = data.stats.prestamosActivos || 0;
            prestamosVencidosSpan.textContent = data.stats.prestamosVencidos || 0;
            totalPrestamosSpan.textContent = data.stats.totalPrestamos || 0;
            devueltosMesSpan.textContent = data.stats.devueltosMes || 0;
        } else {
            console.error('Error en stats:', data.message);
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        showToast('Error de conexión al cargar estadísticas', 'error');
    }
}

async function loadPrestamos() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: 10,
            estado: currentFilters.estado,
            search: currentFilters.search
        });
        const response = await fetch(`${API_URL}/prestamos?${params}`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.success) {
            totalPages = data.totalPages;
            renderTable(data.prestamos);
            updatePagination(data.total, data.page, data.totalPages);
        } else {
            console.error('Error en prestamos:', data.message);
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Error cargando préstamos:', error);
        showToast('Error de conexión al cargar préstamos', 'error');
    }
}

function renderTable(prestamos) {
    if (!prestamosTableBody) return;
    if (prestamos.length === 0) {
        prestamosTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay préstamos registrados</td></tr>';
        return;
    }
    prestamosTableBody.innerHTML = prestamos.map(p => {
        let estadoClass = '';
        if (p.estado === 'Activo') estadoClass = 'estado-activo';
        else if (p.estado === 'Vencido') estadoClass = 'estado-vencido';
        else if (p.estado === 'Devuelto') estadoClass = 'estado-devuelto';
        else estadoClass = 'estado-danado';
        
        const isActive = p.estado === 'Activo' || p.estado === 'Vencido';
        return `
            <tr>
                <td>${p.id}</td>
                <td><strong>${escapeHtml(p.equipo_nombre)}</strong><br><small>${p.equipo_codigo}</small></td>
                <td>${escapeHtml(p.solicitante_nombre)}${p.solicitante_identificacion ? `<br><small>ID: ${p.solicitante_identificacion}</small>` : ''}</td>
                <td>${new Date(p.fecha_prestamo).toLocaleDateString()}</td>
                <td>${new Date(p.fecha_devolucion_esperada).toLocaleDateString()}</td>
                <td><span class="estado-badge ${estadoClass}">${p.estado}</span></td>
                <td>${p.condicion_entrega ? `<span class="condicion-badge">${escapeHtml(p.condicion_entrega)}</span>` : '-'}</td>
                <td class="action-buttons">
                    ${isActive ? `<button class="btn-action btn-devolver" data-id="${p.id}">Devolver</button>` : ''}
                    <button class="btn-action btn-detalles" data-id="${p.id}">Ver</button>
                </td>
            </tr>
        `;
    }).join('');
    
    document.querySelectorAll('.btn-devolver').forEach(btn => {
        btn.addEventListener('click', () => openReturnModal(btn.dataset.id));
    });
    document.querySelectorAll('.btn-detalles').forEach(btn => {
        btn.addEventListener('click', () => viewPrestamo(btn.dataset.id));
    });
}

function updatePagination(total, page, totalPages) {
    if (paginationInfo) {
        paginationInfo.textContent = `Mostrando ${(page-1)*10+1} a ${Math.min(page*10, total)} de ${total} préstamos`;
    }
    if (paginationButtons) {
        let buttons = '';
        buttons += `<button class="page-btn" onclick="changePage(${page-1})" ${page === 1 ? 'disabled' : ''}>‹</button>`;
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= page-2 && i <= page+2)) {
                buttons += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
            } else if (i === page-3 || i === page+3) {
                buttons += `<button class="page-btn" disabled>...</button>`;
            }
        }
        buttons += `<button class="page-btn" onclick="changePage(${page+1})" ${page === totalPages ? 'disabled' : ''}>›</button>`;
        paginationButtons.innerHTML = buttons;
    }
}

function changePage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadPrestamos();
}

function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentFilters.search = searchInput.value;
            currentPage = 1;
            loadPrestamos();
        });
    }
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilters.estado = btn.dataset.filter;
            currentPage = 1;
            loadPrestamos();
        });
    });
    const newPrestamoBtn = document.getElementById('newPrestamoBtn');
    if (newPrestamoBtn) newPrestamoBtn.addEventListener('click', openNewPrestamoModal);
    
    const closeModalBtn = document.getElementById('closePrestamoModal');
    const cancelModalBtn = document.getElementById('cancelPrestamoModal');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closePrestamoModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closePrestamoModal);
    
    const savePrestamoBtn = document.getElementById('savePrestamoBtn');
    if (savePrestamoBtn) savePrestamoBtn.addEventListener('click', savePrestamo);
    
    const closeReturnModalBtn = document.getElementById('closeReturnModal');
    const cancelReturnBtn = document.getElementById('cancelReturnBtn');
    if (closeReturnModalBtn) closeReturnModalBtn.addEventListener('click', closeReturnModal);
    if (cancelReturnBtn) cancelReturnBtn.addEventListener('click', closeReturnModal);
    
    const confirmReturnBtn = document.getElementById('confirmReturnBtn');
    if (confirmReturnBtn) confirmReturnBtn.addEventListener('click', confirmReturn);
    
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) logoutLink.addEventListener('click', (e) => { e.preventDefault(); logout(); });
}

let currentPrestamoId = null;

async function openNewPrestamoModal() {
    const equipoSelect = document.getElementById('prestamo_equipo_id');
    if (equipoSelect) {
        try {
            const response = await fetch(`${API_URL}/equipos`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (data.success) {
                const equiposDisponibles = data.equipos.filter(e => e.stock_actual > 0);
                equipoSelect.innerHTML = '<option value="">Seleccione un equipo...</option>' +
                    equiposDisponibles.map(e => `<option value="${e.id}">${escapeHtml(e.nombre)} (Stock: ${e.stock_actual})</option>`).join('');
            }
        } catch (error) {
            console.error('Error cargando equipos:', error);
        }
    }
    document.getElementById('prestamoForm').reset();
    document.getElementById('prestamoModal').classList.add('active');
}

function closePrestamoModal() {
    document.getElementById('prestamoModal').classList.remove('active');
}

async function savePrestamo() {
    const equipo_id = document.getElementById('prestamo_equipo_id').value;
    // IMPORTANTE: el ID en HTML es 'prestamo_solicitante_nombre'
    const solicitante_nombre = document.getElementById('prestamo_solicitante_nombre').value;
    const solicitante_identificacion = document.getElementById('prestamo_identificacion').value;
    const solicitante_email = document.getElementById('prestamo_email').value;
    const fecha_prestamo = document.getElementById('prestamo_fecha_prestamo').value;
    const fecha_devolucion = document.getElementById('prestamo_fecha_devolucion').value;
    const condicion_entrega = document.getElementById('prestamo_condicion').value;
    
    if (!equipo_id || !solicitante_nombre || !fecha_prestamo || !fecha_devolucion) {
        showToast('Complete los campos obligatorios', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/prestamos`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                equipo_id, 
                solicitante_nombre, 
                solicitante_identificacion,
                solicitante_email, 
                fecha_prestamo, 
                fecha_devolucion_esperada: fecha_devolucion,
                condicion_entrega
            })
        });
        const data = await response.json();
        if (data.success) {
            showToast('Préstamo registrado exitosamente', 'success');
            closePrestamoModal();
            await loadStats();
            await loadPrestamos();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Error guardando préstamo:', error);
        showToast('Error al registrar préstamo', 'error');
    }
}

function openReturnModal(id) {
    currentPrestamoId = id;
    document.getElementById('returnModal').classList.add('active');
}

function closeReturnModal() {
    document.getElementById('returnModal').classList.remove('active');
    currentPrestamoId = null;
}

async function confirmReturn() {
    const condicion = document.getElementById('return_condicion').value;
    if (!condicion) {
        showToast('Ingrese la condición del equipo devuelto', 'error');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/prestamos/${currentPrestamoId}/devolver`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ condicion_recibido: condicion })
        });
        const data = await response.json();
        if (data.success) {
            showToast('Devolución registrada exitosamente', 'success');
            closeReturnModal();
            await loadStats();
            await loadPrestamos();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Error registrando devolución:', error);
        showToast('Error al registrar devolución', 'error');
    }
}

function viewPrestamo(id) {
    showToast(`Detalles del préstamo #${id}`, 'info');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white; padding: 12px 24px; border-radius: 12px; z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}