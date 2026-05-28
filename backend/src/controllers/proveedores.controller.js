const ProveedorModel = require('../models/proveedor.model');

// Obtener todos los proveedores
const getProveedores = async (req, res) => {
    try {
        const { search } = req.query;
        const proveedores = await ProveedorModel.findAll({ search });
        
        res.json({
            success: true,
            proveedores
        });
    } catch (error) {
        console.error('Error al obtener proveedores:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los proveedores'
        });
    }
};

// Obtener un proveedor por ID
const getProveedorById = async (req, res) => {
    try {
        const { id } = req.params;
        const proveedor = await ProveedorModel.findById(id);

        if (!proveedor) {
            return res.status(404).json({
                success: false,
                message: 'Proveedor no encontrado'
            });
        }

        res.json({
            success: true,
            proveedor
        });
    } catch (error) {
        console.error('Error al obtener proveedor:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el proveedor'
        });
    }
};

// Crear nuevo proveedor
const createProveedor = async (req, res) => {
    try {
        const proveedorData = req.body;
        
        // Validaciones básicas
        if (!proveedorData.nombre) {
            return res.status(400).json({
                success: false,
                message: 'El nombre del proveedor es requerido'
            });
        }

        const newId = await ProveedorModel.create(proveedorData);

        res.status(201).json({
            success: true,
            message: 'Proveedor creado exitosamente',
            id: newId
        });
    } catch (error) {
        console.error('Error al crear proveedor:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el proveedor'
        });
    }
};

// Actualizar proveedor
const updateProveedor = async (req, res) => {
    try {
        const { id } = req.params;
        const proveedorData = req.body;

        const proveedor = await ProveedorModel.findById(id);
        if (!proveedor) {
            return res.status(404).json({
                success: false,
                message: 'Proveedor no encontrado'
            });
        }

        const updated = await ProveedorModel.update(id, proveedorData);

        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo actualizar el proveedor'
            });
        }

        res.json({
            success: true,
            message: 'Proveedor actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar proveedor:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el proveedor'
        });
    }
};

// Eliminar proveedor
const deleteProveedor = async (req, res) => {
    try {
        const { id } = req.params;

        const proveedor = await ProveedorModel.findById(id);
        if (!proveedor) {
            return res.status(404).json({
                success: false,
                message: 'Proveedor no encontrado'
            });
        }

        const deleted = await ProveedorModel.delete(id);

        if (!deleted) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo eliminar el proveedor'
            });
        }

        res.json({
            success: true,
            message: 'Proveedor eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar proveedor:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el proveedor'
        });
    }
};

// Obtener estadísticas
const getProveedoresStats = async (req, res) => {
    try {
        const stats = await ProveedorModel.getStats();
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
    getProveedores,
    getProveedorById,
    createProveedor,
    updateProveedor,
    deleteProveedor,
    getProveedoresStats
};