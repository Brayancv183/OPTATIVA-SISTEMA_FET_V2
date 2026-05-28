// Configuración
let currentPage = 1;
let totalPages = 1;
let currentFilters = { search: '', estado: '' };
let currentFacturaId = null;
let currentDetalles = [];
let proveedores = [];
let equipos = [];

const ui = {};

document.addEventListener('DOMContentLoaded', async () => {
    assignElements();
    setupEventListeners();
    checkAuth();
    await Promise.all([loadProveedores(), loadEquipos()]);
    await loadStats();
    await loadFacturas();
});

function assignElements() {
    ui.facturasTableBody = document.getElementById('facturasTableBody');
    ui.searchInput = document.getElementById('searchFacturaInput');
    ui.estadoFilter = document.getElementById('estadoFacturaFilter');
    ui.paginationInfo = document.getElementById('paginationInfo');
    ui.paginationButtons = document.getElementById('paginationButtons');
    ui.newFacturaBtn = document.getElementById('newFacturaBtn');
    ui.facturaModal = document.getElementById('facturaModal');
    ui.closeFacturaModalBtn = document.getElementById('closeFacturaModal');
    ui.cancelFacturaModalBtn = document.getElementById('cancelFacturaModal');
    ui.addDetalleBtn = document.getElementById('addDetalleBtn');
    ui.saveFacturaBtn = document.getElementById('saveFacturaBtn');
    ui.facturaForm = document.getElementById('facturaForm');
    ui.facturaNumero = document.getElementById('factura_numero');
    ui.facturaFecha = document.getElementById('factura_fecha');
    ui.facturaProveedor = document.getElementById('factura_proveedor_id');
    ui.facturaPrograma = document.getElementById('factura_programa_id');
    ui.facturaEstado = document.getElementById('factura_estado');
    ui.facturaObservaciones = document.getElementById('factura_observaciones');
    ui.facturaImagen = document.getElementById('factura_imagen');
    ui.imagenPreview = document.getElementById('imagenPreview');
    ui.previewImg = document.getElementById('previewImg');
    ui.detalleEquipo = document.getElementById('detalle_equipo_id');
    ui.detalleCantidad = document.getElementById('detalle_cantidad');
    ui.detallesList = document.getElementById('facturaDetallesList');
    ui.facturaSubtotal = document.getElementById('factura_subtotal');
    ui.facturaIva = document.getElementById('factura_iva');
    ui.facturaTotal = document.getElementById('factura_total');
    ui.logoutLink = document.getElementById('logout-link');
    ui.facturaModalTitle = document.getElementById('facturaModalTitle');
}

function setupEventListeners() {
    ui.searchInput?.addEventListener('input', () => {
        currentFilters.search = ui.searchInput.value;
        currentPage = 1;
        loadFacturas();
    });

    ui.estadoFilter?.addEventListener('change', () => {
        currentFilters.estado = ui.estadoFilter.value;
        currentPage = 1;
        loadFacturas();
    });

    ui.newFacturaBtn?.addEventListener('click', openNewFacturaModal);
    ui.closeFacturaModalBtn?.addEventListener('click', closeFacturaModal);
    ui.cancelFacturaModalBtn?.addEventListener('click', closeFacturaModal);
    ui.addDetalleBtn?.addEventListener('click', addDetalle);
    ui.saveFacturaBtn?.addEventListener('click', saveFactura);
    ui.facturaImagen?.addEventListener('change', previewImage);
    ui.logoutLink?.addEventListener('click', (e) => { e.preventDefault(); logout(); });
}

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/facturas/stats`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            document.getElementById('totalFacturado').textContent = `$${(data.stats.totalFacturado || 0).toLocaleString()}`;
            document.getElementById('totalFacturas').textContent = data.stats.totalFacturas || 0;
            document.getElementById('facturasPendientes').textContent = data.stats.facturasPendientes || 0;
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

async function loadFacturas() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: 10,
            search: currentFilters.search,
            estado: currentFilters.estado
        });
        const response = await fetch(`${API_URL}/facturas?${params}`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            totalPages = data.totalPages;
            renderTable(data.facturas);
            updatePagination(data.total, data.page, data.totalPages);
        }
    } catch (error) {
        console.error('Error cargando facturas:', error);
        showToast('Error al cargar facturas', 'error');
    }
}

async function loadProveedores() {
    try {
        const response = await fetch(`${API_URL}/proveedores`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            proveedores = data.proveedores;
            if (ui.facturaProveedor) {
                ui.facturaProveedor.innerHTML = '<option value="">Seleccione un proveedor...</option>' +
                    proveedores.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error cargando proveedores:', error);
    }
}

async function loadEquipos() {
    try {
        const response = await fetch(`${API_URL}/equipos`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            equipos = data.equipos;
            if (ui.detalleEquipo) {
                ui.detalleEquipo.innerHTML = '<option value="">Seleccione un equipo...</option>' +
                    equipos.map(e => `<option value="${e.id}" data-precio="${e.valor_unitario}">${escapeHtml(e.nombre)} ($${e.valor_unitario.toLocaleString()})</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error cargando equipos:', error);
    }
}

function renderTable(facturas) {
    if (!ui.facturasTableBody) return;
    if (!facturas || facturas.length === 0) {
        ui.facturasTableBody.innerHTML = '<td><td colspan="7" class="center">No hay facturas registradas</td></tr>';
        return;
    }

    // Obtener la URL base del backend (sin el /api)
    const baseBackendUrl = API_URL.replace('/api', '');

    ui.facturasTableBody.innerHTML = facturas.map(f => {
        const estadoClass = f.estado === 'Validada' ? 'estado-validado' : (f.estado === 'Pendiente' ? 'estado-pendiente' : 'estado-diferencias');
        // Si existe imagen, construir la URL absoluta apuntando al backend
        let imgUrl = null;
        if (f.imagen_url) {
            imgUrl = `${baseBackendUrl}${f.imagen_url}`;
        }
        return `
            <tr>
                <td><strong>${escapeHtml(f.numero_factura)}</strong></td>
                <td>${new Date(f.fecha_emision).toLocaleDateString()}</td>
                <td>${escapeHtml(f.proveedor_nombre || '-')}</td>
                <td>${escapeHtml(f.programa_nombre || '-')}</td>
                <td>
                    <div class="total-info">
                        <span class="total-monto">$${(f.total || 0).toLocaleString()}</span>
                        <span class="total-iva">IVA: $${(f.iva_total || 0).toLocaleString()}</span>
                    </div>
                </td>
                <td><span class="estado-factura ${estadoClass}">${escapeHtml(f.estado)}</span></td>
                <td class="action-icons-factura">
                    <i class="fas fa-eye" data-id="${f.id}" title="Ver detalle"></i>
                    <i class="fas fa-edit" data-id="${f.id}" title="Editar"></i>
                    ${imgUrl ? `<i class="fas fa-image" data-img="${imgUrl}" title="Ver imagen" style="color: #10b981;"></i>` : ''}
                    <i class="fas fa-trash-alt" data-id="${f.id}" title="Eliminar"></i>
                </td>
            </tr>
        `;
    }).join('');

    ui.facturasTableBody.querySelectorAll('.fa-eye').forEach(btn => btn.addEventListener('click', () => viewFactura(btn.dataset.id)));
    ui.facturasTableBody.querySelectorAll('.fa-edit').forEach(btn => btn.addEventListener('click', () => editFactura(btn.dataset.id)));
    ui.facturasTableBody.querySelectorAll('.fa-trash-alt').forEach(btn => btn.addEventListener('click', () => deleteFactura(btn.dataset.id)));
    ui.facturasTableBody.querySelectorAll('.fa-image').forEach(btn => btn.addEventListener('click', () => showImageModal(btn.dataset.img)));
}

function updatePagination(total, page, totalPagesParam) {
    if (ui.paginationInfo) {
        ui.paginationInfo.textContent = `Mostrando ${(page - 1) * 10 + 1} a ${Math.min(page * 10, total)} de ${total} facturas`;
    }
    if (!ui.paginationButtons) return;

    let buttons = '';
    buttons += `<button class="page-btn" onclick="changePage(${page - 1})" ${page === 1 ? 'disabled' : ''}>‹</button>`;
    for (let i = 1; i <= totalPagesParam; i++) {
        if (i === 1 || i === totalPagesParam || (i >= page - 2 && i <= page + 2)) {
            buttons += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === page - 3 || i === page + 3) {
            buttons += `<button class="page-btn" disabled>...</button>`;
        }
    }
    buttons += `<button class="page-btn" onclick="changePage(${page + 1})" ${page === totalPagesParam ? 'disabled' : ''}>›</button>`;
    ui.paginationButtons.innerHTML = buttons;
}

function changePage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadFacturas();
}

function previewImage() {
    if (!ui.facturaImagen) return;
    const file = ui.facturaImagen.files?.[0];
    if (!file) {
        ui.imagenPreview.style.display = 'none';
        return;
    }
    const reader = new FileReader();
    reader.onload = function (event) {
        ui.previewImg.src = event.target.result;
        ui.imagenPreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function openNewFacturaModal() {
    currentFacturaId = null;
    currentDetalles = [];
    renderDetallesList();
    ui.facturaForm.reset();
    ui.facturaFecha.value = new Date().toISOString().slice(0, 10);
    ui.facturaEstado.value = 'Pendiente';
    ui.facturaSubtotal.value = '0.00';
    ui.facturaIva.value = '0.00';
    ui.facturaTotal.value = '0.00';
    ui.imagenPreview.style.display = 'none';
    ui.facturaModalTitle.textContent = 'Nueva factura';
    ui.facturaModal.classList.add('active');
}

function closeFacturaModal() {
    ui.facturaModal.classList.remove('active');
}

function addDetalle() {
    if (!ui.detalleEquipo || !ui.detalleCantidad) return;

    const equipoId = ui.detalleEquipo.value;
    const cantidad = parseInt(ui.detalleCantidad.value, 10);
    const equipo = equipos.find(e => e.id == equipoId);

    if (!equipoId || !cantidad || cantidad <= 0 || !equipo) {
        showToast('Seleccione un equipo y una cantidad válida', 'error');
        return;
    }

    const precioUnitario = parseFloat(equipo.valor_unitario) || 0;
    currentDetalles.push({
        equipo_id: parseInt(equipoId, 10),
        equipo_nombre: equipo.nombre,
        cantidad,
        precio_unitario: precioUnitario,
        subtotal: cantidad * precioUnitario
    });

    renderDetallesList();
    ui.detalleEquipo.value = '';
    ui.detalleCantidad.value = '';
    calcularTotales();
}

function renderDetallesList() {
    if (!ui.detallesList) return;
    if (currentDetalles.length === 0) {
        ui.detallesList.innerHTML = '<div class="empty-state">No hay productos agregados</div>';
        return;
    }

    ui.detallesList.innerHTML = currentDetalles.map((item, idx) => {
        const cantidad = Number(item.cantidad) || 0;
        const precioUnitario = Number(item.precio_unitario) || 0;
        const subtotal = Number(item.subtotal) || cantidad * precioUnitario;
        return `
        <div class="detalle-row">
            <div class="detalle-col detalle-nombre">${escapeHtml(item.equipo_nombre)}</div>
            <div class="detalle-col">Cantidad: ${cantidad}</div>
            <div class="detalle-col">$${precioUnitario.toFixed(2)} c/u</div>
            <div class="detalle-col">Subtotal: $${subtotal.toFixed(2)}</div>
            <button class="detalle-remove" type="button" onclick="removeDetalle(${idx})"><i class="fas fa-trash-alt"></i></button>
        </div>
    `;
    }).join('');
}

function removeDetalle(idx) {
    currentDetalles.splice(idx, 1);
    renderDetallesList();
    calcularTotales();
}

function calcularTotales() {
    const subtotal = currentDetalles.reduce((sum, item) => sum + item.subtotal, 0);
    const iva = parseFloat((subtotal * 0.19).toFixed(2));
    const total = parseFloat((subtotal + iva).toFixed(2));
    ui.facturaSubtotal.value = subtotal.toFixed(2);
    ui.facturaIva.value = iva.toFixed(2);
    ui.facturaTotal.value = total.toFixed(2);
}

async function saveFactura() {
    if (!ui.facturaNumero || !ui.facturaFecha || !ui.facturaProveedor || !ui.facturaEstado || !ui.facturaSubtotal || !ui.facturaIva) return;

    const numero_factura = ui.facturaNumero.value.trim();
    const fecha_emision = ui.facturaFecha.value;
    const proveedor_id = ui.facturaProveedor.value;
    const programa_id = ui.facturaPrograma.value.trim() || '';
    const observaciones = ui.facturaObservaciones.value.trim();
    const estado = ui.facturaEstado.value;
    const subtotal = parseFloat(ui.facturaSubtotal.value);
    const iva_total = parseFloat(ui.facturaIva.value);

    if (!numero_factura || !fecha_emision || !proveedor_id || currentDetalles.length === 0) {
        showToast('Complete todos los campos obligatorios y agregue al menos un detalle', 'error');
        return;
    }

    const detailsPayload = currentDetalles.map(d => ({
        equipo_id: d.equipo_id,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario
    }));

    const formData = new FormData();
    formData.append('numero_factura', numero_factura);
    formData.append('fecha_emision', fecha_emision);
    formData.append('proveedor_id', proveedor_id);
    formData.append('programa_id', programa_id);
    formData.append('subtotal', subtotal.toString());
    formData.append('iva_total', iva_total.toString());
    formData.append('estado', estado);
    formData.append('observaciones', observaciones);
    formData.append('detalles', JSON.stringify(detailsPayload));

    const imagenFile = ui.facturaImagen.files?.[0];
    if (imagenFile) {
        formData.append('imagen', imagenFile);
    }

    try {
        const url = currentFacturaId ? `${API_URL}/facturas/${currentFacturaId}` : `${API_URL}/facturas`;
        const method = currentFacturaId ? 'PUT' : 'POST';
        const response = await fetch(url, {
            method,
            headers: {
                Authorization: `Bearer ${getAuthToken()}`
            },
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            showToast(data.message, 'success');
            closeFacturaModal();
            await loadFacturas();
            await loadStats();
        } else {
            if (data.errors && Array.isArray(data.errors)) {
                const msgs = data.errors.map(e => e.msg).join(' - ');
                showToast(msgs, 'error');
            } else {
                showToast(data.message || 'Error al guardar factura', 'error');
            }
        }
    } catch (error) {
        console.error('Error guardando factura:', error);
        showToast('Error al guardar la factura', 'error');
    }
}

async function viewFactura(id) {
    try {
        const response = await fetch(`${API_URL}/facturas/${id}`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) {
            const f = data.factura;
            const detallesText = f.detalles?.map(d => {
                const cantidad = Number(d.cantidad) || 0;
                const precioUnitario = Number(d.precio_unitario) || 0;
                return `${escapeHtml(d.equipo_nombre)} - ${cantidad} x $${precioUnitario.toFixed(2)} = $${(cantidad * precioUnitario).toFixed(2)}`;
            }).join('\n') || 'Sin detalles';
            const totalValue = Number(f.total) || 0;
            const baseBackendUrl = API_URL.replace('/api', '');
            const imageUrl = f.imagen_url ? `${baseBackendUrl}${f.imagen_url}` : null;
            alert(`Factura: ${escapeHtml(f.numero_factura)}\nFecha: ${new Date(f.fecha_emision).toLocaleDateString()}\nProveedor: ${escapeHtml(f.proveedor_nombre || '-')}\nPrograma: ${escapeHtml(f.programa_nombre || '-')}\nTotal: $${totalValue.toFixed(2)}\nEstado: ${escapeHtml(f.estado)}\n\nDetalles:\n${detallesText}${imageUrl ? `\n\nImagen: ${imageUrl}` : ''}`);
        } else {
            showToast(data.message || 'No se encontró la factura', 'error');
        }
    } catch (error) {
        console.error('Error al cargar detalles:', error);
        showToast('Error al cargar detalles', 'error');
    }
}

async function editFactura(id) {
    try {
        const response = await fetch(`${API_URL}/facturas/${id}`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (!data.success) {
            showToast(data.message || 'Factura no encontrada', 'error');
            return;
        }
        const factura = data.factura;
        currentFacturaId = factura.id;
        currentDetalles = (factura.detalles || []).map(d => ({
            ...d,
            cantidad: Number(d.cantidad) || 0,
            precio_unitario: Number(d.precio_unitario) || 0,
            subtotal: Number(d.subtotal) || (Number(d.cantidad) || 0) * (Number(d.precio_unitario) || 0)
        }));
        renderDetallesList();
        calcularTotales();
        ui.facturaNumero.value = factura.numero_factura || '';
        ui.facturaFecha.value = factura.fecha_emision?.slice(0, 10) || new Date().toISOString().slice(0, 10);
        ui.facturaProveedor.value = factura.proveedor_id || '';
        ui.facturaPrograma.value = factura.programa_id || '';
        ui.facturaEstado.value = factura.estado || 'Pendiente';
        ui.facturaObservaciones.value = factura.observaciones || '';
        const subtotalValue = Number(factura.subtotal) || 0;
        const ivaValue = Number(factura.iva_total) || 0;
        ui.facturaSubtotal.value = subtotalValue.toFixed(2);
        ui.facturaIva.value = ivaValue.toFixed(2);
        ui.facturaTotal.value = (subtotalValue + ivaValue).toFixed(2);
        const baseBackendUrl = API_URL.replace('/api', '');
        const imageUrl = factura.imagen_url ? `${baseBackendUrl}${factura.imagen_url}` : null;
        if (imageUrl) {
            ui.previewImg.src = imageUrl;
            ui.imagenPreview.style.display = 'block';
        } else {
            ui.imagenPreview.style.display = 'none';
        }
        ui.facturaModalTitle.textContent = 'Editar factura';
        ui.facturaModal.classList.add('active');
    } catch (error) {
        console.error('Error al cargar factura para editar:', error);
        showToast('Error al cargar factura', 'error');
    }
}

async function deleteFactura(id) {
    if (!confirm('¿Eliminar esta factura?')) return;
    try {
        const response = await fetch(`${API_URL}/facturas/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (data.success) {
            showToast('Factura eliminada', 'success');
            await loadFacturas();
            await loadStats();
        } else {
            showToast(data.message || 'No se pudo eliminar factura', 'error');
        }
    } catch (error) {
        console.error('Error eliminando factura:', error);
        showToast('Error al eliminar factura', 'error');
    }
}

function showImageModal(imgUrl) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85); display: flex; align-items: center;
        justify-content: center; z-index: 2000;
    `;
    modal.onclick = () => modal.remove();
    const img = document.createElement('img');
    img.src = imgUrl;
    img.style.maxWidth = '90%';
    img.style.maxHeight = '90%';
    img.style.borderRadius = '16px';
    img.style.boxShadow = '0 25px 50px rgba(0,0,0,0.4)';
    modal.appendChild(img);
    document.body.appendChild(modal);
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
        position: fixed; bottom: 20px; right: 20px; z-index: 9999;
        padding: 14px 22px; border-radius: 14px; color: white;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        font-weight: 600; box-shadow: 0 10px 30px rgba(0,0,0,0.18);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}