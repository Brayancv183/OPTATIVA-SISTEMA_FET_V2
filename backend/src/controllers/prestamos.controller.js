const PrestamoModel = require('../models/prestamos.model');
const EquipoModel = require('../models/equipo.model');
const MovimientoModel = require('../models/movimiento.model');

// Obtener lista de préstamos
const getPrestamos = async (req, res) => {
    try {
        const { search, estado, page = 1, limit = 10 } = req.query;
        const filters = { search, estado };
        
        const prestamos = await PrestamoModel.findAll(filters, parseInt(page), parseInt(limit));
        const total = await PrestamoModel.count(filters);
        
        res.json({
            success: true,
            prestamos,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error al obtener préstamos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los préstamos'
        });
    }
};

// Obtener préstamo por ID
const getPrestamoById = async (req, res) => {
    try {
        const { id } = req.params;
        const prestamo = await PrestamoModel.findById(id);
        
        if (!prestamo) {
            return res.status(404).json({
                success: false,
                message: 'Préstamo no encontrado'
            });
        }
        
        res.json({
            success: true,
            prestamo
        });
    } catch (error) {
        console.error('Error al obtener préstamo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el préstamo'
        });
    }
};

// Crear nuevo préstamo
const createPrestamo = async (req, res) => {
    try {
        const {
            equipo_id,
            solicitante_nombre,
            solicitante_identificacion,
            solicitante_email,
            fecha_prestamo,
            fecha_devolucion_esperada,
            condicion_entrega
        } = req.body;
        const usuario_id = req.userId;

        // Validaciones
        if (!equipo_id || !solicitante_nombre || !fecha_prestamo || !fecha_devolucion_esperada) {
            return res.status(400).json({
                success: false,
                message: 'Faltan datos obligatorios'
            });
        }

        // Verificar equipo y stock
        const equipo = await EquipoModel.findById(equipo_id);
        if (!equipo) {
            return res.status(404).json({
                success: false,
                message: 'Equipo no encontrado'
            });
        }

        if (equipo.stock_actual < 1) {
            return res.status(400).json({
                success: false,
                message: 'No hay stock disponible para préstamo'
            });
        }

        // Crear el préstamo
        const prestamoId = await PrestamoModel.create({
            equipo_id,
            solicitante_nombre,
            solicitante_identificacion,
            solicitante_email,
            fecha_prestamo,
            fecha_devolucion_esperada,
            condicion_entrega,
            usuario_prestamista_id: usuario_id
        });

        // Actualizar stock (salida)
        await EquipoModel.updateStock(equipo_id, 1, 'Salida');

        // Registrar movimiento de salida
        await MovimientoModel.create({
            tipo: 'Salida',
            equipo_id,
            cantidad: 1,
            valor_unitario_momento: equipo.valor_unitario,
            usuario_id,
            origen_destino: `Préstamo a ${solicitante_nombre}`,
            prestamo_id: prestamoId,
            estado: 'Completada'
        });

        res.status(201).json({
            success: true,
            message: 'Préstamo registrado exitosamente',
            prestamoId
        });
    } catch (error) {
        console.error('Error al crear préstamo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar el préstamo'
        });
    }
};

// Registrar devolución
const returnPrestamo = async (req, res) => {
    try {
        const { id } = req.params;
        const { condicion_recibido } = req.body;

        const prestamo = await PrestamoModel.findById(id);
        if (!prestamo) {
            return res.status(404).json({
                success: false,
                message: 'Préstamo no encontrado'
            });
        }

        if (prestamo.estado === 'Devuelto') {
            return res.status(400).json({
                success: false,
                message: 'Este préstamo ya fue devuelto'
            });
        }

        // Registrar devolución
        const fecha_devolucion_real = new Date().toISOString().slice(0, 10);
        const updated = await PrestamoModel.returnLoan(id, fecha_devolucion_real, condicion_recibido);

        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo registrar la devolución'
            });
        }

        // Devolver stock al inventario
        await EquipoModel.updateStock(prestamo.equipo_id, 1, 'Entrada');

        // Registrar movimiento de entrada
        await MovimientoModel.create({
            tipo: 'Entrada',
            equipo_id: prestamo.equipo_id,
            cantidad: 1,
            valor_unitario_momento: prestamo.valor_unitario,
            usuario_id: req.userId,
            origen_destino: `Devolución de préstamo de ${prestamo.solicitante_nombre}`,
            prestamo_id: id,
            estado: 'Completada'
        });

        res.json({
            success: true,
            message: 'Devolución registrada exitosamente'
        });
    } catch (error) {
        console.error('Error al registrar devolución:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar la devolución'
        });
    }
};

// Obtener estadísticas
const getPrestamosStats = async (req, res) => {
    try {
        const stats = await PrestamoModel.getStats();
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
    getPrestamos,
    getPrestamoById,
    createPrestamo,
    returnPrestamo,
    getPrestamosStats
};