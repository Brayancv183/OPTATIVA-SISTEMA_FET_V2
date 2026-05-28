// Configuración
let currentPage = 1;
let totalPages = 1;
let currentFilters = { estado: '', prioridad: '' };
let allAlertas = [];

// DOM Elements
const alertasTableBody = document.getElementById('alertasTableBody');
const searchInput = document.getElementById('searchAlertaInput');
const prioridadFilter = document.getElementById('prioridadFilter');
const estadoAlertaFilter = document.getElementById('estadoAlertaFilter');
const paginationInfo = document.getElementById('paginationInfo');
const paginationButtons = document.getElementById('paginationButtons');

// Cargar datos
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    if (estadoAlertaFilter) {
        estadoAlertaFilter.value = 'Activa';
    }
    await loadStats();
    await loadAlertas();
    setupEventListeners();
});

function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentPage = 1;
            filterAlertas();
        });
    }
    if (prioridadFilter) {
        prioridadFilter.addEventListener('change', () => {
            currentPage = 1;
            filterAlertas();
        });
    }
    if (estadoAlertaFilter) {
        estadoAlertaFilter.addEventListener('change', () => {
            currentPage = 1;
            filterAlertas();
        });
    }
    
    // Logout
    document.getElementById('logout-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
}

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/alertas/stats`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            document.getElementById('totalAlertas').textContent = data.stats.totalAlertas || 0;
            document.getElementById('alertasCriticas').textContent = data.stats.alertasCriticas || 0;
            document.getElementById('alertasMediaAlta').textContent = data.stats.alertasMediaAlta || 0;
            document.getElementById('alertasAtendidas').textContent = data.stats.alertasAtendidas || 0;
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

async function loadAlertas() {
    try {
        const response = await fetch(`${API_URL}/alertas`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            allAlertas = data.alertas;
            filterAlertas();
        }
    } catch (error) {
        console.error('Error cargando alertas:', error);
        showToast('Error al cargar alertas', 'error');
    }
}

function filterAlertas() {
    let filtered = [...allAlertas];
    
    const searchTerm = searchInput?.value.toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(a => 
            a.equipo_nombre?.toLowerCase().includes(searchTerm) ||
            a.categoria?.toLowerCase().includes(searchTerm)
        );
    }
    
    const prioridad = prioridadFilter?.value || '';
    if (prioridad) {
        filtered = filtered.filter(a => a.prioridad === prioridad);
    }
    
    const estado = estadoAlertaFilter?.value || '';
    if (estado) {
        filtered = filtered.filter(a => a.estado === estado);
    }
    
    totalPages = Math.ceil(filtered.length / 10);
    const start = (currentPage - 1) * 10;
    const paginated = filtered.slice(start, start + 10);
    
    renderTable(paginated);
    updatePagination(filtered.length, currentPage, totalPages);
}

function renderTable(alertas) {
    if (!alertasTableBody) return;
    
    if (alertas.length === 0) {
        alertasTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay alertas registradas</td></tr>';
        return;
    }
    
    alertasTableBody.innerHTML = alertas.map(a => {
        let prioridadClass = '';
        if (a.prioridad === 'Crítica') prioridadClass = 'prioridad-critica';
        else if (a.prioridad === 'Alta') prioridadClass = 'prioridad-alta';
        else if (a.prioridad === 'Media') prioridadClass = 'prioridad-media';
        else prioridadClass = 'prioridad-baja';
        
        let estadoClass = a.estado === 'Activa' ? 'estado-activa' : 'estado-atendida';
        
        const nivelPorcentaje = Math.min(100, (a.stock_actual / a.stock_minimo) * 100);
        let nivelClass = 'critica';
        if (nivelPorcentaje > 75) nivelClass = 'baja';
        else if (nivelPorcentaje > 50) nivelClass = 'media';
        else if (nivelPorcentaje > 25) nivelClass = 'alta';
        else nivelClass = 'critica';
        
        return `
            <tr>
                <td><strong>${escapeHtml(a.equipo_nombre)}</strong><br><small>${a.equipo_codigo}</small></td>
                <td>${escapeHtml(a.categoria || '-')}</td>
                <td>
                    <div class="stock-info">
                        <span class="stock-actual">${a.stock_actual}</span>
                        <span class="stock-minimo">Mínimo: ${a.stock_minimo}</span>
                        <div class="nivel-bar">
                            <div class="nivel-fill ${nivelClass}" style="width: ${nivelPorcentaje}%"></div>
                        </div>
                    </div>
                </td>
                <td>${Math.round(nivelPorcentaje)}%</td>
                <td><span class="prioridad-badge ${prioridadClass}">${a.prioridad}</span></td>
                <td>${new Date(a.fecha_creacion).toLocaleDateString()}</td>
                <td><span class="estado-alerta ${estadoClass}">${a.estado}</span></td>
                <td class="action-icons-alerta">
                    ${a.estado === 'Activa' ? `<button class="btn-atender" data-id="${a.id}">Atender</button>` : ''}
                    <i class="fas fa-eye" data-id="${a.id}" title="Ver detalle"></i>
                </td>
            </tr>
        `;
    }).join('');
    
    document.querySelectorAll('.btn-atender').forEach(btn => {
        btn.addEventListener('click', () => attendAlerta(btn.dataset.id));
    });
    document.querySelectorAll('.fa-eye').forEach(icon => {
        icon.addEventListener('click', () => viewAlerta(icon.dataset.id));
    });
}

function updatePagination(total, page, totalPages) {
    if (paginationInfo) {
        paginationInfo.textContent = `Mostrando ${(page-1)*10+1} a ${Math.min(page*10, total)} de ${total} alertas`;
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
    filterAlertas();
}

async function attendAlerta(id) {
    try {
        const response = await fetch(`${API_URL}/alertas/${id}/attend`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (data.success) {
            showToast('Alerta atendida exitosamente', 'success');
            await loadStats();
            await loadAlertas();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Error atendiendo alerta:', error);
        showToast('Error al atender la alerta', 'error');
    }
}

async function viewAlerta(id) {
    showToast(`Detalles de alerta #${id}`, 'info');
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