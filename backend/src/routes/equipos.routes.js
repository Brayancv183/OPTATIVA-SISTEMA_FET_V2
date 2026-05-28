const express = require('express');
const { body } = require('express-validator');
const {
    getEquipos,
    getEquipoById,
    createEquipo,
    updateEquipo,
    deleteEquipo,
    getLowStockEquipos
} = require('../controllers/equipos.controller');
const { authMiddleware, checkRole } = require('../middleware/auth.middleware');
const { validateFields } = require('../middleware/validation.middleware');

const router = express.Router();

// Validaciones
const equipoValidations = [
    body('codigo').notEmpty().withMessage('Código es requerido'),
    body('nombre').notEmpty().withMessage('Nombre es requerido'),
    body('categoria').notEmpty().withMessage('Categoría es requerida'),
    body('stock_actual').isInt({ min: 0 }).withMessage('Stock actual debe ser un número entero igual o mayor a 0'),
    body('stock_minimo').isInt({ min: 0 }).withMessage('Stock mínimo debe ser un número entero igual o mayor a 0'),
    body('valor_unitario').isFloat({ min: 0 }).withMessage('Valor unitario debe ser un número válido igual o mayor a 0'),
    validateFields
];

router.use(authMiddleware);

// Rutas más específicas PRIMERO
router.get('/bajo-stock', getLowStockEquipos);
router.get('/', getEquipos);
router.post('/', checkRole('admin', 'coordinador'), equipoValidations, createEquipo);
router.get('/:id', getEquipoById);
router.put('/:id', checkRole('admin', 'coordinador'), updateEquipo);
router.delete('/:id', checkRole('admin'), deleteEquipo);

module.exports = router;