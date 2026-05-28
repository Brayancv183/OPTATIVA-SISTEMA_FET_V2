const EquipoModel = require('../models/equipo.model');
// Comentar temporalmente los modelos que no tenemos
// const MovimientoModel = require('../models/movimiento.model');
// const AlertaModel = require('../models/alerta.model');

// Obtener todos los equipos
const getEquipos = async (req, res) => {
    try {
        const { search, categoria, estado } = req.query;
        const equipos = await EquipoModel.findAll({ search, categoria, estado });
        
        res.json({
            success: true,
            equipos
        });
    } catch (error) {
        console.error('Error al obtener equipos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los equipos'
        });
    }
};

// Obtener un equipo por ID
const getEquipoById = async (req, res) => {
    try {
        const { id } = req.params;
        const equipo = await EquipoModel.findById(id);

        if (!equipo) {
            return res.status(404).json({
                success: false,
                message: 'Equipo no encontrado'
            });
        }

        res.json({
            success: true,
            equipo
        });
    } catch (error) {
        console.error('Error al obtener equipo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el equipo'
        });
    }
};

// Crear nuevo equipo
const createEquipo = async (req, res) => {
    try {
        const equipoData = req.body;

        // Verificar si ya existe un equipo con el mismo código
        const existingEquipo = await EquipoModel.findByCode(equipoData.codigo);
        if (existingEquipo) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un equipo con este código'
            });
        }

        const newId = await EquipoModel.create(equipoData);

        res.status(201).json({
            success: true,
            message: 'Equipo creado exitosamente',
            id: newId
        });
    } catch (error) {
        console.error('Error al crear equipo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el equipo'
        });
    }
};

// Actualizar equipo
const updateEquipo = async (req, res) => {
    try {
        const { id } = req.params;
        const equipoData = req.body;

        const equipo = await EquipoModel.findById(id);
        if (!equipo) {
            return res.status(404).json({
                success: false,
                message: 'Equipo no encontrado'
            });
        }

        const updated = await EquipoModel.update(id, equipoData);

        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo actualizar el equipo'
            });
        }

        res.json({
            success: true,
            message: 'Equipo actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar equipo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el equipo'
        });
    }
};

// Eliminar equipo (soft delete)
const deleteEquipo = async (req, res) => {
    try {
        const { id } = req.params;

        const equipo = await EquipoModel.findById(id);
        if (!equipo) {
            return res.status(404).json({
                success: false,
                message: 'Equipo no encontrado'
            });
        }

        const deleted = await EquipoModel.delete(id);

        if (!deleted) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo eliminar el equipo'
            });
        }

        res.json({
            success: true,
            message: 'Equipo eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar equipo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el equipo'
        });
    }
};

// Obtener equipos con bajo stock
const getLowStockEquipos = async (req, res) => {
    try {
        const equipos = await EquipoModel.getLowStockEquipos();
        res.json({
            success: true,
            equipos
        });
    } catch (error) {
        console.error('Error al obtener equipos bajo stock:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los equipos bajo stock'
        });
    }
};

module.exports = {
    getEquipos,
    getEquipoById,
    createEquipo,
    updateEquipo,
    deleteEquipo,
    getLowStockEquipos
};