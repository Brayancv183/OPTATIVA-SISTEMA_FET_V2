const jwt = require('jsonwebtoken');
const UsuarioModel = require('../models/usuario.model');

const authMiddleware = async (req, res, next) => {
    try {
        // Obtener token del header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Acceso denegado. No se proporcionó token.' 
            });
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Buscar usuario
        const user = await UsuarioModel.findById(decoded.id);
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token inválido. Usuario no encontrado.' 
            });
        }

        // Adjuntar usuario al request
        req.user = user;
        req.userId = decoded.id;
        
        next();
    } catch (error) {
        console.error('Error en auth middleware:', error.message);
        res.status(401).json({ 
            success: false, 
            message: 'Token inválido o expirado.' 
        });
    }
};

// Middleware para verificar roles
const checkRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'No autenticado.' 
            });
        }
        
        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permisos para acceder a este recurso.' 
            });
        }
        
        next();
    };
};

module.exports = { authMiddleware, checkRole };