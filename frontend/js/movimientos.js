// Configuración
let currentPage = 1;
let allMovimientos = [];
let itemsPerPage = 10;
let currentFilters = {
    tipo: '',
    estado: '',
    periodo: '7'
};

// DOM Elements
const movimientosTableBody = document.getElementById('movimientosTableBody');
const searchInput = document.getElementById('searchMovimientoInput');
const tipoFilter = document.getElementById('tipoMovimientoFilter');
const estadoFilter = document.getElementById('estadoMovimientoFilter');
const periodoFilter = document.getElementById('periodoFilter');
const paginationInfo = document.getElementById('paginationInfo');
const paginationButtons = document.getElementById('paginationButtons');
const newEntradaBtn = document.getElementById('newEntradaBtn');
const newSalidaBtn = document.getElementById('newSalidaBtn');
const modal = document.getElementById('movimientoModal');
const modalTitle = document.getElementById('modalTitle');
const movimientoForm = document.getElementById('movimientoForm');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const saveMovimientoBtn = document.getElementById('saveMovimientoBtn');

let currentTipoMovimiento = null;

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    
    // Mostrar usuario en sidebar
    const user = getCurrentUser();
    if (user) {
        const coordinatorName = document.querySelector('.coordinator-info p');
        if (coordinatorName) coordinatorName.textContent = user.nombre || 'Usuario';
    }
    
    await loadStats();
    await loadMovimientos();
    setupEventListeners();
    await loadEquiposForSelect();
});

// Cargar estadísticas
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/movimientos/stats`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('entradasHoy').textContent = data.stats.entradasHoy || 0;
            document.getElementById('salidasHoy').textContent = data.stats.salidasHoy || 0;
            document.getElementById('valorEntradas').textContent = `$${(data.stats.valorEntradas || 0).toLocaleString()}`;
            document.getElementById('movimientosPendientes').textContent = data.stats.movimientosPendientes || 0;
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// Cargar movimientos
async function loadMovimientos() {
    try {
        const params = new URLSearchParams();
        if (searchInput.value) params.append('search', searchInput.value);
        if (currentFilters.tipo) params.append('tipo', currentFilters.tipo);
        if (currentFilters.estado) params.append('estado', currentFilters.estado);
        if (currentFilters.periodo) params.append('periodo', currentFilters.periodo);
        
        const response = await fetch(`${API_URL}/movimientos?${params}`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        if (data.success) {
            allMovimientos = data.movimientos;
            renderMovimientos();
        }
    } catch (error) {
        console.error('Error cargando movimientos:', error);
        showToast('Error al cargar movimientos', 'error');
    }
}

// Renderizar tabla de movimientos
function renderMovimientos() {
    if (!movimientosTableBody) return;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const movimientosPage = allMovimientos.slice(start, end);
    
    const totalPages = Math.ceil(allMovimientos.length / itemsPerPage);
    if (paginationInfo) {
        paginationInfo.textContent = `Mostrando ${start + 1} a ${Math.min(end, allMovimientos.length)} de ${allMovimientos.length} movimientos`;
    }
    
    if (paginationButtons) {
        renderPaginationButtons(totalPages);
    }
    
    if (movimientosPage.length === 0) {
        movimientosTableBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No hay movimientos registrados</td></tr>';
        return;
    }
    
    movimientosTableBody.innerHTML = movimientosPage.map(mov => `
        <tr>
            <td>
                <span class="tipo-badge ${mov.tipo === 'Entrada' ? 'tipo-entrada' : 'tipo-salida'}">
                    <i class="fas ${mov.tipo === 'Entrada' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                    ${mov.tipo}
                </span>
            </td>
            <td>
                <div class="producto-info">
                    <span class="producto-nombre">${escapeHtml(mov.equipo_nombre)}</span>
                    <span class="producto-codigo">${escapeHtml(mov.equipo_codigo)}</span>
                </div>
            </td>
            <td>${mov.cantidad}</td>
            <td>${new Date(mov.fecha).toLocaleString()}</td>
            <td>${mov.usuario_nombre || '-'}</td>
            <td>${escapeHtml(mov.origen_destino || '-')}</td>
            <td>
                <div class="valor-info">
                    <span class="valor-total">$${mov.valor_total?.toLocaleString() || 0}</span>
                    <span class="valor-unitario">($${mov.valor_unitario_momento?.toLocaleString()}/unidad)</span>
                </div>
            </td>
            <td>
                <span class="estado-movimiento ${mov.estado === 'Completada' ? 'estado-completada' : 'estado-pendiente'}">
                    ${mov.estado}
                </span>
            </td>
            <td>
                <div class="action-icons-movimiento">
                    <i class="fas fa-eye" onclick="verMovimiento(${mov.id})" title="Ver detalles"></i>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderPaginationButtons(totalPages) {
    let buttons = '';
    buttons += `<button class="page-btn" onclick="changePageMovimientos(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            buttons += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePageMovimientos(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            buttons += `<button class="page-btn" disabled>...</button>`;
        }
    }
    
    buttons += `<button class="page-btn" onclick="changePageMovimientos(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>›</button>`;
    paginationButtons.innerHTML = buttons;
}

function changePageMovimientos(page) {
    if (page < 1 || page > Math.ceil(allMovimientos.length / itemsPerPage)) return;
    currentPage = page;
    renderMovimientos();
}

// Cargar equipos para el select del modal
async function loadEquiposForSelect() {
    try {
        const response = await fetch(`${API_URL}/equipos`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('movimiento_equipo');
            if (select) {
                select.innerHTML = '<option value="">Seleccione un equipo...</option>' +
                    data.equipos.map(eq => `<option value="${eq.id}" data-valor="${eq.valor_unitario}" data-stock="${eq.stock_actual}">${eq.nombre} (${eq.codigo}) - Stock: ${eq.stock_actual}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error cargando equipos:', error);
    }
}

// Configurar event listeners
function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentPage = 1;
            loadMovimientos();
        });
    }
    
    if (tipoFilter) {
        tipoFilter.addEventListener('change', () => {
            currentFilters.tipo = tipoFilter.value;
            currentPage = 1;
            loadMovimientos();
        });
    }
    
    if (estadoFilter) {
        estadoFilter.addEventListener('change', () => {
            currentFilters.estado = estadoFilter.value;
            currentPage = 1;
            loadMovimientos();
        });
    }
    
    if (periodoFilter) {
        periodoFilter.addEventListener('change', () => {
            currentFilters.periodo = periodoFilter.value;
            currentPage = 1;
            loadMovimientos();
        });
    }
    
    if (newEntradaBtn) {
        newEntradaBtn.addEventListener('click', () => openModal('Entrada'));
    }
    
    if (newSalidaBtn) {
        newSalidaBtn.addEventListener('click', () => openModal('Salida'));
    }
    
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
    if (saveMovimientoBtn) saveMovimientoBtn.addEventListener('click', saveMovimiento);
    
    // Actualizar valor unitario al seleccionar equipo
    const equipoSelect = document.getElementById('movimiento_equipo');
    if (equipoSelect) {
        equipoSelect.addEventListener('change', () => {
            const selected = equipoSelect.options[equipoSelect.selectedIndex];
            const valorUnitario = selected?.dataset?.valor || 0;
            const stock = selected?.dataset?.stock || 0;
            document.getElementById('movimiento_valor_unitario').value = valorUnitario;
            document.getElementById('stock_actual_info').textContent = `Stock actual: ${stock}`;
        });
    }
    
    // Logout
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}

// Abrir modal para nueva entrada/salida
function openModal(tipo) {
    if (!modal) return;
    
    currentTipoMovimiento = tipo;
    modalTitle.textContent = tipo === 'Entrada' ? 'Registrar Entrada' : 'Registrar Salida';
    
    // Resetear formulario
    movimientoForm.reset();
    document.getElementById('stock_actual_info').textContent = 'Stock actual: -';
    
    // Mostrar/ocultar campos según tipo
    document.querySelectorAll('.movimiento-field').forEach(f => f.style.display = '');
    
    modal.classList.add('active');
}

function closeModal() {
    if (modal) {
        modal.classList.remove('active');
        currentTipoMovimiento = null;
    }
}

// Guardar movimiento
async function saveMovimiento() {
    const equipoId = document.getElementById('movimiento_equipo')?.value;
    const cantidad = parseInt(document.getElementById('movimiento_cantidad')?.value);
    const valorUnitario = parseFloat(document.getElementById('movimiento_valor_unitario')?.value);
    const origenDestino = document.getElementById('movimiento_origen')?.value;
    const notas = document.getElementById('movimiento_notas')?.value;
    
    if (!equipoId) {
        showToast('Seleccione un equipo', 'error');
        return;
    }
    
    if (!cantidad || cantidad <= 0) {
        showToast('Ingrese una cantidad válida', 'error');
        return;
    }
    
    // Validar stock para salidas
    if (currentTipoMovimiento === 'Salida') {
        const select = document.getElementById('movimiento_equipo');
        const selected = select.options[select.selectedIndex];
        const stockActual = parseInt(selected?.dataset?.stock || 0);
        if (cantidad > stockActual) {
            showToast(`Stock insuficiente. Disponible: ${stockActual}`, 'error');
            return;
        }
    }
    
    const data = {
        equipo_id: parseInt(equipoId),
        cantidad: cantidad,
        valor_unitario: valorUnitario,
        origen_destino: origenDestino || null,
        notas: notas || null
    };
    
    const endpoint = currentTipoMovimiento === 'Entrada' ? '/movimientos/entrada' : '/movimientos/salida';
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(result.message, 'success');
            closeModal();
            await loadStats();
            await loadMovimientos();
            await loadEquiposForSelect(); // Recargar select para actualizar stock
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error guardando movimiento:', error);
        showToast('Error al registrar el movimiento', 'error');
    }
}

function verMovimiento(id) {
    // Implementar vista de detalle si es necesario
    showToast('Función en desarrollo', 'info');
}

// Helper: escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
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