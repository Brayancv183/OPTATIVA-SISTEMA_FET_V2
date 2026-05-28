const express = require('express');
const { body } = require('express-validator');
const {
    getFacturas,
    getFacturaById,
    createFactura,
    updateFactura,
    deleteFactura,
    getFacturasStats
} = require('../controllers/facturas.controller');
const { authMiddleware, checkRole } = require('../middleware/auth.middleware');
const { validateFields } = require('../middleware/validation.middleware');
const upload = require('../config/multer');

const router = express.Router();

// Validaciones
const facturaValidations = [
    body('numero_factura').notEmpty().withMessage('Número de factura requerido'),
    body('fecha_emision').isDate().withMessage('Fecha de emisión válida requerida'),
    body('proveedor_id').isInt().withMessage('Proveedor válido requerido'),
    body('subtotal').isFloat({ min: 0 }).withMessage('Subtotal debe ser mayor o igual a 0'),
    body('iva_total').isFloat({ min: 0 }).withMessage('IVA total debe ser mayor o igual a 0'),
    validateFields
];

router.use(authMiddleware);

router.get('/stats', getFacturasStats);
router.get('/', getFacturas);
router.get('/:id', getFacturaById);
// Run multer before validations so multipart form fields are available to express-validator
router.post('/', checkRole('admin', 'coordinador'), upload.single('imagen'), facturaValidations, createFactura);
router.put('/:id', checkRole('admin', 'coordinador'), upload.single('imagen'), facturaValidations, updateFactura);
router.delete('/:id', checkRole('admin'), deleteFactura);

module.exports = router;