// Configuración
let currentPage = 1;
let totalPages = 1;
let currentFilters = { estado: '', prioridad: '', search: '' };
let solicitudItems = [];
let currentApproveId = null;

// DOM Elements
const solicitudesTableBody = document.getElementById('solicitudesTableBody');
const searchInput = document.getElementById('searchSolicitudInput');
const estadoFilter = document.getElementById('estadoSolicitudFilter');
const prioridadFilter = document.getElementById('prioridadSolicitudFilter');
const paginationInfo = document.getElementById('paginationInfo');
const paginationButtons = document.getElementById('paginationButtons');

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    await loadStats();
    await loadSolicitudes();
    setupEventListeners();
});

// Cargar estadísticas
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/solicitudes/stats`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            document.getElementById('totalSolicitudes').textContent = data.stats.totalSolicitudes || 0;
            document.getElementById('solicitudesPendientes').textContent = data.stats.solicitudesPendientes || 0;
            document.getElementById('solicitudesAprobadas').textContent = data.stats.solicitudesAprobadas || 0;
            document.getElementById('valorTotalSolicitudes').textContent = `$${(data.stats.valorTotalSolicitudes || 0).toLocaleString()}`;
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// Cargar solicitudes
async function loadSolicitudes() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: 10,
            estado: currentFilters.estado,
            prioridad: currentFilters.prioridad,
            search: currentFilters.search
        });
        const response = await fetch(`${API_URL}/solicitudes?${params}`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            totalPages = data.totalPages;
            renderTable(data.solicitudes);
            updatePagination(data.total, data.page, data.totalPages);
        }
    } catch (error) {
        console.error('Error cargando solicitudes:', error);
        showToast('Error al cargar solicitudes', 'error');
    }
}

// Renderizar tabla
function renderTable(solicitudes) {
    if (!solicitudesTableBody) return;
    
    if (solicitudes.length === 0) {
        solicitudesTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay solicitudes registradas</td></tr>';
        return;
    }
    
    solicitudesTableBody.innerHTML = solicitudes.map(s => {
        let estadoClass = s.estado === 'Pendiente' ? 'estado-pendiente' : 
                         (s.estado === 'Aprobada' ? 'estado-aprobada' : 
                         (s.estado === 'Rechazada' ? 'estado-rechazada' : 'estado-proceso'));
        let prioridadClass = s.prioridad === 'Alta' ? 'prioridad-alta' : 
                            (s.prioridad === 'Media' ? 'prioridad-media' : 'prioridad-baja');
        const isPending = s.estado === 'Pendiente';
        
        return `
            <tr>
                <td><div class="solicitud-info"><span class="solicitud-titulo">${escapeHtml(s.codigo_solicitud)}</span><span class="solicitud-fecha">${new Date(s.created_at).toLocaleDateString()}</span></div></td>
                <td>${escapeHtml(s.solicitante_nombre)}</td>
                <td>${escapeHtml(s.dependencia || '-')}</td>
                <td>${s.total_items || 0} items</td>
                <td>$${(s.valor_total_estimado || 0).toLocaleString()}</td>
                <td><div class="aprobaciones"><span class="aprobacion-item ${s.estado === 'Aprobada' ? 'aprobado' : 'pendiente'}"><i class="fas ${s.estado === 'Aprobada' ? 'fa-check-circle' : 'fa-clock'}"></i> ${s.aprobador_nombre || 'Pendiente'}</span></div></td>
                <td><span class="estado-solicitud ${estadoClass}">${s.estado}</span><br><span class="prioridad-solicitud ${prioridadClass}">${s.prioridad}</span></td>
                <td class="action-icons-solicitud">
                    ${isPending ? `<button class="btn-aprobar" data-id="${s.id}">Aprobar</button>
                                   <button class="btn-rechazar" data-id="${s.id}">Rechazar</button>` : ''}
                    <i class="fas fa-eye" data-id="${s.id}" title="Ver detalle"></i>
                </td>
            </tr>
        `;
    }).join('');
    
    // Asignar eventos a botones dinámicos
    document.querySelectorAll('.btn-aprobar').forEach(btn => {
        btn.addEventListener('click', () => approveSolicitud(btn.dataset.id));
    });
    document.querySelectorAll('.btn-rechazar').forEach(btn => {
        btn.addEventListener('click', () => rejectSolicitud(btn.dataset.id));
    });
    document.querySelectorAll('.fa-eye').forEach(icon => {
        icon.addEventListener('click', () => viewSolicitud(icon.dataset.id));
    });
}

// Actualizar paginación
function updatePagination(total, page, totalPages) {
    if (paginationInfo) {
        paginationInfo.textContent = `Mostrando ${(page-1)*10+1} a ${Math.min(page*10, total)} de ${total} solicitudes`;
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
    loadSolicitudes();
}

// Configurar event listeners
function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentFilters.search = searchInput.value;
            currentPage = 1;
            loadSolicitudes();
        });
    }
    if (estadoFilter) {
        estadoFilter.addEventListener('change', () => {
            currentFilters.estado = estadoFilter.value;
            currentPage = 1;
            loadSolicitudes();
        });
    }
    if (prioridadFilter) {
        prioridadFilter.addEventListener('change', () => {
            currentFilters.prioridad = prioridadFilter.value;
            currentPage = 1;
            loadSolicitudes();
        });
    }
    
    document.getElementById('newSolicitudBtn')?.addEventListener('click', openNewSolicitudModal);
    
    // Modal de nueva solicitud
    document.getElementById('closeSolicitudModal')?.addEventListener('click', closeSolicitudModal);
    document.getElementById('cancelSolicitudModal')?.addEventListener('click', closeSolicitudModal);
    document.getElementById('addItemBtn')?.addEventListener('click', addSolicitudItem);
    document.getElementById('saveSolicitudBtn')?.addEventListener('click', saveSolicitud);
    
    // Modal de aprobación
    document.getElementById('closeApproveModal')?.addEventListener('click', closeApproveModal);
    document.getElementById('cancelApproveBtn')?.addEventListener('click', closeApproveModal);
    document.getElementById('confirmApproveBtn')?.addEventListener('click', confirmApprove);
    
    // Logout
    document.getElementById('logout-link')?.addEventListener('click', (e) => { 
        e.preventDefault(); 
        logout(); 
    });
}

// ============================================
// FUNCIONES PARA NUEVA SOLICITUD
// ============================================
async function openNewSolicitudModal() {
    solicitudItems = [];
    renderItemsList();
    document.getElementById('solicitudForm').reset();
    document.getElementById('solicitudModal').classList.add('active');
    
    // Cargar equipos para el select
    const equipoSelect = document.getElementById('solicitud_equipo_id');
    if (equipoSelect) {
        try {
            const response = await fetch(`${API_URL}/equipos`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (data.success) {
                equipoSelect.innerHTML = '<option value="">Seleccione un equipo...</option>' +
                    data.equipos.map(e => `<option value="${e.id}" data-stock="${e.stock_actual}">${escapeHtml(e.nombre)} (Stock: ${e.stock_actual})</option>`).join('');
            }
        } catch (error) {
            console.error('Error cargando equipos:', error);
        }
    }
}

function closeSolicitudModal() {
    document.getElementById('solicitudModal').classList.remove('active');
}

function addSolicitudItem() {
    const equipoSelect = document.getElementById('solicitud_equipo_id');
    const cantidad = parseInt(document.getElementById('solicitud_cantidad').value);
    const equipoId = equipoSelect.value;
    const equipoNombre = equipoSelect.options[equipoSelect.selectedIndex]?.text;
    
    if (!equipoId || !cantidad || cantidad <= 0) {
        showToast('Seleccione un equipo y una cantidad válida', 'error');
        return;
    }
    
    solicitudItems.push({ 
        equipo_id: parseInt(equipoId), 
        equipo_nombre: equipoNombre, 
        cantidad_solicitada: cantidad 
    });
    renderItemsList();
    equipoSelect.value = '';
    document.getElementById('solicitud_cantidad').value = '';
}

function renderItemsList() {
    const container = document.getElementById('solicitudItemsList');
    if (!container) return;
    
    if (solicitudItems.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay equipos agregados</p>';
        return;
    }
    
    container.innerHTML = solicitudItems.map((item, idx) => `
        <div class="item-row">
            <span>${escapeHtml(item.equipo_nombre)}</span>
            <span>Cantidad: ${item.cantidad_solicitada}</span>
            <i class="fas fa-trash-alt" onclick="removeItem(${idx})"></i>
        </div>
    `).join('');
}

function removeItem(idx) {
    solicitudItems.splice(idx, 1);
    renderItemsList();
}

async function saveSolicitud() {
    const solicitante_nombre = document.getElementById('solicitud_solicitante').value;
    const dependencia = document.getElementById('solicitud_dependencia').value;
    const fecha_solicitud = document.getElementById('solicitud_fecha').value;
    const fecha_necesidad = document.getElementById('solicitud_fecha_necesidad').value;
    const prioridad = document.getElementById('solicitud_prioridad').value;
    
    if (!solicitante_nombre || solicitudItems.length === 0) {
        showToast('Complete los datos obligatorios', 'error');
        return;
    }
    
    const valor_total_estimado = solicitudItems.reduce((sum, item) => sum + (item.cantidad_solicitada * 100000), 0);
    
    try {
        const response = await fetch(`${API_URL}/solicitudes`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                solicitante_nombre, 
                dependencia, 
                fecha_solicitud, 
                fecha_necesidad, 
                prioridad,
                valor_total_estimado, 
                detalles: solicitudItems
            })
        });
        const data = await response.json();
        if (data.success) {
            showToast('Solicitud creada exitosamente', 'success');
            closeSolicitudModal();
            await loadStats();
            await loadSolicitudes();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Error guardando solicitud:', error);
        showToast('Error al guardar la solicitud', 'error');
    }
}

// ============================================
// FUNCIONES PARA APROBAR/RECHAZAR
// ============================================
async function approveSolicitud(id) {
    currentApproveId = id;
    document.getElementById('approveModal').classList.add('active');
}

function closeApproveModal() {
    document.getElementById('approveModal').classList.remove('active');
    currentApproveId = null;
}

async function confirmApprove() {
    try {
        const response = await fetch(`${API_URL}/solicitudes/${currentApproveId}/approve`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (data.success) {
            showToast('Solicitud aprobada exitosamente', 'success');
            closeApproveModal();
            await loadStats();
            await loadSolicitudes();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Error aprobando solicitud:', error);
        showToast('Error al aprobar la solicitud', 'error');
    }
}

async function rejectSolicitud(id) {
    if (!confirm('¿Estás seguro de rechazar esta solicitud?')) return;
    try {
        const response = await fetch(`${API_URL}/solicitudes/${id}/reject`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (data.success) {
            showToast('Solicitud rechazada', 'success');
            await loadStats();
            await loadSolicitudes();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Error rechazando solicitud:', error);
        showToast('Error al rechazar la solicitud', 'error');
    }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================
async function viewSolicitud(id) {
    try {
        const response = await fetch(`${API_URL}/solicitudes/${id}`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            const s = data.solicitud;
            const detallesText = s.detalles?.map(d => 
                `${escapeHtml(d.equipo_nombre)} - Solicitado: ${d.cantidad_solicitada}, Aprobado: ${d.cantidad_aprobada || 0}`
            ).join('\n') || 'Sin detalles';
            const estado = s.estado === 'Aprobada' ? '✅ Aprobada' : 
                          (s.estado === 'Rechazada' ? '❌ Rechazada' : '⏳ Pendiente');
            alert(`Solicitud: ${escapeHtml(s.codigo_solicitud)}\n\nSolicitante: ${escapeHtml(s.solicitante_nombre)}\nDependencia: ${escapeHtml(s.dependencia || '-')}\nFecha: ${new Date(s.created_at).toLocaleDateString()}\nPrioridad: ${escapeHtml(s.prioridad)}\nEstado: ${estado}\nValor estimado: $${(s.valor_total_estimado || 0).toLocaleString()}\n\nEquipos Solicitados:\n${detallesText}`);
        } else {
            showToast(data.message || 'Solicitud no encontrada', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al cargar solicitud', 'error');
    }
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