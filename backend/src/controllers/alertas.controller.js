const AlertaModel = require('../models/alerta.model');

// Obtener lista de alertas
const getAlertas = async (req, res) => {
    try {
        const { estado, prioridad } = req.query;
        const filters = { estado, prioridad };
        
        const alertas = await AlertaModel.findAll(filters);
        
        res.json({
            success: true,
            alertas
        });
    } catch (error) {
        console.error('Error al obtener alertas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las alertas: ' + error.message
        });
    }
};

// Obtener estadísticas de alertas
const getAlertasStats = async (req, res) => {
    try {
        const stats = await AlertaModel.getStats();
        
        res.json({
            success: true,
            stats: {
                totalAlertas: stats.totalAlertas || 0,
                alertasCriticas: stats.alertasCriticas || 0,
                alertasMediaAlta: stats.alertasMediaAlta || 0,
                alertasAtendidas: stats.alertasAtendidas || 0
            }
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas: ' + error.message
        });
    }
};

// Atender una alerta
const attendAlerta = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await AlertaModel.attend(id, req.userId);
        
        if (result) {
            res.json({
                success: true,
                message: 'Alerta atendida exitosamente'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Alerta no encontrada o ya fue atendida'
            });
        }
    } catch (error) {
        console.error('Error al atender alerta:', error);
        res.status(500).json({
            success: false,
            message: 'Error al atender la alerta'
        });
    }
};

module.exports = {
    getAlertas,
    getAlertasStats,
    attendAlerta
};