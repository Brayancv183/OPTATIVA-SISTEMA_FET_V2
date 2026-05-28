const express = require('express');
const { getDashboardData } = require('../controllers/dashboard.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', authMiddleware, getDashboardData);

module.exports = router;