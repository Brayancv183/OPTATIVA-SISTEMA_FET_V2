const FacturaModel = require('../models/factura.model');
const upload = require('../config/multer');
const path = require('path');
const fs = require('fs');

// Obtener lista de facturas
const getFacturas = async (req, res) => {
    try {
        const { search, estado, page = 1, limit = 10 } = req.query;
        const filters = { search, estado };
        
        const facturas = await FacturaModel.findAll(filters, parseInt(page), parseInt(limit));
        const total = await FacturaModel.count(filters);
        
        // Devolver las facturas con la ruta de imagen tal como está en la BD (relativa)
        res.json({
            success: true,
            facturas,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error al obtener facturas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las facturas'
        });
    }
};

// Obtener factura por ID
const getFacturaById = async (req, res) => {
    try {
        const { id } = req.params;
        const factura = await FacturaModel.findById(id);
        
        if (!factura) {
            return res.status(404).json({
                success: false,
                message: 'Factura no encontrada'
            });
        }
        
        const detalles = await FacturaModel.getDetails(id);
        factura.detalles = detalles;

        // Devolver la factura con la ruta de imagen tal cual (relativa)
        res.json({
            success: true,
            factura
        });
    } catch (error) {
        console.error('Error al obtener factura:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la factura'
        });
    }
};

// Crear nueva factura (con imagen)
const createFactura = async (req, res) => {
    try {
        const {
            numero_factura,
            fecha_emision,
            proveedor_id,
            programa_id,
            subtotal,
            iva_total,
            estado,
            observaciones
        } = req.body;
        
        if (!numero_factura || !fecha_emision || !proveedor_id || !subtotal || !iva_total) {
            return res.status(400).json({
                success: false,
                message: 'Faltan datos obligatorios'
            });
        }
        
        const programaId = Number.isInteger(parseInt(programa_id, 10)) ? parseInt(programa_id, 10) : null;
        const proveedorId = Number.isInteger(parseInt(proveedor_id, 10)) ? parseInt(proveedor_id, 10) : null;
        const subtotalValue = parseFloat(subtotal);
        const ivaValue = parseFloat(iva_total);
        
        let imagen_url = null;
        if (req.file) {
            imagen_url = `/uploads/facturas/${req.file.filename}`;
        }
        
        const facturaId = await FacturaModel.create({
            numero_factura,
            fecha_emision,
            proveedor_id: proveedorId,
            programa_id: programaId,
            subtotal: subtotalValue,
            iva_total: ivaValue,
            estado: estado || 'Pendiente',
            usuario_registro_id: req.userId,
            observaciones: observaciones || null
        }, imagen_url);

        let detalles = [];
        if (req.body.detalles) {
            try {
                detalles = JSON.parse(req.body.detalles);
            } catch (parseError) {
                return res.status(400).json({
                    success: false,
                    message: 'Detalles de factura inválidos'
                });
            }
        }

        if (Array.isArray(detalles) && detalles.length > 0) {
            const validDetalles = detalles.map(d => ({
                equipo_id: parseInt(d.equipo_id, 10),
                cantidad: parseInt(d.cantidad, 10),
                precio_unitario: parseFloat(d.precio_unitario)
            })).filter(d => d.equipo_id > 0 && d.cantidad > 0 && d.precio_unitario >= 0);
            await FacturaModel.createDetails(facturaId, validDetalles);
        }
        
        res.status(201).json({
            success: true,
            message: 'Factura creada exitosamente',
            facturaId
        });
    } catch (error) {
        console.error('Error al crear factura:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear la factura'
        });
    }
};

// Actualizar factura
const updateFactura = async (req, res) => {
    try {
        const { id } = req.params;
        const facturaExistente = await FacturaModel.findById(id);
        if (!facturaExistente) {
            return res.status(404).json({
                success: false,
                message: 'Factura no encontrada'
            });
        }
        
        const {
            numero_factura,
            fecha_emision,
            proveedor_id,
            programa_id,
            subtotal,
            iva_total,
            estado,
            observaciones
        } = req.body;
        
        const programaId = Number.isInteger(parseInt(programa_id, 10)) ? parseInt(programa_id, 10) : null;
        const proveedorId = Number.isInteger(parseInt(proveedor_id, 10)) ? parseInt(proveedor_id, 10) : null;
        const subtotalValue = parseFloat(subtotal);
        const ivaValue = parseFloat(iva_total);
        
        let imagen_url = facturaExistente.imagen_url || facturaExistente.archivo_url;
        
        if (req.file) {
            const oldFilePath = facturaExistente.imagen_url || facturaExistente.archivo_url;
            if (oldFilePath) {
                const oldPath = path.join(__dirname, '../../', oldFilePath);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            imagen_url = `/uploads/facturas/${req.file.filename}`;
        }
        
        const updated = await FacturaModel.update(id, {
            numero_factura,
            fecha_emision,
            proveedor_id: proveedorId,
            programa_id: programaId,
            subtotal: subtotalValue,
            iva_total: ivaValue,
            estado,
            observaciones: observaciones || null
        }, imagen_url);

        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo actualizar la factura'
            });
        }

        let detalles = [];
        if (req.body.detalles) {
            try {
                detalles = JSON.parse(req.body.detalles);
            } catch (parseError) {
                return res.status(400).json({
                    success: false,
                    message: 'Detalles de factura inválidos'
                });
            }
        }

        if (Array.isArray(detalles)) {
            const validDetalles = detalles.map(d => ({
                equipo_id: parseInt(d.equipo_id, 10),
                cantidad: parseInt(d.cantidad, 10),
                precio_unitario: parseFloat(d.precio_unitario)
            })).filter(d => d.equipo_id > 0 && d.cantidad > 0 && d.precio_unitario >= 0);
            await FacturaModel.replaceDetails(id, validDetalles);
        }
        
        res.json({
            success: true,
            message: 'Factura actualizada exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar factura:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar la factura'
        });
    }
};

// Eliminar factura
const deleteFactura = async (req, res) => {
    try {
        const { id } = req.params;
        const factura = await FacturaModel.findById(id);
        
        if (!factura) {
            return res.status(404).json({
                success: false,
                message: 'Factura no encontrada'
            });
        }
        
        const imagePath = factura.imagen_url || factura.archivo_url;
        if (imagePath) {
            const imageFullPath = path.join(__dirname, '../../', imagePath);
            if (fs.existsSync(imageFullPath)) {
                fs.unlinkSync(imageFullPath);
            }
        }
        
        const deleted = await FacturaModel.delete(id);
        
        if (!deleted) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo eliminar la factura'
            });
        }
        
        res.json({
            success: true,
            message: 'Factura eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar factura:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar la factura'
        });
    }
};

// Obtener estadísticas
const getFacturasStats = async (req, res) => {
    try {
        const stats = await FacturaModel.getStats();
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
    getFacturas,
    getFacturaById,
    createFactura,
    updateFactura,
    deleteFactura,
    getFacturasStats
};