const SolicitudModel = require('../models/solicitud.model');

// Obtener lista de solicitudes
const getSolicitudes = async (req, res) => {
    try {
        const { search, estado, prioridad, page = 1, limit = 10 } = req.query;
        const filters = { search, estado, prioridad };
        
        const solicitudes = await SolicitudModel.findAll(filters, parseInt(page), parseInt(limit));
        const total = await SolicitudModel.count(filters);
        
        res.json({
            success: true,
            solicitudes,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error al obtener solicitudes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las solicitudes'
        });
    }
};

// Obtener solicitud por ID
const getSolicitudById = async (req, res) => {
    try {
        const { id } = req.params;
        const solicitud = await SolicitudModel.findById(id);
        
        if (!solicitud) {
            return res.status(404).json({
                success: false,
                message: 'Solicitud no encontrada'
            });
        }
        
        res.json({
            success: true,
            solicitud
        });
    } catch (error) {
        console.error('Error al obtener solicitud:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la solicitud'
        });
    }
};

// Crear nueva solicitud
const createSolicitud = async (req, res) => {
    try {
        const { solicitante_nombre, dependencia, fecha_solicitud, fecha_necesidad, prioridad, valor_total_estimado, detalles } = req.body;
        
        if (!solicitante_nombre || !detalles || detalles.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Datos incompletos para la solicitud'
            });
        }
        
        const solicitudId = await SolicitudModel.create({
            solicitante_nombre,
            dependencia,
            fecha_solicitud,
            fecha_necesidad,
            prioridad,
            valor_total_estimado
        }, detalles);
        
        res.status(201).json({
            success: true,
            message: 'Solicitud creada exitosamente',
            solicitudId,
            codigo_solicitud: `SOL-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(solicitudId).padStart(4,'0')}`
        });
    } catch (error) {
        console.error('Error al crear solicitud:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear la solicitud'
        });
    }
};

// Aprobar solicitud
const approveSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidades_aprobadas } = req.body;
        
        const solicitud = await SolicitudModel.findById(id);
        if (!solicitud) {
            return res.status(404).json({
                success: false,
                message: 'Solicitud no encontrada'
            });
        }
        
        if (solicitud.estado !== 'Pendiente') {
            return res.status(400).json({
                success: false,
                message: `La solicitud ya está ${solicitud.estado.toLowerCase()}`
            });
        }
        
        await SolicitudModel.approve(id, req.userId, cantidades_aprobadas || {});
        
        res.json({
            success: true,
            message: 'Solicitud aprobada exitosamente'
        });
    } catch (error) {
        console.error('Error al aprobar solicitud:', error);
        res.status(500).json({
            success: false,
            message: 'Error al aprobar la solicitud'
        });
    }
};

// Rechazar solicitud
const rejectSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        
        const solicitud = await SolicitudModel.findById(id);
        if (!solicitud) {
            return res.status(404).json({
                success: false,
                message: 'Solicitud no encontrada'
            });
        }
        
        if (solicitud.estado !== 'Pendiente') {
            return res.status(400).json({
                success: false,
                message: `La solicitud ya está ${solicitud.estado.toLowerCase()}`
            });
        }
        
        await SolicitudModel.reject(id, req.userId);
        
        res.json({
            success: true,
            message: 'Solicitud rechazada'
        });
    } catch (error) {
        console.error('Error al rechazar solicitud:', error);
        res.status(500).json({
            success: false,
            message: 'Error al rechazar la solicitud'
        });
    }
};

// Obtener estadísticas
const getSolicitudesStats = async (req, res) => {
    try {
        const stats = await SolicitudModel.getStats();
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
};

module.exports = {
    getSolicitudes,
    getSolicitudById,
    createSolicitud,
    approveSolicitud,
    rejectSolicitud,
    getSolicitudesStats
};