const express = require('express');
const { body } = require('express-validator');
const {
    getPrestamos,
    createPrestamo,
    returnPrestamo,
    getPrestamosStats,
    getPrestamoById
} = require('../controllers/prestamos.controller');
const { authMiddleware, checkRole } = require('../middleware/auth.middleware');
const { validateFields } = require('../middleware/validation.middleware');

const router = express.Router();

const prestamoValidations = [
    body('equipo_id').isInt().withMessage('ID de equipo válido'),
    body('solicitante_nombre').notEmpty().withMessage('Nombre del solicitante requerido'),
    body('fecha_prestamo').isDate().withMessage('Fecha de préstamo válida'),
    body('fecha_devolucion_esperada').isDate().withMessage('Fecha de devolución esperada válida'),
    validateFields
];

router.use(authMiddleware);

router.get('/stats', getPrestamosStats);
router.get('/', getPrestamos);
router.post('/', checkRole('admin', 'coordinador'), prestamoValidations, createPrestamo);
router.get('/:id', getPrestamoById);
router.put('/:id/devolver', checkRole('admin', 'coordinador'), returnPrestamo);

module.exports = router;