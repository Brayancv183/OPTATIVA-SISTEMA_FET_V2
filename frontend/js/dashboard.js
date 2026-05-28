document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    await loadDashboardData();
    setupEventListeners();
});

async function loadDashboardData() {
    try {
        const response = await fetch(`${API_URL}/dashboard`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();
        
        if (!result.success) {
            console.error('Error al cargar dashboard:', result.message);
            showToast('Error al cargar datos del dashboard', 'error');
            return;
        }
        
        const data = result.data;
        
        // Actualizar KPIs
        document.getElementById('totalEquipos').textContent = data.kpis.totalEquipos || 0;
        document.getElementById('valorTotalInventario').textContent = `$${(data.kpis.valorTotalInventario || 0).toLocaleString()}`;
        document.getElementById('prestamosActivos').textContent = data.kpis.prestamosActivos || 0;
        document.getElementById('equiposBajoStock').textContent = data.kpis.equiposBajoStock || 0;
        
        // Actualizar tendencias
        const trendEquipos = document.getElementById('totalEquiposTrend');
        if (trendEquipos) {
            const value = parseFloat(data.kpis.trends.totalEquipos);
            trendEquipos.innerHTML = `<i class="fas fa-arrow-${value >= 0 ? 'up' : 'down'}"></i> ${Math.abs(value)}% vs mes pasado`;
            trendEquipos.className = `trend ${value >= 0 ? 'up' : 'down'}`;
        }
        
        const trendValor = document.getElementById('valorInventarioTrend');
        if (trendValor) {
            const value = parseFloat(data.kpis.trends.valorInventario);
            trendValor.innerHTML = `<i class="fas fa-arrow-${value >= 0 ? 'up' : 'down'}"></i> ${Math.abs(value)}% vs mes pasado`;
            trendValor.className = `trend ${value >= 0 ? 'up' : 'down'}`;
        }
        
        const trendPrestamos = document.getElementById('prestamosActivosTrend');
        if (trendPrestamos) {
            const value = parseFloat(data.kpis.trends.prestamosActivos);
            trendPrestamos.innerHTML = `<i class="fas fa-arrow-${value >= 0 ? 'up' : 'down'}"></i> ${Math.abs(value)}% vs mes pasado`;
            trendPrestamos.className = `trend ${value >= 0 ? 'up' : 'down'}`;
        }
        
        const trendBajoStock = document.getElementById('equiposBajoStockTrend');
        if (trendBajoStock) {
            const value = parseFloat(data.kpis.trends.equiposBajoStock);
            trendBajoStock.innerHTML = `<i class="fas fa-arrow-${value >= 0 ? 'up' : 'down'}"></i> ${Math.abs(value)}% vs mes pasado`;
            trendBajoStock.className = `trend ${value >= 0 ? 'up' : 'critical'}`;
        }
        
        // Mostrar alertas activas
        const alertasContainer = document.getElementById('alertasList');
        if (alertasContainer) {
            if (data.alertasLista.length === 0) {
                alertasContainer.innerHTML = '<div class="alert-item empty-state">No hay alertas activas</div>';
            } else {
                alertasContainer.innerHTML = data.alertasLista.map(alerta => `
                    <div class="alert-item ${alerta.prioridad === 'Crítica' ? 'critical' : ''}">
                        <div class="alert-info">
                            <strong>${escapeHtml(alerta.equipo_nombre)}</strong>
                            <span class="category">Stock: ${alerta.stock_actual} / ${alerta.stock_minimo}</span>
                        </div>
                        <div class="stock-status">
                            <span class="trend critical">⚠️ ${alerta.prioridad}</span>
                        </div>
                    </div>
                `).join('');
            }
        }
        
        // Mostrar movimientos recientes (con iconos Font Awesome, sin emojis)
        const movimientosContainer = document.getElementById('movimientosRecientesList');
        if (movimientosContainer) {
            if (data.movimientosRecientes.length === 0) {
                movimientosContainer.innerHTML = '<div class="movement-item empty-state">No hay movimientos recientes</div>';
            } else {
                movimientosContainer.innerHTML = data.movimientosRecientes.map(m => {
                    const iconHtml = m.tipo === 'Entrada' 
                        ? '<i class="fas fa-arrow-down"></i>' 
                        : '<i class="fas fa-arrow-up"></i>';
                    const iconClass = m.tipo === 'Entrada' ? 'entrada' : 'exit';
                    return `
                        <div class="movement-item">
                            <div class="mov-icon ${iconClass}">${iconHtml}</div>
                            <div class="mov-details">
                                <p>${escapeHtml(m.equipo_nombre)}</p>
                                <span>${m.tipo} - Cantidad: ${m.cantidad}</span>
                            </div>
                            <div class="time">${new Date(m.fecha).toLocaleString()}</div>
                        </div>
                    `;
                }).join('');
            }
        }
        
        // Actualizar estudio de préstamos
        document.getElementById('loanStatsActivos').textContent = data.loanStats.activos || 0;
        document.getElementById('loanStatsPendientes').textContent = data.loanStats.pendientes || 0;
        document.getElementById('loanStatsDisponibles').textContent = data.loanStats.disponibles || 0;
        
        document.getElementById('capacidadUtilizada').textContent = `${data.capacidadUtilizada}%`;
        const progressFill = document.getElementById('capacidadProgressFill');
        if (progressFill) progressFill.style.width = `${data.capacidadUtilizada}%`;
        
        document.getElementById('metaVencimiento').innerHTML = `Vencen en promedio: <strong>${data.promedioVencimiento} días</strong>`;
        document.getElementById('metaInventarioDisponible').innerHTML = `Inventario disponible: <strong>${data.inventarioDisponible}%</strong>`;
        
        // Mostrar equipos críticos
        const equiposCriticosContainer = document.getElementById('equiposCriticosTable');
        if (equiposCriticosContainer) {
            if (data.equiposCriticos.length === 0) {
                equiposCriticosContainer.innerHTML = `
                    <div class="table-row header-row">
                        <span>Equipo</span>
                        <span>Stock / Mínimo</span>
                        <span>Estado</span>
                    </div>
                    <div class="table-row empty-state">No hay equipos críticos</div>
                `;
            } else {
                equiposCriticosContainer.innerHTML = `
                    <div class="table-row header-row">
                        <span>Equipo</span>
                        <span>Stock / Mínimo</span>
                        <span>Estado</span>
                    </div>
                    ${data.equiposCriticos.map(e => `
                        <div class="table-row">
                            <span><strong>${escapeHtml(e.nombre)}</strong><br><small>${e.categoria || ''}</small></span>
                            <span>${e.stock_actual} / ${e.stock_minimo}</span>
                            <span><span class="status-badge danger"><i class="fas fa-exclamation-triangle"></i> Crítico</span></span>
                        </div>
                    `).join('')}
                `;
            }
        }
        
        // Mostrar usuario en el sidebar
        const user = getCurrentUser();
        if (user) {
            const coordinatorName = document.querySelector('.coordinator-info p');
            if (coordinatorName) coordinatorName.textContent = user.nombre || 'Coordinador';
        }
        
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        showToast('Error de conexión con el servidor', 'error');
    }
}

function setupEventListeners() {
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    // Tema oscuro/claro (si existe el checkbox)
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            document.body.classList.toggle('dark-theme', themeToggle.checked);
        });
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: ${type === 'error' ? '#ef4444' : '#10b981'};
        color: white; padding: 12px 24px; border-radius: 12px; z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}