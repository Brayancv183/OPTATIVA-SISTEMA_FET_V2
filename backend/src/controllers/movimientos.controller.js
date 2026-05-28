const MovimientoModel = require('../models/movimiento.model');
const EquipoModel = require('../models/equipo.model');
const AlertaModel = require('../models/alerta.model');

// Obtener todos los movimientos
const getMovimientos = async (req, res) => {
    try {
        const { search, tipo, estado, periodo } = req.query;
        const movimientos = await MovimientoModel.findAll({ search, tipo, estado, periodo });
        
        res.json({
            success: true,
            movimientos
        });
    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los movimientos'
        });
    }
};

// Obtener un movimiento por ID
const getMovimientoById = async (req, res) => {
    try {
        const { id } = req.params;
        const movimiento = await MovimientoModel.findById(id);

        if (!movimiento) {
            return res.status(404).json({
                success: false,
                message: 'Movimiento no encontrado'
            });
        }

        res.json({
            success: true,
            movimiento
        });
    } catch (error) {
        console.error('Error al obtener movimiento:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el movimiento'
        });
    }
};

// Registrar una entrada (compra, devolución, etc.)
const registrarEntrada = async (req, res) => {
    try {
        const { equipo_id, cantidad, valor_unitario, origen_destino, notas } = req.body;
        const usuario_id = req.userId;

        // Validaciones
        if (!equipo_id || !cantidad || cantidad <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos: equipo y cantidad son requeridos'
            });
        }

        // Verificar que el equipo existe
        const equipo = await EquipoModel.findById(equipo_id);
        if (!equipo) {
            return res.status(404).json({
                success: false,
                message: 'Equipo no encontrado'
            });
        }

        // Usar el valor unitario proporcionado o el del equipo
        const valorUnitario = valor_unitario || equipo.valor_unitario;

        // Crear movimiento
        const movimientoId = await MovimientoModel.create({
            tipo: 'Entrada',
            equipo_id,
            cantidad: Math.abs(cantidad),
            valor_unitario_momento: valorUnitario,
            usuario_id,
            origen_destino: origen_destino || 'Entrada manual',
            estado: 'Completada',
            notas
        });

        // Actualizar stock del equipo
        await EquipoModel.updateStock(equipo_id, cantidad, 'Entrada');

        // Verificar si se debe crear/actualizar alerta
        const equipoActualizado = await EquipoModel.findById(equipo_id);
        if (equipoActualizado.stock_actual <= equipoActualizado.stock_minimo) {
            await AlertaModel.createOrUpdate(equipo_id);
        } else {
            await AlertaModel.resolveByEquipo(equipo_id);
        }

        res.status(201).json({
            success: true,
            message: 'Entrada registrada exitosamente',
            movimientoId
        });
    } catch (error) {
        console.error('Error al registrar entrada:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar la entrada'
        });
    }
};

// Registrar una salida (préstamo, baja, etc.)
const registrarSalida = async (req, res) => {
    try {
        const { equipo_id, cantidad, valor_unitario, origen_destino, notas } = req.body;
        const usuario_id = req.userId;

        // Validaciones
        if (!equipo_id || !cantidad || cantidad <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos: equipo y cantidad son requeridos'
            });
        }

        // Verificar que el equipo existe
        const equipo = await EquipoModel.findById(equipo_id);
        if (!equipo) {
            return res.status(404).json({
                success: false,
                message: 'Equipo no encontrado'
            });
        }

        // Verificar stock suficiente
        if (equipo.stock_actual < cantidad) {
            return res.status(400).json({
                success: false,
                message: `Stock insuficiente. Disponible: ${equipo.stock_actual}`
            });
        }

        const valorUnitario = valor_unitario || equipo.valor_unitario;

        // Crear movimiento
        const movimientoId = await MovimientoModel.create({
            tipo: 'Salida',
            equipo_id,
            cantidad: Math.abs(cantidad),
            valor_unitario_momento: valorUnitario,
            usuario_id,
            origen_destino: origen_destino || 'Salida manual',
            estado: 'Completada',
            notas
        });

        // Actualizar stock del equipo
        await EquipoModel.updateStock(equipo_id, cantidad, 'Salida');

        // Verificar alerta de stock bajo
        const equipoActualizado = await EquipoModel.findById(equipo_id);
        if (equipoActualizado.stock_actual <= equipoActualizado.stock_minimo) {
            await AlertaModel.createOrUpdate(equipo_id);
        }

        res.status(201).json({
            success: true,
            message: 'Salida registrada exitosamente',
            movimientoId
        });
    } catch (error) {
        console.error('Error al registrar salida:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar la salida'
        });
    }
};

// Obtener estadísticas
const getMovimientosStats = async (req, res) => {
    try {
        const stats = await MovimientoModel.getStats();
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

// Obtener movimientos recientes (para dashboard)
const getRecentMovements = async (req, res) => {
    try {
        const limit = req.query.limit || 10;
        const movimientos = await MovimientoModel.getRecentMovements(limit);
        res.json({
            success: true,
            movimientos
        });
    } catch (error) {
        console.error('Error al obtener movimientos recientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener movimientos recientes'
        });
    }
};

module.exports = {
    getMovimientos,
    getMovimientoById,
    registrarEntrada,
    registrarSalida,
    getMovimientosStats,
    getRecentMovements
};