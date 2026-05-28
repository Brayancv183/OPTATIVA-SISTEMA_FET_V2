const express = require('express');
const { body } = require('express-validator');
const {
    getMovimientos,
    getMovimientoById,
    registrarEntrada,
    registrarSalida,
    getMovimientosStats,
    getRecentMovements
} = require('../controllers/movimientos.controller');
const { authMiddleware, checkRole } = require('../middleware/auth.middleware');
const { validateFields } = require('../middleware/validation.middleware');

const router = express.Router();

// Validaciones para movimientos
const movimientoValidations = [
    body('equipo_id').isInt().withMessage('El ID del equipo es requerido'),
    body('cantidad').isInt({ min: 1 }).withMessage('La cantidad debe ser mayor a 0'),
    validateFields
];

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas públicas (para usuarios autenticados)
router.get('/', getMovimientos);
router.get('/stats', getMovimientosStats);
router.get('/recientes', getRecentMovements);
router.get('/:id', getMovimientoById);

// Rutas solo para admin y coordinador
router.post('/entrada', checkRole('admin', 'coordinador'), movimientoValidations, registrarEntrada);
router.post('/salida', checkRole('admin', 'coordinador'), movimientoValidations, registrarSalida);

module.exports = router;
