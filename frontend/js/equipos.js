let currentPage = 1;
let totalPages = 1;
let allEquipos = [];

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadEquipos();
    setupEventListeners();
});

function setupEventListeners() {
    // Búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentPage = 1;
            loadEquipos();
        });
    }
    
    // Filtros
    const categoriaFilter = document.getElementById('categoriaFilter');
    const estadoFilter = document.getElementById('estadoFilter');
    if (categoriaFilter) categoriaFilter.addEventListener('change', () => loadEquipos());
    if (estadoFilter) estadoFilter.addEventListener('change', () => loadEquipos());
    
    // Nuevo equipo
    const newEquipoBtn = document.getElementById('newEquipoBtn');
    if (newEquipoBtn) {
        newEquipoBtn.addEventListener('click', () => openModal());
    }
    
    // Modal
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
    
    // Guardar equipo
    const saveEquipoBtn = document.getElementById('saveEquipoBtn');
    if (saveEquipoBtn) {
        saveEquipoBtn.addEventListener('click', saveEquipo);
    }
    
    // Exportar Excel
    const exportBtn = document.getElementById('exportExcelBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
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

async function loadEquipos() {
    try {
        const search = document.getElementById('searchInput')?.value || '';
        const categoria = document.getElementById('categoriaFilter')?.value || '';
        const estado = document.getElementById('estadoFilter')?.value || '';
        
        const url = new URL(`${API_URL}/equipos`);
        if (search) url.searchParams.append('search', search);
        if (categoria) url.searchParams.append('categoria', categoria);
        if (estado) url.searchParams.append('estado', estado);
        
        const response = await fetch(url, { headers: getAuthHeaders() });
        const data = await response.json();
        
        if (response.status === 401) {
            showToast(data.message || 'Sesión inválida. Redirigiendo a login...', 'error');
            logout();
            return;
        }

        if (data.success) {
            allEquipos = data.equipos;
            renderTable();
        }
    } catch (error) {
        console.error('Error cargando equipos:', error);
        showToast('Error al cargar equipos', 'error');
    }
}

function renderTable() {
    const tbody = document.getElementById('equiposTableBody');
    const paginationInfo = document.getElementById('paginationInfo');
    const paginationButtons = document.getElementById('paginationButtons');
    
    if (!tbody) return;
    
    // Paginación
    const itemsPerPage = 10;
    totalPages = Math.ceil(allEquipos.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const equiposPage = allEquipos.slice(start, end);
    
    // Actualizar info paginación
    if (paginationInfo) {
        paginationInfo.textContent = `Mostrando ${start + 1} a ${Math.min(end, allEquipos.length)} de ${allEquipos.length} equipos`;
    }
    
    // Generar botones de paginación
    if (paginationButtons) {
        renderPaginationButtons(paginationButtons);
    }
    
    // Renderizar tabla
    if (equiposPage.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay equipos registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = equiposPage.map(equipo => `
        <tr>
            <td>${equipo.codigo}</td>
            <td><strong>${equipo.nombre}</strong><br><small style="color: var(--text-muted);">${equipo.descripcion?.substring(0, 50) || ''}</small></td>
            <td>${equipo.categoria || '-'}</td>
            <td>${equipo.stock_actual}</td>
            <td>${equipo.stock_minimo}</td>
            <td>$${equipo.valor_unitario?.toLocaleString()}</td>
            <td>
                <span class="status-badge-table ${equipo.stock_actual <= equipo.stock_minimo ? 'status-lowstock' : 'status-active'}">
                    ${equipo.stock_actual <= equipo.stock_minimo ? 'Bajo Stock' : 'Activo'}
                </span>
            </td>
            <td>
                <div class="action-icons">
                    <i class="fas fa-edit" onclick="editEquipo(${equipo.id})" title="Editar"></i>
                    <i class="fas fa-trash-alt" onclick="deleteEquipo(${equipo.id})" title="Eliminar"></i>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderPaginationButtons(container) {
    let buttons = '';
    
    // Botón anterior
    buttons += `<button class="page-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;
    
    // Números de página
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            buttons += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            buttons += `<button class="page-btn" disabled>...</button>`;
        }
    }
    
    // Botón siguiente
    buttons += `<button class="page-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>›</button>`;
    
    container.innerHTML = buttons;
}

function changePage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
}

function openModal(equipo = null) {
    const modal = document.getElementById('equipoModal');
    const modalTitle = document.getElementById('modalTitle');
    
    if (equipo) {
        modalTitle.textContent = 'Editar Equipo';
        // Llenar formulario
        document.getElementById('nombre').value = equipo.nombre;
        document.getElementById('codigo').value = equipo.codigo;
        document.getElementById('descripcion').value = equipo.descripcion || '';
        document.getElementById('categoria').value = equipo.categoria || 'Fútbol';
        document.getElementById('stockMinimo').value = equipo.stock_minimo;
        document.getElementById('proveedor').value = equipo.proveedor_nombre || '';
        document.getElementById('valorUnitario').value = equipo.valor_unitario;
        document.getElementById('iva').value = equipo.iva || 19;
        document.getElementById('ubicacion').value = equipo.ubicacion || '';
        document.getElementById('unidadMedida').value = equipo.unidad_medida || 'Unidad';
        document.getElementById('stockActual').value = equipo.stock_actual;
        
        window.currentEquipoId = equipo.id;
    } else {
        modalTitle.textContent = 'Nuevo Equipo';
        document.getElementById('equipoForm').reset();
        window.currentEquipoId = null;
    }
    
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('equipoModal');
    modal.classList.remove('active');
    window.currentEquipoId = null;
}

async function saveEquipo() {
    const nombre = document.getElementById('nombre').value.trim();
    const codigo = document.getElementById('codigo').value.trim();
    const descripcion = document.getElementById('descripcion').value.trim();
    const categoria = document.getElementById('categoria').value;
    const stockMinimo = parseInt(document.getElementById('stockMinimo').value, 10);
    const valorUnitario = parseFloat(document.getElementById('valorUnitario').value);
    const iva = parseFloat(document.getElementById('iva').value);
    const ubicacion = document.getElementById('ubicacion').value.trim();
    const unidadMedida = document.getElementById('unidadMedida').value;
    const stockActual = parseInt(document.getElementById('stockActual').value, 10);

    if (!nombre || !codigo || !categoria || isNaN(stockMinimo) || isNaN(stockActual) || isNaN(valorUnitario)) {
        showToast('Por favor complete todos los campos obligatorios correctamente.', 'error');
        return;
    }

    const equipoData = {
        nombre,
        codigo,
        descripcion,
        categoria,
        stock_minimo: stockMinimo,
        proveedor_id: null,
        valor_unitario: valorUnitario,
        iva: isNaN(iva) ? 19 : iva,
        ubicacion,
        unidad_medida: unidadMedida,
        stock_actual: stockActual
    };
    
    try {
        const url = window.currentEquipoId 
            ? `${API_URL}/equipos/${window.currentEquipoId}`
            : `${API_URL}/equipos`;
        
        const method = window.currentEquipoId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify(equipoData)
        });
        
        const data = await response.json();
        
        if (response.status === 401) {
            showToast(data.message || 'Sesión inválida. Redirigiendo a login...', 'error');
            logout();
            return;
        }

        if (data.success) {
            showToast(data.message, 'success');
            closeModal();
            loadEquipos();
        } else if (data.errors) {
            const errorMessages = data.errors.map(err => err.msg).join(', ');
            showToast(errorMessages || 'Error al guardar el equipo', 'error');
        } else {
            showToast(data.message || 'Error al guardar el equipo', 'error');
        }
    } catch (error) {
        console.error('Error guardando equipo:', error);
        showToast('Error al guardar el equipo', 'error');
    }
}

function editEquipo(id) {
    const equipo = allEquipos.find(e => e.id === id);
    if (equipo) {
        openModal(equipo);
    }
}

let equipoToDelete = null;

function deleteEquipo(id) {
    equipoToDelete = id;
    const toast = document.getElementById('confirmToast');
    toast.classList.add('active');
    
    document.getElementById('confirmDeleteYes').onclick = async () => {
        try {
            const response = await fetch(`${API_URL}/equipos/${equipoToDelete}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast(data.message, 'success');
                loadEquipos();
            } else {
                showToast(data.message, 'error');
            }
        } catch (error) {
            console.error('Error eliminando equipo:', error);
            showToast('Error al eliminar el equipo', 'error');
        } finally {
            toast.classList.remove('active');
            equipoToDelete = null;
        }
    };
    
    document.getElementById('confirmDeleteNo').onclick = () => {
        toast.classList.remove('active');
        equipoToDelete = null;
    };
}

function showToast(message, type = 'success') {
    // Crear toast temporal
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
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function exportToExcel() {
    // Implementar exportación a Excel si tienes SheetJS
    if (typeof XLSX !== 'undefined') {
        const worksheet = XLSX.utils.json_to_sheet(allEquipos.map(e => ({
            Código: e.codigo,
            Nombre: e.nombre,
            Categoría: e.categoria,
            'Stock Actual': e.stock_actual,
            'Stock Mínimo': e.stock_minimo,
            'Valor Unitario': e.valor_unitario,
            Ubicación: e.ubicacion
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Equipos');
        XLSX.writeFile(workbook, `equipos_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
        showToast('SheetJS no está cargado', 'error');
    }
}