const express = require('express');
const { body } = require('express-validator');
const { login, getProfile, updateProfile, changePassword, uploadAvatar } = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { validateFields } = require('../middleware/validation.middleware');
const upload = require('../config/multer');
const router = express.Router();

// Validaciones para login
const loginValidations = [
    body('email').isEmail().withMessage('Correo electrónico inválido'),
    body('password').notEmpty().withMessage('La contraseña es requerida'),
    validateFields
];

// Validaciones para cambio de contraseña
const passwordValidations = [
    body('currentPassword').notEmpty().withMessage('La contraseña actual es requerida'),
    body('newPassword').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
    validateFields
];

// Rutas públicas
router.post('/login', loginValidations, login);

// Rutas protegidas
router.get('/perfil', authMiddleware, getProfile);
router.put('/perfil', authMiddleware, updateProfile);
router.put('/cambiar-password', authMiddleware, passwordValidations, changePassword);
router.post('/avatar', authMiddleware, upload.single('avatar'), uploadAvatar);
module.exports = router;