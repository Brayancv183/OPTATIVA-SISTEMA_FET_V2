const express = require('express');
const { body } = require('express-validator');
const {
    getProveedores,
    getProveedorById,
    createProveedor,
    updateProveedor,
    deleteProveedor,
    getProveedoresStats
} = require('../controllers/proveedores.controller');
const { authMiddleware, checkRole } = require('../middleware/auth.middleware');
const { validateFields } = require('../middleware/validation.middleware');

const router = express.Router();

// Validaciones
const proveedorValidations = [
    body('nombre').notEmpty().withMessage('El nombre es requerido'),
    validateFields
];

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas públicas (para usuarios autenticados)
router.get('/', getProveedores);
router.get('/stats', getProveedoresStats);
router.get('/:id', getProveedorById);

// Rutas solo para admin y coordinador
router.post('/', checkRole('admin', 'coordinador'), proveedorValidations, createProveedor);
router.put('/:id', checkRole('admin', 'coordinador'), proveedorValidations, updateProveedor);
router.delete('/:id', checkRole('admin'), deleteProveedor);

module.exports = router;