const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UsuarioModel = require('../models/usuario.model');
const path = require('path');
const fs = require('fs');

const login = async (req, res) => {
    console.log('\n========================================');
    console.log('🔐 NUEVA SOLICITUD DE LOGIN');
    console.log('========================================');
    console.log('📧 Email recibido:', req.body.email);
    console.log('🔑 Password recibido:', req.body.password ? '***' : 'VACIO');
    
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Correo y contraseña son requeridos' });
        }
        const user = await UsuarioModel.findByEmail(email);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas - Usuario no existe' });
        }
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas - Contraseña incorrecta' });
        }
        await UsuarioModel.updateLastLogin(user.id);
        const token = jwt.sign(
            { id: user.id, email: user.email, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
        const { password_hash, ...userWithoutPassword } = user;
        res.json({ success: true, message: 'Login exitoso', token, user: userWithoutPassword });
    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor: ' + error.message });
    }
};

const getProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const profile = await UsuarioModel.getProfileStats(userId);
        if (!profile) return res.status(404).json({ success: false, message: 'Perfil no encontrado' });
        res.json({ success: true, usuario: profile });
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const { nombre, telefono, area_departamento } = req.body;
        const updated = await UsuarioModel.updateProfile(userId, { nombre, telefono, area_departamento });
        if (!updated) return res.status(404).json({ success: false, message: 'No se pudo actualizar el perfil' });
        res.json({ success: true, message: 'Perfil actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const changePassword = async (req, res) => {
    try {
        const userId = req.userId;
        const { currentPassword, newPassword } = req.body;
        const user = await UsuarioModel.findByEmail(req.user.email);
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) return res.status(401).json({ success: false, message: 'Contraseña actual incorrecta' });
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);
        const updated = await UsuarioModel.updatePassword(userId, newPasswordHash);
        if (!updated) return res.status(500).json({ success: false, message: 'No se pudo cambiar la contraseña' });
        res.json({ success: true, message: 'Contraseña cambiada exitosamente' });
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No se envió ningún archivo' });
        // La URL debe ser relativa al static
        const avatar_url = `/uploads/avatars/${req.file.filename}`;
        const updated = await UsuarioModel.updateAvatar(req.userId, avatar_url);
        if (!updated) return res.status(500).json({ success: false, message: 'Error al guardar avatar' });
        res.json({ success: true, message: 'Avatar actualizado', avatar_url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};
module.exports = { login, getProfile, updateProfile, changePassword, uploadAvatar };