// Formatear fechas para MySQL
const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().slice(0, 19).replace('T', ' ');
};

// Formatear moneda
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount);
};

// Generar código único para solicitudes
const generateSolicitudCode = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SOL-${year}${month}-${random}`;
};

// Validar si el stock es suficiente
const validateStock = (stockActual, cantidadRequerida) => {
    return stockActual >= cantidadRequerida;
};

// Calcular prioridad de alerta basada en stock
const calculateAlertPriority = (stockActual, stockMinimo) => {
    const ratio = stockActual / stockMinimo;
    if (stockActual === 0) return 'Crítica';
    if (ratio <= 0.5) return 'Crítica';
    if (ratio <= 1) return 'Alta';
    if (ratio <= 1.5) return 'Media';
    return 'Baja';
};

module.exports = {
    formatDate,
    formatCurrency,
    generateSolicitudCode,
    validateStock,
    calculateAlertPriority
};