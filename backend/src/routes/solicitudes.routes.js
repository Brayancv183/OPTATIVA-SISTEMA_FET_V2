const express = require('express');
const { body } = require('express-validator');
const {
    getSolicitudes,
    getSolicitudById,
    createSolicitud,
    approveSolicitud,
    rejectSolicitud,
    getSolicitudesStats
} = require('../controllers/solicitudes.controller');
const { authMiddleware, checkRole } = require('../middleware/auth.middleware');
const { validateFields } = require('../middleware/validation.middleware');

const router = express.Router();

// Validaciones
const solicitudValidations = [
    body('solicitante_nombre').notEmpty().withMessage('Nombre del solicitante requerido'),
    body('detalles').isArray({ min: 1 }).withMessage('Debe incluir al menos un equipo'),
    validateFields
];

router.use(authMiddleware);

// Rutas más específicas PRIMERO
router.get('/stats', getSolicitudesStats);
router.get('/', getSolicitudes);
router.get('/:id', getSolicitudById);
router.post('/', checkRole('admin', 'coordinador', 'almacenista'), solicitudValidations, createSolicitud);
router.put('/:id/approve', checkRole('admin', 'coordinador'), approveSolicitud);
router.put('/:id/reject', checkRole('admin', 'coordinador'), rejectSolicitud);

module.exports = router;