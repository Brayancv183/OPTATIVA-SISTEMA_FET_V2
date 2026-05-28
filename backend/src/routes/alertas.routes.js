const express = require('express');
const {
    getAlertas,
    getAlertasStats,
    attendAlerta
} = require('../controllers/alertas.controller');
const { authMiddleware, checkRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/stats', getAlertasStats);
router.get('/', getAlertas);
router.put('/:id/attend', checkRole('admin', 'coordinador', 'almacenista'), attendAlerta);

module.exports = router;